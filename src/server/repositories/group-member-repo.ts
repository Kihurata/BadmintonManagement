import { createClient } from '@/utils/supabase/server';

export interface HostGroupMember {
  id: string;
  tenant_id: string;
  host_customer_id: string;
  name: string;
  phone: string | null;
  zalo: string | null;
  facebook: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupMemberParams {
  host_customer_id: string;
  name: string;
  phone?: string | null;
  zalo?: string | null;
  facebook?: string | null;
  notes?: string | null;
}

export interface UpdateGroupMemberParams {
  name?: string;
  phone?: string | null;
  zalo?: string | null;
  facebook?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Fetch all group members for a specific host customer.
 */
export async function getMembersByHostId(
  hostCustomerId: string,
  includeInactive = false
): Promise<HostGroupMember[]> {
  const supabase = createClient();
  let query = supabase
    .from('host_group_members')
    .select('*')
    .eq('host_customer_id', hostCustomerId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching host group members:', error);
    return [];
  }

  return (data as HostGroupMember[]) || [];
}

/**
 * Create a new group member for a host customer.
 */
export async function createGroupMember(
  params: CreateGroupMemberParams
): Promise<{ success: boolean; data?: HostGroupMember; error?: string }> {
  const supabase = createClient();

  // Fetch host customer's tenant_id if available to ensure RLS compliance
  const { data: customerData } = await supabase
    .from('customers')
    .select('tenant_id')
    .eq('id', params.host_customer_id)
    .maybeSingle();

  const tenantId = customerData?.tenant_id;

  const insertPayload: Record<string, unknown> = {
    host_customer_id: params.host_customer_id,
    name: params.name.trim(),
    phone: params.phone?.trim() || null,
    zalo: params.zalo?.trim() || null,
    facebook: params.facebook?.trim() || null,
    notes: params.notes?.trim() || null,
    is_active: true,
  };

  if (tenantId) {
    insertPayload.tenant_id = tenantId;
  }

  const { data, error } = await supabase
    .from('host_group_members')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('Error creating host group member:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as HostGroupMember };
}

/**
 * Update an existing group member's details.
 */
export async function updateGroupMember(
  memberId: string,
  params: UpdateGroupMemberParams
): Promise<{ success: boolean; data?: HostGroupMember; error?: string }> {
  const supabase = createClient();
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.name !== undefined) updatePayload.name = params.name.trim();
  if (params.phone !== undefined) updatePayload.phone = params.phone ? params.phone.trim() : null;
  if (params.zalo !== undefined) updatePayload.zalo = params.zalo ? params.zalo.trim() : null;
  if (params.facebook !== undefined) updatePayload.facebook = params.facebook ? params.facebook.trim() : null;
  if (params.notes !== undefined) updatePayload.notes = params.notes ? params.notes.trim() : null;
  if (params.is_active !== undefined) updatePayload.is_active = params.is_active;

  const { data, error } = await supabase
    .from('host_group_members')
    .update(updatePayload)
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    console.error('Error updating host group member:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as HostGroupMember };
}

/**
 * Soft-delete a group member by setting is_active = false.
 */
export async function deactivateGroupMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  return updateGroupMember(memberId, { is_active: false });
}
