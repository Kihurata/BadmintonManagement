import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingForm } from '@/components/booking/booking-form';
import { BookingDetails } from '@/components/booking/booking-details';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnThis(),
        rpc: jest.fn()
    }
}));

describe('Bookings Feature', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.alert = jest.fn();
        window.confirm = jest.fn();

        // Reset the default chain returns for globally modified base functions
        (supabase as unknown as { select: jest.Mock }).select.mockReturnThis();
        (supabase as unknown as { eq: jest.Mock }).eq.mockReturnThis();
    });

    describe('BookingForm', () => {
        it('should render form and fetch initial data', async () => {
            const mockCourts = [{ id: 'court_1', court_name: 'Sân 1' }];
            const mockCustomers = [{ id: 'cust_1', name: 'John Doe', phone: '123' }];

            // Setup mock responses for fetch with Once to prevent leaking
            const selectMock = (supabase as unknown as { select: jest.Mock }).select;
            selectMock
                .mockImplementationOnce(() => ({ eq: jest.fn().mockResolvedValue({ data: mockCourts }) }))
                .mockImplementationOnce(() => ({ order: jest.fn().mockResolvedValue({ data: mockCustomers }) }));

            render(<BookingForm onSuccess={jest.fn()} onCancel={jest.fn()} />);

            await waitFor(() => {
                expect(screen.getByText('Đặt Sân Mới')).toBeInTheDocument();
            });
        });

        it('should validate missing required fields on submit', async () => {
            render(<BookingForm onSuccess={jest.fn()} onCancel={jest.fn()} courts={[]} />);

            fireEvent.click(screen.getByRole('button', { name: /Đặt sân/i }));

            expect(screen.getByText('Vui lòng điền đầy đủ thông tin')).toBeInTheDocument();
        });
    });

    describe('BookingDetails', () => {
        beforeEach(() => {
            const eqMock = (supabase as unknown as { eq: jest.Mock }).eq;
            eqMock.mockImplementation((column) => {
                if (column === 'invoice_id') return Promise.resolve({ data: [] });
                return supabase;
            });
        });

        it('should fetch and display booking details', async () => {
            const mockBooking = {
                id: 'booking_1',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                status: 'CONFIRMED',
                customers: { name: 'Alice', phone: '999', type: 'LOYAL' },
                courts: { court_name: 'Sân VIP' }
            };

            const supabaseMock = supabase as unknown as { single: jest.Mock, maybeSingle: jest.Mock, order: jest.Mock };

            // Mock booking fetch
            supabaseMock.single.mockResolvedValueOnce({ data: mockBooking });
            // Mock invoice fetch (no invoice yet)
            supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null });
            // Mock products fetch
            supabaseMock.order.mockResolvedValueOnce({ data: [] });

            render(
                <Dialog open={true}>
                    <DialogContent>
                        <BookingDetails bookingId="booking_1" onClose={jest.fn()} onCheckInSuccess={jest.fn()} />
                    </DialogContent>
                </Dialog>
            );

            await waitFor(() => {
                expect(screen.getByText('Sân VIP')).toBeInTheDocument();
                expect(screen.getByText('Alice')).toBeInTheDocument();
                expect(screen.getByText('ĐÃ ĐẶT LỊCH')).toBeInTheDocument();
            });
        });

        it('should handle Check-In flow successfully via RPC', async () => {
            const mockBooking = {
                id: 'booking_1',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                status: 'CONFIRMED',
                customer_id: 'cust_1',
                courts: { base_price: 100000 }
            };
            const onCheckInSuccessMock = jest.fn();

            const supabaseMock = supabase as unknown as { single: jest.Mock, maybeSingle: jest.Mock, order: jest.Mock, rpc: jest.Mock };
            supabaseMock.single.mockResolvedValueOnce({ data: mockBooking });
            supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null });
            supabaseMock.order.mockResolvedValueOnce({ data: [] });

            supabaseMock.rpc.mockResolvedValueOnce({ data: { success: true } });

            // Second time maybeSingle is called internally in refreshInvoice
            supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null });

            render(
                <Dialog open={true}>
                    <DialogContent>
                        <BookingDetails bookingId="booking_1" onClose={jest.fn()} onCheckInSuccess={onCheckInSuccessMock} />
                    </DialogContent>
                </Dialog>
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Check In/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Check In/i }));

            await waitFor(() => {
                expect(supabaseMock.rpc).toHaveBeenCalledWith('check_in_booking', expect.objectContaining({
                    p_booking_id: 'booking_1',
                    p_customer_id: 'cust_1'
                }));
                expect(onCheckInSuccessMock).toHaveBeenCalled();
            });
        });

        it('should carefully check total and court fee updates when adding a product to invoice', async () => {
            const mockBooking = {
                id: 'booking_2',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                status: 'CHECKED_IN'
            };

            const mockInvoice = {
                id: 'inv_1',
                booking_id: 'booking_2',
                total_amount: 150000 // Court fee + previous items
            };

            const mockProducts = [
                { id: 'prod_1', product_name: 'Nước suối', base_unit: 'Chai', unit_price: 15000, stock_quantity: 100, is_packable: false }
            ];

            const supabaseMock = supabase as unknown as { single: jest.Mock, maybeSingle: jest.Mock, order: jest.Mock, insert: jest.Mock, update: jest.Mock };

            // 1. Fetch Booking
            supabaseMock.single.mockResolvedValueOnce({ data: mockBooking });
            // 2. Fetch Invoice
            supabaseMock.maybeSingle.mockResolvedValueOnce({ data: mockInvoice });
            // 3. Fetch Invoice Items (handled by beforeEach mock)
            // 4. Fetch Products
            supabaseMock.order.mockResolvedValueOnce({ data: mockProducts });

            render(
                <Dialog open={true}>
                    <DialogContent>
                        <BookingDetails bookingId="booking_2" onClose={jest.fn()} onCheckInSuccess={jest.fn()} />
                    </DialogContent>
                </Dialog>
            );

            await waitFor(() => {
                // Ensure the product exists
                expect(screen.getByText('Nước suối')).toBeInTheDocument();
            });

            // Need to mock the insert invoice_item & update invoice total 
            supabaseMock.insert.mockResolvedValueOnce({ error: null });
            supabaseMock.update.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ error: null }) });

            // Mock refreshInvoice reload
            supabaseMock.maybeSingle.mockResolvedValueOnce({ data: { ...mockInvoice, total_amount: 165000 } });
            (supabase as unknown as { eq: jest.Mock }).eq.mockImplementationOnce((col) => {
                if (col === 'invoice_id') return Promise.resolve({ data: [{ id: 'item_1', product_id: 'prod_1', sale_price: 15000, quantity: 1, products: { product_name: 'Nước suối' } }] });
                return supabase;
            });

            const addButton = screen.getByRole('button', { name: /Thêm/i });
            fireEvent.click(addButton);

            await waitFor(() => {
                // 1. Check if invoice item is inserted properly
                expect(supabaseMock.insert).toHaveBeenCalledWith(expect.arrayContaining([
                    expect.objectContaining({
                        invoice_id: 'inv_1',
                        product_id: 'prod_1',
                        sale_price: 15000,
                        quantity: 1
                    })
                ]));

                // 2. Carefully check that total_amount is correctly added upon product insert
                expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
                    total_amount: 165000 // 150000 + 15000
                }));
            });
        });
    });
});
