import { NextRequest, NextResponse } from 'next/server';
import { verifyUserRole } from '@/lib/api-auth';
import { z } from 'zod';
import {
  resolveGuestCustomerId,
  checkRecurringConflicts,
  createRecurringBookings,
  deleteRecurringBookings,
  updateRecurringBookings,
} from '@/server/repositories/booking-repo';

const recurringBookingSchema = z.object({
  courtId: z.uuid("Mã sân không đúng định dạng"),
  customerId: z.uuid("Mã khách hàng không đúng định dạng").nullable().optional(),

  startTime: z.string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Thời gian bắt đầu phải ở định dạng HH:MM"),

  endTime: z.string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Thời gian kết thúc phải ở định dạng HH:MM"),

  startDate: z.string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu phải ở định dạng YYYY-MM-DD"),

  endDate: z.string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc phải ở định dạng YYYY-MM-DD"),

  daysOfWeek: z.array(
    z.number().int().min(0, "Ngày không hợp lệ").max(6, "Ngày không hợp lệ")
  ).min(1, "Phải chọn ít nhất một ngày trong tuần"),
});

// Helper to generate UTC booking dates based on daysOfWeek and timezoneOffset
function generateBookingDates(
  startDateStr: string,
  endDateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  daysOfWeek: number[],
  timezoneOffset: string
): Array<{ start_time: string; end_time: string; dateStr: string }> {
  const dates: Array<{ start_time: string; end_time: string; dateStr: string }> = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (daysOfWeek.includes(day)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;

      // Construct local candidate string (e.g. "2026-07-01T18:00:00+07:00")
      const candidateStart = `${dateStr}T${startTimeStr}:00${timezoneOffset}`;
      const candidateEnd = `${dateStr}T${endTimeStr}:00${timezoneOffset}`;

      dates.push({
        start_time: new Date(candidateStart).toISOString(),
        end_time: new Date(candidateEnd).toISOString(),
        dateStr,
      });
    }
  }
  return dates;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await verifyUserRole(['OWNER', 'MANAGER', 'STAFF']);
    if (!auth.success || !auth.tenantId) {
      return auth.errorResponse || NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = recurringBookingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: validation.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const {
      courtId,
      customerId,
      startTime,     // e.g. "18:00"
      endTime,       // e.g. "20:00"
      startDate,     // e.g. "2026-07-01"
      endDate,       // e.g. "2026-07-31"
      daysOfWeek,    // e.g. [1, 3, 5]
    } = validation.data;

    // App is strictly for Vietnam timezone (+07:00)
    const timezoneOffset = '+07:00';

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check max duration of 3 months
    const maxDurationMs = 3 * 31 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxDurationMs) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Recurring bookings cannot exceed 3 months.' } },
        { status: 400 }
      );
    }

    // 3. Generate candidate booking slots
    const candidates = generateBookingDates(
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek,
      timezoneOffset
    );

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No matching days found in the selected date range.' } },
        { status: 400 }
      );
    }

    const earliestStart = candidates[0].start_time;
    const latestEnd = candidates[candidates.length - 1].end_time;

    // 4. Fetch active bookings in range to check for overlaps via repository
    const conflictResult = await checkRecurringConflicts(courtId, earliestStart, latestEnd, candidates);
    if (!conflictResult.success || !conflictResult.data) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: conflictResult.error || 'Failed to check conflicts.' } },
        { status: 500 }
      );
    }

    // 5. Detect conflicts
    if (conflictResult.data.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Scheduling conflicts detected.',
          conflicts: conflictResult.data,
        },
      });
    }

    // Resolve Customer ID (if not provided, default to Khách vãng lai)
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const customerRes = await resolveGuestCustomerId();
      if (!customerRes.success || !customerRes.data) {
        return NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: customerRes.error || 'Failed to resolve guest customer.' } },
          { status: 500 }
        );
      }
      finalCustomerId = customerRes.data;
    }

    // 6. Call transaction RPC via repository
    const createResult = await createRecurringBookings({
      tenantId: auth.tenantId,
      customerId: finalCustomerId,
      courtId,
      daysOfWeek,
      startTime,
      endTime,
      startDate,
      endDate,
      candidates,
    });

    if (!createResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: createResult.error || 'Failed to create recurring bookings.' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ruleId: createResult.ruleId,
          bookingsCreatedCount: candidates.length,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyUserRole(['OWNER', 'MANAGER', 'STAFF']);
    if (!auth.success || !auth.tenantId) {
      return auth.errorResponse || NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get('ruleId');
    const scope = searchParams.get('scope') || 'FUTURE'; // 'ALL' or 'FUTURE'

    if (!ruleId || !z.string().uuid().safeParse(ruleId).success) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing or invalid ruleId.' } },
        { status: 400 }
      );
    }

    if (scope !== 'ALL' && scope !== 'FUTURE') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Scope must be ALL or FUTURE.' } },
        { status: 400 }
      );
    }

    const deleteResult = await deleteRecurringBookings(ruleId, scope);
    if (!deleteResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: deleteResult.error || 'Failed to delete recurring bookings.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        cancelledCount: deleteResult.cancelledCount,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}

const updateRecurringSchema = z.object({
  ruleId: z.string().uuid("Mã luật không đúng định dạng"),
  customerId: z.string().uuid("Mã khách hàng không đúng định dạng").optional(),
  note: z.string().nullable().optional(),
  scope: z.enum(['ALL', 'FUTURE']).default('FUTURE'),
});

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyUserRole(['OWNER', 'MANAGER', 'STAFF']);
    if (!auth.success || !auth.tenantId) {
      return auth.errorResponse || NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = updateRecurringSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: validation.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { ruleId, customerId, note, scope } = validation.data;

    const updateResult = await updateRecurringBookings({
      ruleId,
      customerId,
      note,
      scope,
    });

    if (!updateResult.success) {
      const isNotFound = updateResult.error === 'Recurring rule not found.';
      return NextResponse.json(
        {
          success: false,
          error: {
            code: isNotFound ? 'NOT_FOUND' : 'DATABASE_ERROR',
            message: updateResult.error || 'Failed to update recurring bookings.',
          }
        },
        { status: isNotFound ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ruleId,
        updatedBookingsCount: updateResult.updatedBookingsCount,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
