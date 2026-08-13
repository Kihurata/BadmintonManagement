import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUserRole } from '@/lib/api-auth';
import { renewRecurringRule } from '@/server/repositories/recurring-repo';

const renewSchema = z.object({
  ruleId: z.string().uuid({ message: 'ruleId phải là UUID hợp lệ' }),
  courtId: z.string().uuid().optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  customerId: z.string().uuid().optional(),
  targetStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'targetStartDate phải có dạng YYYY-MM-DD' }).optional(),
  targetEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'targetEndDate phải có dạng YYYY-MM-DD' }).optional(),
  skipConflicts: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const auth = await verifyUserRole(['OWNER', 'MANAGER', 'STAFF']);
    if (!auth.success) {
      return auth.errorResponse || NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = renewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Dữ liệu không hợp lệ',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const result = await renewRecurringRule({
      ruleId: parsed.data.ruleId,
      courtId: parsed.data.courtId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      daysOfWeek: parsed.data.daysOfWeek,
      customerId: parsed.data.customerId,
      targetStartDate: parsed.data.targetStartDate,
      targetEndDate: parsed.data.targetEndDate,
      skipConflicts: parsed.data.skipConflicts,
    });

    if (!result.success) {
      if (result.error === 'SCHEDULING_CONFLICT') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Có lịch đặt sân bị trùng giờ khi gia hạn.',
              conflicts: result.conflicts || [],
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error || 'Có lỗi xảy ra khi gia hạn lịch cố định.',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        newRuleId: result.newRuleId,
        bookingsCount: result.bookingsCount,
      },
    });

  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 }
    );
  }
}
