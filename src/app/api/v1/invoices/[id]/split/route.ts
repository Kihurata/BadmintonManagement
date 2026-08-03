import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSplitSummary,
  setAttendance,
  setItemAllocation,
  updateAttendancePaymentStatus,
} from '@/server/repositories/split-repo';

const setAttendanceSchema = z.object({
  groupMemberIds: z.array(z.string().uuid('ID thành viên không hợp lệ')),
});

const patchSplitSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('allocate_item'),
    invoiceItemId: z.string().uuid('ID dòng hóa đơn không hợp lệ'),
    allocationType: z.enum(['SHARED', 'INDIVIDUAL']),
    assignedMemberId: z.string().uuid().optional().nullable(),
  }),
  z.object({
    action: z.literal('update_payment'),
    attendanceId: z.string().uuid('ID điểm danh không hợp lệ'),
    isPaid: z.boolean(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).optional().default('CASH'),
  }),
]);

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const splitData = await getSplitSummary(invoiceId);

    if (!splitData) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thông tin chia tiền hóa đơn' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: splitData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await request.json();

    const validation = setAttendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await setAttendance(invoiceId, validation.data.groupMemberIds);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const updatedSummary = await getSplitSummary(invoiceId);
    return NextResponse.json({ success: true, data: updatedSummary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await request.json();

    const validation = patchSplitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const payload = validation.data;

    if (payload.action === 'allocate_item') {
      const result = await setItemAllocation(
        payload.invoiceItemId,
        payload.allocationType,
        payload.assignedMemberId
      );
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
    } else if (payload.action === 'update_payment') {
      const result = await updateAttendancePaymentStatus(
        payload.attendanceId,
        payload.isPaid,
        payload.paymentMethod
      );
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
    }

    const updatedSummary = await getSplitSummary(invoiceId);
    return NextResponse.json({ success: true, data: updatedSummary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
