import { NextRequest, NextResponse } from 'next/server';
import { getMember, createMember, updateMember } from '@/server/repositories/member-repo';
import { z } from 'zod';

const createMemberSchema = z.object({
    name: z.string(),
    phone: z.string(),
    zalo: z.string().optional(),
    facebook: z.string().optional(),
})

const updateMemberSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    phone: z.string().optional(),
    zalo: z.string().optional(),
    facebook: z.string().optional(),
    is_active: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const members = await getMember(includeInactive);
        return NextResponse.json({ success: true, data: members });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validtaion = createMemberSchema.safeParse(body);
        if (!validtaion.success) {
            return NextResponse.json({ success: false, error: validtaion.error }, { status: 400 });
        }

        const res = await createMember(validtaion.data);
        if (!res.success) {
            return NextResponse.json({ success: false, error: res.error }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: res.data }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = updateMemberSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        const res = await updateMember(body.id, validation.data);
        if (!res.success) {
            return NextResponse.json({ success: false, error: res.error }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: res.data }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
    }
}