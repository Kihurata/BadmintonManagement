import { createClient } from '@/utils/supabase/server';
import { calculateRentalFee } from '@/lib/pricing';

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
    .select('id, start_time, end_time, status, customer_id, guest_name, customers(name, type)')
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
        const customerObj = Array.isArray(dbBooking.customers) ? dbBooking.customers[0] : dbBooking.customers;
        const customerName = dbBooking.guest_name && customerObj?.type === 'GUEST'
          ? dbBooking.guest_name
          : customerObj?.name || 'Khách vãng lai';

        conflicts.push({
          id: dbBooking.id,
          start_time: dbBooking.start_time,
          end_time: dbBooking.end_time,
          customerName,
        });
        break;
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
    p_bookings: params.candidates,
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

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, status, start_time')
    .eq('recurring_rule_id', ruleId);

  if (fetchError) {
    return { success: false, cancelledCount: 0, error: fetchError.message };
  }

  let bookingsToCancel = (bookings || []).filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  if (scope === 'FUTURE') {
    bookingsToCancel = bookingsToCancel.filter(b => b.start_time >= now);
  }

  const cancelIds = bookingsToCancel.map(b => b.id);

  if (cancelIds.length > 0) {
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .in('id', cancelIds);

    if (cancelError) {
      return { success: false, cancelledCount: 0, error: cancelError.message };
    }
  }

  if (scope === 'ALL') {
    const remainingBookings = (bookings || []).filter(b => b.status !== 'CANCELLED' && !cancelIds.includes(b.id));
    if (remainingBookings.length === 0) {
      const { error: deleteRuleError } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('id', ruleId);

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
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await supabase
        .from('recurring_rules')
        .update({ end_date: yesterdayStr })
        .eq('id', ruleId);
    }
  } else {
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

  const { data: rule, error: fetchRuleError } = await supabase
    .from('recurring_rules')
    .select('id, tenant_id')
    .eq('id', params.ruleId)
    .single();

  if (fetchRuleError || !rule) {
    return { success: false, updatedBookingsCount: 0, error: 'Recurring rule not found.' };
  }

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

export interface RecurringRuleCostSummary {
  ruleId: string;
  totalSessions: number;
  completedSessions: number;
  checkedInSessions: number;
  cancelledSessions: number;
  pendingSessions: number;
  financials: {
    totalPaid: number;
    totalUnpaid: number;
    estimatedFuture: number;
    totalEstimatedSeries: number;
  };
}

export async function calculateRecurringRuleCost(ruleId: string): Promise<RecurringRuleCostSummary | null> {
  const supabase = createClient();

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .select('*, courts(*), customers(*)')
    .eq('id', ruleId)
    .single();

  if (ruleError || !rule) {
    console.error('Error fetching recurring rule details:', ruleError);
    return null;
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, invoices(*)')
    .eq('recurring_rule_id', ruleId);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return null;
  }

  let totalSessions = 0;
  let completedSessions = 0;
  let checkedInSessions = 0;
  let cancelledSessions = 0;
  let pendingSessions = 0;

  let totalPaid = 0;
  let totalUnpaid = 0;
  let estimatedFuture = 0;

  const court = rule.courts;
  const customerType = rule.customers?.type || 'GUEST';

  for (const booking of bookings || []) {
    totalSessions++;
    
    if (booking.status === 'CANCELLED') {
      cancelledSessions++;
      continue;
    } else if (booking.status === 'COMPLETED') {
      completedSessions++;
    } else if (booking.status === 'CHECKED_IN') {
      checkedInSessions++;
    } else if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
      pendingSessions++;
    }

    const invoice = Array.isArray(booking.invoices) ? booking.invoices[0] : booking.invoices;
    
    if (invoice) {
      if (invoice.is_paid) {
        totalPaid += Number(invoice.total_amount);
      } else {
        totalUnpaid += Number(invoice.total_amount);
      }
    } else {
      const pricing = calculateRentalFee(
        new Date(booking.start_time),
        new Date(booking.end_time),
        court,
        customerType
      );
      estimatedFuture += pricing.rentalFee;
    }
  }

  return {
    ruleId,
    totalSessions,
    completedSessions,
    checkedInSessions,
    cancelledSessions,
    pendingSessions,
    financials: {
      totalPaid,
      totalUnpaid,
      estimatedFuture,
      totalEstimatedSeries: totalPaid + totalUnpaid + estimatedFuture
    }
  };
}

