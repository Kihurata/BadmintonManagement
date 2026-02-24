
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';

interface Court {
    id: string;
    court_name: string;
}

interface TimelineProps {
    selectedDate: Date;
    courts: Court[];
    onBookingClick?: (bookingId: string) => void;
}

interface Booking {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    court_id: string;
    customer: {
        name: string;
        phone: string;
    };
}

export function Timeline({ selectedDate, courts, onBookingClick }: TimelineProps) {
    const [bookings, setBookings] = useState<Booking[]>([]);

    // Calculate current time position
    const [currentTimeTop, setCurrentTimeTop] = useState<number | null>(null);

    useEffect(() => {
        const updateTimePosition = () => {
            const now = new Date();
            const startHour = 6;
            const hours = now.getHours();
            const minutes = now.getMinutes();

            if (hours >= startHour && hours < 24) {
                // 80px per hour
                const position = (hours - startHour) * 80 + (minutes / 60) * 80;
                setCurrentTimeTop(position);
            } else {
                setCurrentTimeTop(null);
            }
        };

        updateTimePosition();
        const interval = setInterval(updateTimePosition, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // Fetch Bookings for ALL courts
    useEffect(() => {
        async function fetchBookings() {
            if (courts.length === 0) return;

            const start = startOfDay(selectedDate).toISOString();
            const end = endOfDay(selectedDate).toISOString();

            // Get all court IDs
            const courtIds = courts.map(c => c.id);

            const { data } = await supabase
                .from('bookings')
                .select(`
                  id,
                  start_time,
                  end_time,
                  status,
                  court_id,
                  customers ( name, phone )
                `)
                .in('court_id', courtIds)
                .gte('start_time', start)
                .lte('start_time', end);

            if (data) {
                // Transform data to match Booking interface
                const formattedBookings = data.map((item: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
                    id: item.id,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    status: item.status,
                    court_id: item.court_id,
                    customer: item.customers
                }));
                setBookings(formattedBookings);
            }
        }
        fetchBookings();
    }, [selectedDate, courts]);

    const hours = Array.from({ length: 19 }, (_, i) => i + 6); // 06:00 to 24:00

    // Helper to calculate position and height
    const getBookingStyle = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const startHour = 6;
        const startH = startDate.getHours();
        const startM = startDate.getMinutes();

        // Calculate top position relative to 06:00
        const top = ((startH - startHour) * 80) + ((startM / 60) * 80);

        // Calculate duration in minutes
        const durationMs = endDate.getTime() - startDate.getTime();
        const durationMins = durationMs / (1000 * 60);
        const height = (durationMins / 60) * 80;

        return { top: `${top}px`, height: `${height}px` };
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    // Grid columns configuration: Time column + 1 column per court
    const gridTemplateColumns = `60px repeat(${courts.length}, minmax(150px, 1fr))`;

    return (
        <main className="flex-1 overflow-y-auto relative no-scrollbar bg-white dark:bg-[#0d1b17] w-full">
            <div className="relative min-h-[1440px] w-full pb-24">

                {/* Court Headers (Sticky) */}
                <div className="sticky top-0 z-40 grid bg-white dark:bg-[#0d1b17] border-b border-gray-100 dark:border-white/5" style={{ gridTemplateColumns }}>
                    <div className="h-10 border-r border-gray-100 dark:border-white/5"></div> {/* Empty corner for time column */}
                    {courts.map((court) => (
                        <div key={court.id} className="h-10 flex items-center justify-center font-bold text-sm text-midnight dark:text-white border-r border-gray-100 dark:border-white/5 last:border-r-0">
                            {court.court_name}
                        </div>
                    ))}
                </div>

                <div className="grid w-full h-full" style={{ gridTemplateColumns }}>
                    {/* Time Column */}
                    <div className="flex flex-col text-xs font-medium text-gray-400 text-center select-none pt-2 border-r border-gray-100 dark:border-white/5">
                        {hours.map((hour) => (
                            <div key={hour} className="h-20 relative">
                                <span className="absolute -top-3 left-0 right-0">{hour.toString().padStart(2, '0')}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Court Columns */}
                    {courts.map((court) => (
                        <div key={court.id} className="relative border-r border-gray-100 dark:border-white/5 last:border-r-0">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col pointer-events-none">
                                {hours.map((hour) => (
                                    <div key={hour} className="h-20 border-b border-dashed border-gray-100 dark:border-white/5 w-full"></div>
                                ))}
                            </div>

                            {/* Bookings for this court */}
                            {bookings
                                .filter(b => b.court_id === court.id)
                                .map((booking) => {
                                    const isOrange = booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN';
                                    const containerClass = isOrange
                                        ? "bg-orange-500/15 border-orange-500 hover:bg-orange-500/20"
                                        : "bg-midnight/10 border-midnight dark:bg-white/10 dark:border-white/30 hover:bg-midnight/15 dark:hover:bg-white/20";
                                    const highlightTextClass = isOrange
                                        ? "text-orange-700 dark:text-orange-400"
                                        : "text-midnight dark:text-white/80";

                                    return (
                                        <div
                                            key={booking.id}
                                            className={`absolute left-1 right-2 rounded-lg border-l-[3px] p-2 overflow-hidden transition-colors cursor-pointer group z-10 ${containerClass}`}
                                            style={getBookingStyle(booking.start_time, booking.end_time)}
                                            onClick={() => onBookingClick?.(booking.id)}
                                        >
                                            <div className="flex flex-col h-full">
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-xs font-semibold mb-1 ${highlightTextClass}`}>
                                                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                    </span>
                                                    <span className={`material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity ${highlightTextClass}`}>more_horiz</span>
                                                </div>
                                                <h3 className="text-sm font-bold text-midnight dark:text-white leading-tight truncate">
                                                    {booking.customer?.name || 'Unknown'}
                                                </h3>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                    {booking.customer?.phone}
                                                </p>
                                                <div className="mt-auto flex items-center gap-1">
                                                    <span className={`material-symbols-outlined text-[14px] ${highlightTextClass}`}>
                                                        {booking.status === 'CHECKED_IN' ? 'directions_run' : 'check_circle'}
                                                    </span>
                                                    <span className={`text-[10px] font-medium uppercase ${highlightTextClass}`}>{booking.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ))}

                    {/* Current Time Indicator (Overlay across all columns) */}
                    {currentTimeTop !== null && (
                        <div className="absolute left-[60px] right-0 z-30 pointer-events-none" style={{ top: `${currentTimeTop + 40}px` }}>
                            <div className="absolute left-0 right-0 flex items-center">
                                <div className="absolute -left-[64px] bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-40">
                                    {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="w-full h-[1px] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
