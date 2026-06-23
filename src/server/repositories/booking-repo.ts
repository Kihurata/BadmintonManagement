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
    const { data: guest } = await supabase
      .from('customers')
      .select('id')
      .eq('name', 'Khách vãng lai')
      .single();

    if (guest) {
      finalCustomerId = guest.id;
    } else {
      const { data: newGuest, error: createError } = await supabase
        .from('customers')
        .insert([{ name: 'Khách vãng lai', type: 'GUEST' }])
        .select()
        .single();

      if (createError || !newGuest) {
        return { success: false, error: 'Không thể tạo khách vãng lai mặc định' };
      }
      finalCustomerId = newGuest.id;
    }
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
