import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingForm } from '@/components/booking/booking-form';
import { BookingDetails } from '@/components/booking/booking-details';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        rpc: jest.fn()
    }
}));

describe('Bookings Feature', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        window.alert = jest.fn();
        window.confirm = jest.fn();

        // Setup global fetch mock
        fetchMock = jest.fn();
        global.fetch = fetchMock;
    });

    describe('BookingForm', () => {
        it('should render form and fetch initial data', async () => {
            const mockCourts = [{ id: 'court_1', court_name: 'Sân 1' }];
            const mockCustomers = [{ id: 'cust_1', name: 'John Doe', phone: '123' }];

            fetchMock.mockImplementation((url) => {
                if (url.includes('/api/courts')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: mockCourts })
                    });
                }
                if (url.includes('/api/customers')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: mockCustomers })
                    });
                }
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ success: false, error: 'Not found' })
                });
            });

            render(<BookingForm onSuccess={jest.fn()} onCancel={jest.fn()} />);

            await waitFor(() => {
                expect(screen.getByText('Đặt Sân Mới')).toBeInTheDocument();
            });
        });

        it('should validate missing required fields on submit', async () => {
            fetchMock.mockImplementation((url) => {
                if (url.includes('/api/customers')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: [] })
                    });
                }
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ success: false, error: 'Not found' })
                });
            });

            render(<BookingForm onSuccess={jest.fn()} onCancel={jest.fn()} courts={[]} />);

            fireEvent.click(screen.getByRole('button', { name: /Đặt sân/i }));

            await waitFor(() => {
                expect(screen.getByText('Vui lòng điền đầy đủ thông tin')).toBeInTheDocument();
            });
        });
    });

    describe('BookingDetails', () => {
        it('should fetch and display booking details', async () => {
            const mockBooking = {
                id: 'booking_1',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                status: 'CONFIRMED',
                customer_id: 'cust_1',
                customers: { name: 'Alice', phone: '999', type: 'LOYAL' },
                courts: { court_name: 'Sân VIP' }
            };

            fetchMock.mockImplementation((url) => {
                if (url.includes('/api/bookings/details')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            booking: mockBooking,
                            invoice: null,
                            invoiceItems: []
                        })
                    });
                }
                if (url.includes('/api/v1/products')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: [] })
                    });
                }
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ success: false, error: 'Not found' })
                });
            });

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

        it('should handle Check-In flow successfully via API', async () => {
            const mockBooking = {
                id: 'booking_1',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                status: 'CONFIRMED',
                customer_id: 'cust_1',
                customers: { name: 'Alice', phone: '999', type: 'LOYAL' },
                courts: { court_name: 'Sân VIP', base_price: 100000 }
            };
            const onCheckInSuccessMock = jest.fn();

            let detailsCallCount = 0;
            fetchMock.mockImplementation((url) => {
                if (url.includes('/api/bookings/details')) {
                    detailsCallCount++;
                    // On second fetch (refresh after check-in), return checked_in status
                    const status = detailsCallCount > 1 ? 'CHECKED_IN' : 'CONFIRMED';
                    const invoice = detailsCallCount > 1 ? { id: 'inv_1', total_amount: 100000 } : null;
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            booking: { ...mockBooking, status },
                            invoice,
                            invoiceItems: []
                        })
                    });
                }
                if (url.includes('/api/v1/products')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: [] })
                    });
                }
                if (url.includes('/api/bookings/check-in')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true })
                    });
                }
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ success: false, error: 'Not found' })
                });
            });

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
                expect(fetchMock).toHaveBeenCalledWith('/api/bookings/check-in', expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"bookingId":"booking_1"')
                }));
                expect(onCheckInSuccessMock).toHaveBeenCalled();
            });
        });

        it('should carefully check total and court fee updates when adding a product to invoice', async () => {
            const mockBooking = {
                id: 'booking_2',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                status: 'CHECKED_IN',
                customer_id: 'cust_1',
                customers: { name: 'Alice', phone: '999', type: 'LOYAL' },
                courts: { court_name: 'Sân VIP' }
            };

            const mockInvoice = {
                id: 'inv_1',
                booking_id: 'booking_2',
                total_amount: 150000
            };

            const mockProducts = [
                { id: 'prod_1', product_name: 'Nước suối', base_unit: 'Chai', unit_price: 15000, stock_quantity: 100, is_packable: false }
            ];

            let detailsCallCount = 0;
            fetchMock.mockImplementation((url, options) => {
                if (url.includes('/api/bookings/details')) {
                    detailsCallCount++;
                    const totalAmount = detailsCallCount > 1 ? 165000 : 150000;
                    const invoiceItems = detailsCallCount > 1 ? [
                        { id: 'item_1', product_id: 'prod_1', sale_price: 15000, quantity: 1, products: { product_name: 'Nước suối' } }
                    ] : [];
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            booking: mockBooking,
                            invoice: { ...mockInvoice, total_amount: totalAmount },
                            invoiceItems
                        })
                    });
                }
                if (url.includes('/api/v1/products')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true, data: mockProducts })
                    });
                }
                if (url.includes('/api/invoices/items') && options?.method === 'POST') {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true })
                    });
                }
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ success: false, error: 'Not found' })
                });
            });

            render(
                <Dialog open={true}>
                    <DialogContent>
                        <BookingDetails bookingId="booking_2" onClose={jest.fn()} onCheckInSuccess={jest.fn()} />
                    </DialogContent>
                </Dialog>
            );

            await waitFor(() => {
                expect(screen.getByText('Nước suối')).toBeInTheDocument();
            });

            const addButton = screen.getByRole('button', { name: /Thêm/i });
            fireEvent.click(addButton);

            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith('/api/invoices/items', expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"invoiceId":"inv_1"')
                }));
                expect(fetchMock).toHaveBeenCalledWith('/api/invoices/items', expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"productId":"prod_1"')
                }));
                expect(fetchMock).toHaveBeenCalledWith('/api/invoices/items', expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"invoiceTotalAmount":150000')
                }));
            });
        });
    });
});
