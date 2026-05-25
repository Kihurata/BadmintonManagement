import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoicesPage from '@/app/invoices/page';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TransactionHistory } from '@/components/invoices/transaction-history';
import { supabase } from '@/lib/supabase';

// 1. Mock External Dependencies
jest.mock('@/components/layout/sidebar', () => ({
    Sidebar: () => <div data-testid="sidebar">Sidebar Mock</div>
}));
jest.mock('@/components/layout/bottom-nav', () => ({
    BottomNav: () => <div data-testid="bottom-nav">BottomNav Mock</div>
}));
jest.mock('@/components/auth-provider', () => ({
    useUserRole: () => ({
        role: 'OWNER',
        loading: false,
        email: 'admin@example.com',
        tenantId: 'tenant-123',
        refreshRole: jest.fn()
    })
}));
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [] }),
    }
}));

global.fetch = jest.fn();

describe('Invoice Feature - Dual Mode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.alert = jest.fn();
        window.confirm = jest.fn();
    });

    describe('InvoicesPage Layout & Tab Logic', () => {
        it('should render ReceivablesLedger (Công Nợ) by default', async () => {
            render(<InvoicesPage />);
            expect(screen.getByText('Sổ Thu Chi')).toBeInTheDocument();

            // Wait for Ledger mock/render
            await waitFor(() => {
                // Since there is no data, the "Tuyệt vời!" empty state will show from ReceivablesLedger
                expect(screen.getByText('Không có khách hàng nào đang nợ.')).toBeInTheDocument();
            });
        });

        it('should toggle to TransactionHistory when tab is clicked', async () => {
            render(<InvoicesPage />);

            const historyTab = screen.getByText('Lịch Sử Giao Dịch');
            fireEvent.click(historyTab);

            await waitFor(() => {
                // "Từ ngày", "Đến ngày" inputs from TransactionHistory
                expect(screen.getAllByText('Từ ngày').length).toBeGreaterThan(0);
            });
        });

        it('should handle end of day closing successfully and check payload', async () => {
            (window.confirm as jest.Mock).mockReturnValue(true);
            const fetchMock = (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true, generated: 5 })
            });

            render(<InvoicesPage />);

            // Find mobile and desktop buttons, click the first one
            const closeDayButtons = screen.getAllByRole('button', { name: /Kết thúc ngày/i });
            fireEvent.click(closeDayButtons[0]);

            expect(window.confirm).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/api/invoices/auto-generate', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.any(String)
            }));

            // Validate payload specifically includes date payload
            const callArgs = fetchMock.mock.calls[0];
            const payload = JSON.parse(callArgs[1].body);
            expect(payload.date).toBeDefined();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Đã tạo thành công 5 hóa đơn.');
            });
        });
    });

    describe('SegmentedControl (Brutalist UI)', () => {
        it('should fire onChange event with correct active styling', () => {
            const handleChange = jest.fn();
            const tabs = [
                { id: 'T1', label: 'Tab 1' },
                { id: 'T2', label: 'Tab 2' }
            ];

            render(<SegmentedControl tabs={tabs} activeTab="T1" onChange={handleChange} />);

            const tab1 = screen.getByText('Tab 1');
            const tab2 = screen.getByText('Tab 2');

            // Check styling applied to active tab
            expect(tab1).toHaveClass('bg-white', 'text-slate-900');
            expect(tab2).toHaveClass('bg-transparent', 'text-slate-500');

            fireEvent.click(tab2);
            expect(handleChange).toHaveBeenCalledWith('T2');
        });
    });

    describe('TransactionHistory', () => {
        it('should fetch and display transactions within date range', async () => {
            const mockData = [
                {
                    id: 'inv_123',
                    total_amount: 150000,
                    created_at: new Date().toISOString(),
                    is_paid: true,
                    customers: { name: 'Nguyen Van A' },
                    bookings: {
                        courts: { court_name: 'Sân 1' },
                        start_time: new Date().toISOString(),
                        end_time: new Date(Date.now() + 3600000).toISOString() // 1 hour
                    }
                }
            ];

            (supabase as unknown as { order: jest.Mock }).order.mockResolvedValueOnce({ data: mockData });

            render(<TransactionHistory />);

            await waitFor(() => {
                expect(supabase.from).toHaveBeenCalledWith('invoices');
                // The transaction list should now have Nguyen Van A
                expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
                // Check if duration rendering (1.0 giờ) exists
                expect(screen.getByText((content) => content.includes('1.0 giờ'))).toBeInTheDocument();
            });
        });
    });
});
