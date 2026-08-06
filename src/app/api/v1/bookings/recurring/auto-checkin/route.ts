import { NextRequest, NextResponse } from 'next/server';
import { verifyUserRole } from '@/lib/api-auth';
import { getUncheckedInRecurringBookings, autoCheckInRecurringBookings } from '@/server/repositories/booking-repo';
import { z } from 'zod';

const querySchema = z.object({
  ruleId: z.string().uuid("Mã luật không đúng định dạng"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Tháng không đúng định dạng YYYY-MM").optional(),
});

const postSchema = z.object({
  ruleId: z.string().uuid("Mã luật không đúng định dạng"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Tháng không đúng định dạng YYYY-MM").optional(),
});

export async function GET(req: NextRequest) {
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
    const month = searchParams.get('month') || undefined;

    const validation = querySchema.safeParse({ ruleId, month });
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

    const previewData = await getUncheckedInRecurringBookings(
      validation.data.ruleId,
      validation.data.month
    );

    if (!previewData) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy thông tin lịch cố định.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: previewData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyUserRole(['OWNER', 'MANAGER', 'STAFF']);
    if (!auth.success || !auth.tenantId) {
      return auth.errorResponse || NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = postSchema.safeParse(body);
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

    const res = await autoCheckInRecurringBookings(
      validation.data.ruleId,
      validation.data.month
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: res.error || 'Tự động check-in thất bại.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
