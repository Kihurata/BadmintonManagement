import { createClient } from '@/utils/supabase/server';

export interface SplitSummaryRow {
  attendance_id: string;
  tenant_id: string;
  invoice_id: string;
  group_member_id: string;
  member_name: string;
  member_phone: string | null;
  member_zalo: string | null;
  member_facebook: string | null;
  is_paid: boolean;
  paid_at: string | null;
  payment_method: 'CASH' | 'BANK_TRANSFER' | null;
  shared_share: number;
  individual_total: number;
  total_due: number;
}

export interface SplitItemAllocation {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  sale_price: number;
  allocation_type: 'SHARED' | 'INDIVIDUAL' | null;
  assigned_member_id: string | null;
  assigned_member_name?: string | null;
}

export interface InvoiceSplitDetails {
  invoice_id: string;
  total_court_fee: number;
  attendees: SplitSummaryRow[];
  items: SplitItemAllocation[];
  summary: {
    total_invoice_amount: number;
    attendee_count: number;
    paid_count: number;
    unpaid_count: number;
    shared_pool_total: number;
    per_person_shared: number;
  };
}

/**
 * Fetch invoice split summary, attendee payment breakdown, and item allocations.
 */
export async function getSplitSummary(invoiceId: string): Promise<InvoiceSplitDetails | null> {
  const supabase = createClient();

  // 1. Query invoice and attached booking court fee (by invoice.id or booking_id)
  let { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select('*, bookings(total_court_fee)')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!invoiceData) {
    const { data: byBooking } = await supabase
      .from('invoices')
      .select('*, bookings(total_court_fee)')
      .eq('booking_id', invoiceId)
      .maybeSingle();

    if (byBooking) {
      invoiceData = byBooking;
      invoiceError = null;
    }
  }

  if (invoiceError || !invoiceData) {
    console.error('Error fetching invoice for split summary:', invoiceError);
    return null;
  }

  const bookingFee = Number(invoiceData.bookings?.total_court_fee || 0);

  // 2. Query invoice_split_summary view
  const { data: summaryRows, error: summaryError } = await supabase
    .from('invoice_split_summary')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('member_name', { ascending: true });

  if (summaryError) {
    console.error('Error fetching invoice_split_summary:', summaryError);
  }

  const attendees: SplitSummaryRow[] = (summaryRows as SplitSummaryRow[]) || [];

  // 3. Query invoice_items with assigned member info
  const { data: itemsData, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*, products(product_name), members(name)')
    .eq('invoice_id', invoiceId);

  if (itemsError) {
    console.error('Error fetching invoice_items for split:', itemsError);
  }

  interface RawItemType {
    id: string;
    invoice_id: string;
    product_id: string | null;
    quantity: number;
    sale_price: number;
    allocation_type: 'SHARED' | 'INDIVIDUAL' | null;
    assigned_member_id: string | null;
    products?: { product_name: string } | null;
    members?: { name: string } | null;
  }

  const items: SplitItemAllocation[] = ((itemsData as unknown as RawItemType[]) || []).map((item) => ({
    id: item.id,
    invoice_id: item.invoice_id,
    product_id: item.product_id,
    product_name: item.products?.product_name || 'Sản phẩm',
    quantity: item.quantity,
    sale_price: Number(item.sale_price),
    allocation_type: item.allocation_type || null,
    assigned_member_id: item.assigned_member_id || null,
    assigned_member_name: item.members?.name || null,
  }));

  // Compute overall summary statistics
  const attendeeCount = attendees.length;
  const paidCount = attendees.filter((a) => a.is_paid).length;
  const unpaidCount = attendeeCount - paidCount;

  const sharedItemsTotal = items
    .filter((i) => i.allocation_type === 'SHARED')
    .reduce((sum, i) => sum + i.sale_price * i.quantity, 0);

  const sharedPoolTotal = bookingFee + sharedItemsTotal;
  const perPersonShared = attendeeCount > 0 ? sharedPoolTotal / attendeeCount : 0;

  return {
    invoice_id: invoiceId,
    total_court_fee: bookingFee,
    attendees,
    items,
    summary: {
      total_invoice_amount: Number(invoiceData.total_amount),
      attendee_count: attendeeCount,
      paid_count: paidCount,
      unpaid_count: unpaidCount,
      shared_pool_total: sharedPoolTotal,
      per_person_shared: perPersonShared,
    },
  };
}

/**
 * Set/Sync attending group members for an invoice.
 * Also defaults any unallocated invoice items (allocation_type IS NULL) to 'SHARED'.
 */
export async function setAttendance(
  invoiceId: string,
  groupMemberIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Fetch invoice's tenant_id and actual id
  let { data: invoiceData, error: invErr } = await supabase
    .from('invoices')
    .select('id, tenant_id')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!invoiceData) {
    const { data: byBooking } = await supabase
      .from('invoices')
      .select('id, tenant_id')
      .eq('booking_id', invoiceId)
      .maybeSingle();

    if (byBooking) {
      invoiceData = byBooking;
      invErr = null;
    }
  }

  if (invErr || !invoiceData) {
    return { success: false, error: invErr?.message || 'Invoice not found' };
  }

  const realInvoiceId = invoiceData.id;
  const tenantId = invoiceData.tenant_id;

  // 1. Fetch current attendance list
  const { data: currentAttendance, error: curErr } = await supabase
    .from('invoice_split_attendance')
    .select('id, group_member_id, is_paid')
    .eq('invoice_id', realInvoiceId);

  if (curErr) {
    return { success: false, error: curErr.message };
  }

  const existingMemberIds = new Set((currentAttendance || []).map((a) => a.group_member_id));
  const newMemberIds = new Set(groupMemberIds);

  // Identify members to remove (only if unpaid)
  const toRemove = (currentAttendance || []).filter(
    (a) => !newMemberIds.has(a.group_member_id) && !a.is_paid
  );

  // Identify members to add
  const toAdd = groupMemberIds.filter((id) => !existingMemberIds.has(id));

  if (toRemove.length > 0) {
    const removeIds = toRemove.map((r) => r.id);
    const { error: delErr } = await supabase
      .from('invoice_split_attendance')
      .delete()
      .in('id', removeIds);

    if (delErr) {
      console.error('Error removing split attendees:', delErr);
    }
  }

  if (toAdd.length > 0) {
    const insertPayload = toAdd.map((memberId) => ({
      tenant_id: tenantId,
      invoice_id: realInvoiceId,
      group_member_id: memberId,
      is_paid: false,
    }));

    const { error: insErr } = await supabase
      .from('invoice_split_attendance')
      .insert(insertPayload);

    if (insErr) {
      return { success: false, error: insErr.message };
    }
  }

  // 2. Default untouched items to 'SHARED'
  const { error: updateItemsErr } = await supabase
    .from('invoice_items')
    .update({ allocation_type: 'SHARED', assigned_member_id: null })
    .eq('invoice_id', realInvoiceId)
    .is('allocation_type', null);

  if (updateItemsErr) {
    console.error('Error setting default SHARED items:', updateItemsErr);
  }

  return { success: true };
}

