import { NextRequest, NextResponse } from 'next/server';
import { verifyUserRole } from '@/lib/api-auth';
import { prepayRecurringBookings } from '@/server/repositories/invoice-repo';
import { z } from 'zod';

const prepaySchema = z.object({
  ruleId: z.string().uuid("Mã luật không đúng định dạng"),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).default('BANK_TRANSFER'),
});

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
    const validation = prepaySchema.safeParse(body);
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

    const { ruleId, paymentMethod } = validation.data;

    const res = await prepayRecurringBookings(ruleId, paymentMethod);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: res.error || 'Failed to prepay recurring bookings.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        prepayCount: res.prepayCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