export async function calculateMultipleRecurringRulesCosts(ruleIds: string[]): Promise<RecurringRuleCostSummary[]> {
  const supabase = createClient();
  if (ruleIds.length === 0) return [];

  const { data: rules, error: rulesError } = await supabase
    .from('recurring_rules')
    .select('*, courts(*), customers(*)')
    .in('id', ruleIds);

  if (rulesError || !rules) {
    console.error('Error fetching recurring rules details:', rulesError);
    return [];
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, invoices(*)')
    .in('recurring_rule_id', ruleIds);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return [];
  }

  const bookingsByRule: Record<string, typeof bookings> = {};
  for (const booking of bookings || []) {
    const rId = booking.recurring_rule_id;
    if (rId) {
      if (!bookingsByRule[rId]) {
        bookingsByRule[rId] = [];
      }
      bookingsByRule[rId].push(booking);
    }
  }

  const summaries: RecurringRuleCostSummary[] = [];

  for (const rule of rules) {
    const rId = rule.id;
    const ruleBookings = bookingsByRule[rId] || [];

    let totalSessions = 0;
    let completedSessions = 0;
    let checkedInSessions = 0;
    let cancelledSessions = 0;
    let pendingSessions = 0;

    let totalPaid = 0;
    let totalUnpaid = 0;
    let estimatedFuture = 0;

    const court = rule.courts;
    const customerType = rule.customers?.type || 'GUEST';

    for (const booking of ruleBookings) {
      totalSessions++;
      
      if (booking.status === 'CANCELLED') {
        cancelledSessions++;
        continue;
      } else if (booking.status === 'COMPLETED') {
        completedSessions++;
      } else if (booking.status === 'CHECKED_IN') {
        checkedInSessions++;
      } else if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
        pendingSessions++;
      }

      const invoice = Array.isArray(booking.invoices) ? booking.invoices[0] : booking.invoices;
      
      if (invoice) {
        if (invoice.is_paid) {
          totalPaid += Number(invoice.total_amount);
        } else {
          totalUnpaid += Number(invoice.total_amount);
        }
      } else {
        const pricing = calculateRentalFee(
          new Date(booking.start_time),
          new Date(booking.end_time),
          court,
          customerType
        );
        estimatedFuture += pricing.rentalFee;
      }
    }

    summaries.push({
      ruleId: rId,
      totalSessions,
      completedSessions,
      checkedInSessions,
      cancelledSessions,
      pendingSessions,
      financials: {
        totalPaid,
        totalUnpaid,
        estimatedFuture,
        totalEstimatedSeries: totalPaid + totalUnpaid + estimatedFuture
      }
    });
  }

  return summaries;
}

export interface UncheckedBookingItem {
  id: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'PENDING';
  court_name: string;
  customer_name: string;
  estimatedFee: number;
  isPrepaid: boolean;
}

export interface AutoCheckInPreviewData {
  ruleId: string;
  month: string;
  totalSessions: number;
  alreadyCheckedInCount: number;
  uncheckedSessionsCount: number;
  totalEstimatedFee: number;
  uncheckedBookings: UncheckedBookingItem[];
}

