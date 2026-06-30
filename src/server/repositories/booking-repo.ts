import { createClient } from '@/utils/supabase/server';

export interface BookingWithDetails {
  id: string;
  customer_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  deposit_amount: number;
  overtime_fee: number;
  total_court_fee: number;
  note: string | null;
  customers: {
    id: string;
    name: string;
    phone: string | null;
    type: 'LOYAL' | 'GUEST';
  } | null;
  courts: {
    id: string;
    court_name: string;
    morning_price_guest: number;
    morning_price_loyal: number;
    evening_price_guest: number;
    evening_price_loyal: number;
  } | null;
}

export async function getBookingWithDetails(bookingId: string): Promise<BookingWithDetails | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers ( id, name, phone, type ),
      courts ( * )
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
  return data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function updateBookingTime(bookingId: string, startTime: string, endTime: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({
      start_time: startTime,
      end_time: endTime
    })
    .eq('id', bookingId);

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true };
}

export async function checkInBooking(bookingId: string, customerId: string, rentalFee: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('check_in_booking', {
    p_booking_id: bookingId,
    p_customer_id: customerId,
    p_rental_fee: rentalFee
  });

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  
  const result = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (result && !result.success) {
    return { success: false, error: result.error || 'Check-in failed on server' };
  }
  return { success: true };
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', bookingId);

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true };
}

export async function completeBooking(
  bookingId: string,
  actualEndTime: string,
  overtimeFee: number,
  rentalFee: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'COMPLETED',
      actual_end_time: actualEndTime,
      overtime_fee: overtimeFee,
      total_court_fee: rentalFee,
    })
    .eq('id', bookingId);

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true };
}

export async function resolveGuestCustomerId(): Promise<{ success: boolean; data?: string; error?: string }> {
  const supabase = createClient();
  const { data: guest } = await supabase
    .from('customers')
    .select('id')
    .eq('name', 'Khách vãng lai')
    .single();

  if (guest) {
    return { success: true, data: guest.id };
  }

  const { data: newGuest, error: createError } = await supabase
    .from('customers')
    .insert([{ name: 'Khách vãng lai', type: 'GUEST' }])
    .select()
    .single();

  if (createError || !newGuest) {
    return { success: false, error: 'Không thể tạo khách vãng lai mặc định' };
  }
  return { success: true, data: newGuest.id };
}