/**
 * Set allocation type and optional assigned member for an invoice item.
 */
export async function setItemAllocation(
  invoiceItemId: string,
  allocationType: 'SHARED' | 'INDIVIDUAL',
  assignedMemberId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  if (allocationType === 'INDIVIDUAL' && !assignedMemberId) {
    return { success: false, error: 'Assigned member ID is required for INDIVIDUAL allocation' };
  }

  const updatePayload = {
    allocation_type: allocationType,
    assigned_member_id: allocationType === 'INDIVIDUAL' ? assignedMemberId : null,
  };

  const { error } = await supabase
    .from('invoice_items')
    .update(updatePayload)
    .eq('id', invoiceItemId);

  if (error) {
    console.error('Error setting item allocation:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update payment status for a specific attendance record.
 */
export async function updateAttendancePaymentStatus(
  attendanceId: string,
  isPaid: boolean,
  paymentMethod: 'CASH' | 'BANK_TRANSFER' = 'CASH'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const updatePayload = {
    is_paid: isPaid,
    paid_at: isPaid ? new Date().toISOString() : null,
    payment_method: isPaid ? paymentMethod : null,
  };

  const { error } = await supabase
    .from('invoice_split_attendance')
    .update(updatePayload)
    .eq('id', attendanceId);

  if (error) {
    console.error('Error updating attendance payment status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
