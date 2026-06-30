import { supabase } from '@/lib/supabase';

export function subscribeToBookings(onUpdate: (payload: unknown) => void) {
  const channel = supabase
    .channel('bookings-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings'
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCourts(onUpdate: (payload: unknown) => void) {
  const channel = supabase
    .channel('courts-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'courts'
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
