import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMembersByHostId,
  createGroupMember,
  updateGroupMember,
  deactivateGroupMember,
} from '@/server/repositories/group-member-repo';

const createMemberSchema = z.object({
  name: z.string().min(1, 'Tên thành viên không được để trống'),
  phone: z.string().optional().nullable(),
  zalo: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateMemberSchema = z.object({
  memberId: z.string().uuid('ID thành viên không hợp lệ'),
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  zalo: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  action: z.enum(['update', 'deactivate']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const hostCustomerId = params.id;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const members = await getMembersByHostId(hostCustomerId, includeInactive);
    return NextResponse.json({ success: true, data: members });
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
    const hostCustomerId = params.id;
    const body = await request.json();

    const validation = createMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await createGroupMember({
      host_customer_id: hostCustomerId,
      ...validation.data,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { memberId, action, ...updateData } = validation.data;

    if (action === 'deactivate') {
      const result = await deactivateGroupMember(memberId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Đã hủy kích hoạt thành viên' });
    }

    const result = await updateGroupMember(memberId, updateData);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
