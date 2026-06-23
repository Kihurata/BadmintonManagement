import { createClient } from '@/utils/supabase/server';
import ScheduleClient from '@/components/booking/schedule/schedule-client';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('courts')
    .select('id, court_name')
    .order('court_name');

  return (
    <ScheduleClient initialCourts={data || []} />
  );
}
