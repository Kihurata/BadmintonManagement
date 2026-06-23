import { getBookingWithDetails, checkInBooking } from '@/server/repositories/booking-repo';
import { getInvoiceByBookingId } from '@/server/repositories/invoice-repo';
import { getAvailableProducts } from '@/server/repositories/product-repo';

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

describe('Server Repositories Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('booking-repo', () => {
    it('should call getBookingWithDetails correctly', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'booking_1' }, error: null });
      const booking = await getBookingWithDetails('booking_1');
      expect(mockSupabase.from).toHaveBeenCalledWith('bookings');
      expect(booking).toEqual({ id: 'booking_1' });
    });

    it('should call checkInBooking RPC', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
      const res = await checkInBooking('booking_1', 'customer_1', 50000);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_in_booking', {
        p_booking_id: 'booking_1',
        p_customer_id: 'customer_1',
        p_rental_fee: 50000,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('invoice-repo', () => {
    it('should call getInvoiceByBookingId correctly', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'invoice_1' }, error: null });
      const invoice = await getInvoiceByBookingId('booking_1');
      expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
      expect(invoice).toEqual({ id: 'invoice_1' });
    });
  });

  describe('product-repo', () => {
    it('should fetch available products', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: [{ id: 'p1' }], error: null });
      const products = await getAvailableProducts();
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(products).toEqual([{ id: 'p1' }]);
    });
  });
});
