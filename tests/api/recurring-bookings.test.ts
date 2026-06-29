import { POST, PUT, DELETE } from '@/app/api/v1/bookings/recurring/route';
import { verifyUserRole } from '@/lib/api-auth';
import { NextRequest } from 'next/server';
import {
  resolveGuestCustomerId,
  checkRecurringConflicts,
  createRecurringBookings,
  deleteRecurringBookings,
  updateRecurringBookings,
} from '@/server/repositories/booking-repo';

// Polyfill Response for JSDOM environment in Jest
if (typeof global.Response === 'undefined') {
  global.Response = class {
    status: number;
    headers: any;
    body: string;
    constructor(body: string, init?: any) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = init?.headers;
    }
    async json() {
      return JSON.parse(this.body);
    }
  } as any;
}

jest.mock('@/server/repositories/booking-repo', () => ({
  resolveGuestCustomerId: jest.fn(),
  checkRecurringConflicts: jest.fn(),
  createRecurringBookings: jest.fn(),
  deleteRecurringBookings: jest.fn(),
  updateRecurringBookings: jest.fn(),
}));

jest.mock('@/lib/api-auth', () => ({
  verifyUserRole: jest.fn(),
}));

// Valid v4 UUIDs for tests
const VALID_COURT_ID = '11111111-1111-4111-a111-111111111111';
const VALID_CUSTOMER_ID = '22222222-2222-4222-a222-222222222222';
const VALID_RULE_ID = '33333333-3333-4333-a333-333333333333';

describe('Recurring Bookings API Route Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/bookings/recurring', () => {
    it('should fail with 401 if unauthorized', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: false,
        errorResponse: new Response(
          JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
          { status: 401 }
        ),
      });

      const req = {
        url: 'http://localhost/api/v1/bookings/recurring',
        json: async () => ({}),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with 400 if validation fails (e.g. range > 3 months)', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: true,
        tenantId: 'tenant_123',
        role: 'OWNER',
      });

      const payload = {
        courtId: VALID_COURT_ID,
        customerId: VALID_CUSTOMER_ID,
        startTime: '08:00',
        endTime: '10:00',
        startDate: '2026-07-01',
        endDate: '2026-11-01', // 4 months
        daysOfWeek: [1, 3],
      };

      const req = {
        url: 'http://localhost/api/v1/bookings/recurring',
        json: async () => payload,
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Recurring bookings cannot exceed 3 months');
    });

    it('should return CONFLICT if scheduling conflicts exist', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: true,
        tenantId: 'tenant_123',
        role: 'OWNER',
      });

      (checkRecurringConflicts as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'conflicted_booking_1',
            start_time: '2026-07-06T01:30:00Z',
            end_time: '2026-07-06T02:30:00Z',
            customerName: 'Nguyễn Văn B',
          },
        ],
      });

      const payload = {
        courtId: VALID_COURT_ID,
        customerId: VALID_CUSTOMER_ID,
        startTime: '08:00',
        endTime: '10:00',
        startDate: '2026-07-01',
        endDate: '2026-07-15',
        daysOfWeek: [1], // Monday
      };

      const req = {
        url: 'http://localhost/api/v1/bookings/recurring',
        json: async () => payload,
      } as unknown as NextRequest;

      const res = await POST(req);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.conflicts.length).toBe(1);
    });

    it('should successfully create recurring bookings', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: true,
        tenantId: 'tenant_123',
        role: 'OWNER',
      });

      (checkRecurringConflicts as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      (createRecurringBookings as jest.Mock).mockResolvedValueOnce({
        success: true,
        ruleId: VALID_RULE_ID,
      });

      const payload = {
        courtId: VALID_COURT_ID,
        customerId: VALID_CUSTOMER_ID,
        startTime: '08:00',
        endTime: '10:00',
        startDate: '2026-07-01',
        endDate: '2026-07-15',
        daysOfWeek: [1], // Monday (July 6, July 13)
      };

      const req = {
        url: 'http://localhost/api/v1/bookings/recurring',
        json: async () => payload,
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.ruleId).toBe(VALID_RULE_ID);
      expect(body.data.bookingsCount).toBe(2);
    });
  });

  describe('PUT /api/v1/bookings/recurring', () => {
    it('should successfully update rule and propagate changes', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: true,
        tenantId: 'tenant_123',
        role: 'OWNER',
      });

      (updateRecurringBookings as jest.Mock).mockResolvedValueOnce({
        success: true,
        updatedBookingsCount: 2,
      });

      const payload = {
        ruleId: VALID_RULE_ID,
        customerId: VALID_CUSTOMER_ID,
        note: 'Updated notes',
        scope: 'FUTURE',
      };

      const req = {
        url: 'http://localhost/api/v1/bookings/recurring',
        json: async () => payload,
      } as unknown as NextRequest;

      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.updatedBookingsCount).toBe(2);
    });
  });

  describe('DELETE /api/v1/bookings/recurring', () => {
    it('should cancel future bookings and terminate the rule end date', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: true,
        tenantId: 'tenant_123',
        role: 'OWNER',
      });

      (deleteRecurringBookings as jest.Mock).mockResolvedValueOnce({
        success: true,
        cancelledCount: 1,
      });

      const req = {
        url: `http://localhost/api/v1/bookings/recurring?ruleId=${VALID_RULE_ID}&scope=FUTURE`,
      } as unknown as NextRequest;

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.cancelledCount).toBe(1);
    });

    it('should return 400 Bad Request if scope is missing', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({
        success: true,
        tenantId: 'tenant_123',
        role: 'OWNER',
      });

      const req = {
        url: `http://localhost/api/v1/bookings/recurring?ruleId=${VALID_RULE_ID}`,
      } as unknown as NextRequest;

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.message).toContain('scope');
    });
  });
});
