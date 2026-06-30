import { startOfToday, format } from 'date-fns';
import { createClient } from '@/utils/supabase/server';
import HomeClient from '@/components/home/home-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const todayStartStr = format(startOfToday(), "yyyy-MM-dd'T'HH:mm:ssXXX");

  // 1. Fetch Courts
  const { data: courtsData } = await supabase
    .from('courts')
    .select('id, court_name')
    .order('court_name');

  // 2. Fetch Today's Bookings
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
      id, 
      court_id, 
      start_time, 
      end_time, 
      status
    `)
    .in('status', ['CONFIRMED', 'CHECKED_IN']);

  // 3. Fetch Today's Invoices (for revenue)
  const { data: todayInvoices } = await supabase
    .from("invoices")
    .select("total_amount")
    .eq("is_paid", true)
    .gte("created_at", todayStartStr);

  // 4. Fetch Customers
  const { data: customersData } = await supabase
    .from('customers')
    .select('id, name, phone')
    .order('name');

  return (
    <HomeClient
      initialCourts={courtsData || []}
      initialBookings={bookingsData || []}
      initialTodayInvoices={todayInvoices || []}
      initialCustomers={customersData || []}
    />
  );
}
