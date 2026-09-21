import { createClient } from "@/utils/supabase/server";

export interface Member {
    id: string;
    tenant_id: string;
    name: string;
    phone: string;
    zalo: string;
    facebook: string;
    notes: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateMemberParams {
    name: string;
    phone: string;
    zalo?: string | null;
    facebook?: string | null;
}

export interface UpdateMemberParams {
    name?: string;
    phone?: string;
    zalo?: string | null;
    facebook?: string | null;
    is_active?: boolean;
}

export async function getMember(includeInactive = false): Promise<Member[]> {
    const supabase = createClient();
    let query = supabase
        .from('members')
        .select('*');

    if (!includeInactive) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
        console.log('Error fetching members:', error);
    }

    return (data as Member[]) || [];
}

export async function createMember(params: CreateMemberParams): Promise<{ success: boolean; data?: Member; error?: string }> {
    const supabase = createClient();

    const insertPayload: Record<string, unknown> = {
        name: params.name.trim(),
        phone: params.phone.trim(),
        zalo: params.zalo?.trim() || null,
        facebook: params.facebook?.trim() || null,
        notes: null,
        is_active: true,
    }
    const { data, error } = await supabase
        .from('members')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        console.log('Error creating member:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data: data as Member };
}

export async function updateMember(memberId: string, params: UpdateMemberParams): Promise<{ success: boolean; data?: Member; error?: string }> {
    const supabase = createClient();
    const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (params.name !== undefined) updatePayload.name = params.name.trim();
    if (params.phone !== undefined) updatePayload.phone = params.phone.trim();
    if (params.zalo !== undefined) updatePayload.zalo = params.zalo?.trim() || null;
    if (params.facebook !== undefined) updatePayload.facebook = params.facebook?.trim() || null;
    if (params.is_active !== undefined) updatePayload.is_active = params.is_active;

    const { data, error } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('id', memberId)
        .select()
        .single();

    if (error) {
        console.log('Error updating member:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data: data as Member };
}