export async function getUncheckedInRecurringBookings(
  ruleId: string,
  monthStr?: string
): Promise<AutoCheckInPreviewData | null> {
  const supabase = createClient();

  const targetMonth = monthStr || new Date().toISOString().substring(0, 7);
  const [yearStr, monthNumStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);

  if (isNaN(year) || isNaN(monthNum)) {
    return null;
  }

  const startOfMonthLocal = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endOfMonthLocal = new Date(Date.UTC(year, monthNum - 1, lastDay, 23, 59, 59, 999) - 7 * 60 * 60 * 1000);

  const startIso = startOfMonthLocal.toISOString();
  const endIso = endOfMonthLocal.toISOString();

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .select('*, courts(*), customers(*)')
    .eq('id', ruleId)
    .single();

  if (ruleError || !rule) {
    console.error('Error fetching recurring rule for preview:', ruleError);
    return null;
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, invoices(*), courts(court_name), customers(name)')
    .eq('recurring_rule_id', ruleId)
    .neq('status', 'CANCELLED')
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .order('start_time', { ascending: true });

  if (bookingsError || !bookings) {
    console.error('Error fetching bookings for month preview:', bookingsError);
    return null;
  }

  const court = rule.courts;
  const customerType = rule.customers?.type || 'GUEST';
  const courtName = rule.courts?.court_name || 'Sân không xác định';
  const customerName = rule.customers?.name || 'Khách vãng lai';

  let totalSessions = 0;
  let alreadyCheckedInCount = 0;
  let totalEstimatedFee = 0;
  const uncheckedBookings: UncheckedBookingItem[] = [];

  for (const booking of bookings) {
    totalSessions++;

    if (booking.status === 'CHECKED_IN' || booking.status === 'COMPLETED') {
      alreadyCheckedInCount++;
    } else if (booking.status === 'CONFIRMED' || booking.status === 'PENDING') {
      const invoice = Array.isArray(booking.invoices) ? booking.invoices[0] : booking.invoices;
      const isPrepaid = invoice ? Boolean(invoice.is_paid) : false;

      let estimatedFee = 0;
      if (invoice && invoice.total_amount) {
        estimatedFee = Number(invoice.total_amount);
      } else {
        const pricing = calculateRentalFee(
          new Date(booking.start_time),
          new Date(booking.end_time),
          court,
          customerType
        );
        estimatedFee = pricing.rentalFee;
      }

      totalEstimatedFee += estimatedFee;

      uncheckedBookings.push({
        id: booking.id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        court_name: courtName,
        customer_name: customerName,
        estimatedFee,
        isPrepaid,
      });
    }
  }

  return {
    ruleId,
    month: targetMonth,
    totalSessions,
    alreadyCheckedInCount,
    uncheckedSessionsCount: uncheckedBookings.length,
    totalEstimatedFee,
    uncheckedBookings,
  };
}

export interface AutoCheckInResult {
  ruleId: string;
  month: string;
  checkedInCount: number;
  totalAmount: number;
}

export async function autoCheckInRecurringBookings(
  ruleId: string,
  monthStr?: string
): Promise<{ success: boolean; data?: AutoCheckInResult; error?: string }> {
  const supabase = createClient();

  const targetMonth = monthStr || new Date().toISOString().substring(0, 7);
  const [yearStr, monthNumStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);

  if (isNaN(year) || isNaN(monthNum)) {
    return { success: false, error: 'Tháng không hợp lệ' };
  }

  // Calculate local month bounds (UTC+7 for Vietnam)
  const startOfMonthLocal = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endOfMonthLocal = new Date(Date.UTC(year, monthNum - 1, lastDay, 23, 59, 59, 999) - 7 * 60 * 60 * 1000);

  const startIso = startOfMonthLocal.toISOString();
  const endIso = endOfMonthLocal.toISOString();

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .select('*, courts(*), customers(*)')
    .eq('id', ruleId)
    .single();

  if (ruleError || !rule) {
    return { success: false, error: ruleError?.message || 'Không tìm thấy luật đặt lịch cố định.' };
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, invoices(*)')
    .eq('recurring_rule_id', ruleId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .order('start_time', { ascending: true });

  if (bookingsError || !bookings) {
    return { success: false, error: bookingsError?.message || 'Không tìm thấy ca đặt sân.' };
  }

  const court = rule.courts;
  const customerType = rule.customers?.type || 'GUEST';

  let checkedInCount = 0;
  let totalAmount = 0;

  for (const booking of bookings) {
    const invoice = Array.isArray(booking.invoices) ? booking.invoices[0] : booking.invoices;

    let rentalFee = 0;
    if (invoice && invoice.total_amount) {
      rentalFee = Number(invoice.total_amount);
    } else {
      const pricing = calculateRentalFee(
        new Date(booking.start_time),
        new Date(booking.end_time),
        court,
        customerType
      );
      rentalFee = pricing.rentalFee;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('check_in_booking', {
      p_booking_id: booking.id,
      p_customer_id: rule.customer_id,
      p_rental_fee: rentalFee,
    });

    if (rpcError) {
      console.error(`Error checking in booking ${booking.id}:`, rpcError);
      continue;
    }

    const resObj = rpcData as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (resObj && resObj.success) {
      checkedInCount++;
      totalAmount += rentalFee;
    }
  }

  return {
    success: true,
    data: {
      ruleId,
      month: targetMonth,
      checkedInCount,
      totalAmount,
    },
  };
}

function formatHHMMSS(timeStr: string): string {
  if (!timeStr) return '00:00:00';
  const parts = timeStr.trim().split(':');
  const hh = (parts[0] || '00').padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  const ss = (parts[2] || '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function generateBookingDates(
  startDateStr: string,
  endDateStr: string,
  startTimeStr: string,
  endTimeStr: string,
  daysOfWeek: number[],
  timezoneOffset: string = '+07:00'
): Array<{ start_time: string; end_time: string; dateStr: string }> {
  const dates: Array<{ start_time: string; end_time: string; dateStr: string }> = [];
  const start = new Date(startDateStr.substring(0, 10) + 'T00:00:00');
  const end = new Date(endDateStr.substring(0, 10) + 'T00:00:00');

  const cleanStartTime = formatHHMMSS(startTimeStr);
  const cleanEndTime = formatHHMMSS(endTimeStr);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (daysOfWeek.includes(day)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;

      const candidateStart = `${dateStr}T${cleanStartTime}${timezoneOffset}`;
      const candidateEnd = `${dateStr}T${cleanEndTime}${timezoneOffset}`;

      const startDateObj = new Date(candidateStart);
      const endDateObj = new Date(candidateEnd);

      if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
        dates.push({
          start_time: startDateObj.toISOString(),
          end_time: endDateObj.toISOString(),
          dateStr,
        });
      }
    }
  }
  return dates;
}

export interface RenewRecurringRuleParams {
  ruleId: string;
  courtId?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  customerId?: string;
  targetStartDate?: string;
  targetEndDate?: string;
  skipConflicts?: boolean;
}

export async function renewRecurringRule(params: RenewRecurringRuleParams): Promise<{
  success: boolean;
  newRuleId?: string;
  bookingsCount?: number;
  conflicts?: RecurringConflict[];
  error?: string;
}> {
  const supabase = createClient();

  // 1. Fetch source recurring rule
  const { data: sourceRule, error: fetchError } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('id', params.ruleId)
    .single();

  if (fetchError || !sourceRule) {
    return { success: false, error: 'Source recurring rule not found.' };
  }

  // Override parameters if provided
  const courtId = params.courtId || sourceRule.court_id;
  const customerId = params.customerId || sourceRule.customer_id;
  const startTime = params.startTime || sourceRule.start_time;
  const endTime = params.endTime || sourceRule.end_time;
  const daysOfWeek = params.daysOfWeek || sourceRule.days_of_week;

  // 2. Compute target start and end dates
  let startDate = params.targetStartDate;
  let endDate = params.targetEndDate;

  if (!startDate || !endDate) {
    const rawEndDate = String(sourceRule.end_date).substring(0, 10);
    const srcEndDate = new Date(rawEndDate + 'T00:00:00');
    const nextMonthStart = new Date(srcEndDate.getFullYear(), srcEndDate.getMonth() + 1, 1);
    const nextMonthEnd = new Date(srcEndDate.getFullYear(), srcEndDate.getMonth() + 2, 0);

    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (!startDate) startDate = formatYMD(nextMonthStart);
    if (!endDate) endDate = formatYMD(nextMonthEnd);
  }

  // 3. Generate candidate booking dates
  const candidates = generateBookingDates(
    startDate,
    endDate,
    startTime,
    endTime,
    daysOfWeek
  );

  if (candidates.length === 0) {
    return { success: false, error: 'No booking dates generated for target date range.' };
  }

  const earliestStart = candidates[0].start_time;
  const latestEnd = candidates[candidates.length - 1].end_time;

  // 4. Check for conflicts
  const conflictResult = await checkRecurringConflicts(
    courtId,
    earliestStart,
    latestEnd,
    candidates
  );

  if (!conflictResult.success) {
    return { success: false, error: conflictResult.error };
  }

  let finalCandidates = candidates;
  if (conflictResult.data && conflictResult.data.length > 0) {
    if (!params.skipConflicts) {
      return {
        success: false,
        error: 'SCHEDULING_CONFLICT',
        conflicts: conflictResult.data,
      };
    }

    const conflictTimes = new Set(conflictResult.data.map(c => c.start_time));
    finalCandidates = candidates.filter(c => !conflictTimes.has(c.start_time));
  }

  if (finalCandidates.length === 0) {
    return { success: false, error: 'All generated booking dates conflict with existing bookings.' };
  }

  // 5. Create new recurring rule and bookings
  const createResult = await createRecurringBookings({
    tenantId: sourceRule.tenant_id,
    customerId,
    courtId,
    daysOfWeek,
    startTime,
    endTime,
    startDate,
    endDate,
    candidates: finalCandidates.map(c => ({ start_time: c.start_time, end_time: c.end_time })),
  });

  if (!createResult.success || !createResult.ruleId) {
    return { success: false, error: createResult.error || 'Failed to create renewed recurring bookings.' };
  }

  return {
    success: true,
    newRuleId: createResult.ruleId,
    bookingsCount: finalCandidates.length,
  };
}