export async function createBooking(
  courtId: string,
  customerId: string | null,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; data?: any; error?: string }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = createClient();

  // Check conflicts
  const { data: conflicts, error: conflictError } = await supabase
    .from('bookings')
    .select('id')
    .eq('court_id', courtId)
    .neq('status', 'CANCELLED')
    .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`);

  if (conflictError) {
    return { success: false, error: conflictError.message };
  }

  if (conflicts && conflicts.length > 0) {
    return { success: false, error: 'Giờ này đã có người đặt' };
  }

  // Resolve Customer ID
  let finalCustomerId = customerId;
  if (!finalCustomerId) {
    const res = await resolveGuestCustomerId();
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Không thể tạo khách vãng lai mặc định' };
    }
    finalCustomerId = res.data;
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      court_id: courtId,
      customer_id: finalCustomerId,
      start_time: startTime,
      end_time: endTime,
      status: 'CONFIRMED'
    }])
    .select()
    .single();

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true, data };
}

export interface RecurringConflict {
  id: string;
  start_time: string;
  end_time: string;
  customerName: string;
}

export async function checkRecurringConflicts(
  courtId: string,
  earliestStart: string,
  latestEnd: string,
  candidates: Array<{ start_time: string; end_time: string }>
): Promise<{ success: boolean; data?: RecurringConflict[]; error?: string }> {
  const supabase = createClient();
  const { data: dbBookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status, customer_id, customers(name)')
    .eq('court_id', courtId)
    .neq('status', 'CANCELLED')
    .lt('start_time', latestEnd)
    .gt('end_time', earliestStart);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const conflicts: RecurringConflict[] = [];
  for (const dbBooking of dbBookings || []) {
    for (const candidate of candidates) {
      if (dbBooking.start_time < candidate.end_time && dbBooking.end_time > candidate.start_time) {
        conflicts.push({
          id: dbBooking.id,
          start_time: dbBooking.start_time,
          end_time: dbBooking.end_time,
          customerName: (Array.isArray(dbBooking.customers)
            ? (dbBooking.customers[0] as unknown as { name: string })?.name
            : (dbBooking.customers as unknown as { name: string })?.name) || 'Khách vãng lai',
        });
        break; // Avoid adding same booking multiple times if it spans multiple candidate slots
      }
    }
  }

  return { success: true, data: conflicts };
}

export async function createRecurringBookings(params: {
  tenantId: string;
  customerId: string;
  courtId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  candidates: Array<{ start_time: string; end_time: string }>;
}): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  const supabase = createClient();
  const { data: ruleId, error: rpcError } = await supabase.rpc('create_recurring_bookings', {
    p_tenant_id: params.tenantId,
    p_customer_id: params.customerId,
    p_court_id: params.courtId,
    p_days_of_week: params.daysOfWeek,
    p_start_time: params.startTime,
    p_end_time: params.endTime,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_bookings: params.candidates, // JSON array
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  return { success: true, ruleId: ruleId as string };
}

export async function deleteRecurringBookings(
  ruleId: string,
  scope: 'ALL' | 'FUTURE'
): Promise<{ success: boolean; cancelledCount: number; error?: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // 1. Fetch bookings associated with the rule to determine if any are completed
  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, status, start_time')
    .eq('recurring_rule_id', ruleId);

  if (fetchError) {
    return { success: false, cancelledCount: 0, error: fetchError.message };
  }

  // Filter which bookings we are allowed to cancel (only CONFIRMED or PENDING)
  let bookingsToCancel = (bookings || []).filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  if (scope === 'FUTURE') {
    bookingsToCancel = bookingsToCancel.filter(b => b.start_time >= now);
  }

  const cancelIds = bookingsToCancel.map(b => b.id);

  // 2. Perform updates in DB
  if (cancelIds.length > 0) {
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .in('id', cancelIds);

    if (cancelError) {
      return { success: false, cancelledCount: 0, error: cancelError.message };
    }
  }

  // 3. Handle recurring rule row cleanup
  if (scope === 'ALL') {
    // Check if there are any remaining active/completed bookings that reference this rule
    const remainingBookings = (bookings || []).filter(b => b.status !== 'CANCELLED' && !cancelIds.includes(b.id));
    if (remainingBookings.length === 0) {
      // Safe to delete the rule completely
      const { error: deleteRuleError } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('id', ruleId);

      // If delete fails (e.g. foreign key constraint), fallback to setting end_date to yesterday
      if (deleteRuleError) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        await supabase
          .from('recurring_rules')
          .update({ end_date: yesterdayStr })
          .eq('id', ruleId);
      }
    } else {
      // Keep the rule row for historical reference, but set end_date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await supabase
        .from('recurring_rules')
        .update({ end_date: yesterdayStr })
        .eq('id', ruleId);
    }
  } else {
    // scope === 'FUTURE'
    // Set end_date to today
    const todayStr = new Date().toISOString().split('T')[0];
    await supabase
      .from('recurring_rules')
      .update({ end_date: todayStr })
      .eq('id', ruleId);
  }

  return { success: true, cancelledCount: cancelIds.length };
}

export async function updateRecurringBookings(params: {
  ruleId: string;
  customerId?: string;
  note?: string | null;
  scope: 'ALL' | 'FUTURE';
}): Promise<{ success: boolean; updatedBookingsCount: number; error?: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // 1. Fetch existing rule to verify ownership
  const { data: rule, error: fetchRuleError } = await supabase
    .from('recurring_rules')
    .select('id, tenant_id')
    .eq('id', params.ruleId)
    .single();

  if (fetchRuleError || !rule) {
    return { success: false, updatedBookingsCount: 0, error: 'Recurring rule not found.' };
  }

  // 2. Build the update payload for recurring_rules
  const ruleUpdate: { customer_id?: string } = {};
  if (params.customerId !== undefined) ruleUpdate.customer_id = params.customerId;

  if (Object.keys(ruleUpdate).length > 0) {
    const { error: ruleUpdateError } = await supabase
      .from('recurring_rules')
      .update(ruleUpdate)
      .eq('id', params.ruleId);

    if (ruleUpdateError) {
      return { success: false, updatedBookingsCount: 0, error: ruleUpdateError.message };
    }
  }

  // 3. Build the update payload for individual bookings
  const bookingUpdate: { customer_id?: string; note?: string | null } = {};
  if (params.customerId !== undefined) bookingUpdate.customer_id = params.customerId;
  if (params.note !== undefined) bookingUpdate.note = params.note;

  let updatedBookingsCount = 0;

  if (Object.keys(bookingUpdate).length > 0) {
    let query = supabase
      .from('bookings')
      .update(bookingUpdate)
      .eq('recurring_rule_id', params.ruleId)
      .in('status', ['CONFIRMED', 'PENDING']);

    if (params.scope === 'FUTURE') {
      query = query.gte('start_time', now);
    }

    const { data: updatedBookings, error: bookingUpdateError } = await query.select('id');

    if (bookingUpdateError) {
      return { success: false, updatedBookingsCount: 0, error: bookingUpdateError.message };
    }
    updatedBookingsCount = updatedBookings?.length || 0;
  }

  return { success: true, updatedBookingsCount };
}

