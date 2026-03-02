import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface CourtStatus {
    id: string;
    name: string;
    isAvailable: boolean;
    currentBookingId?: string;
    bookingEndTime?: string;
    matchType?: string;
    imageUrl?: string;
}

interface CourtCardProps {
    court: CourtStatus;
    onBookClick?: (courtId: string) => void;
    onViewBookingClick?: (bookingId: string) => void;
}

export function CourtCard({ court, onBookClick, onViewBookingClick }: CourtCardProps) {
    const isAvailable = court.isAvailable;

    // Default image if none provided
    const bgImage = court.imageUrl || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop";

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-sm transition-transform active:scale-[0.98]",
                isAvailable
                    ? "border-2 border-emerald-500"
                    : "border border-slate-200 dark:border-slate-700"
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

            <div
                className={cn(
                    "h-48 w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105",
                    !isAvailable && "filter grayscale-[30%]"
                )}
                style={{ backgroundImage: `url("${bgImage}")` }}
            />

            {/* Top Right Badge */}
            <div className="absolute top-4 right-4 z-20">
                {isAvailable ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
                        Sẵn sàng
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span>
                        Đang sử dụng
                    </span>
                )}
            </div>

            {/* Bottom Content Area */}
            <div className="absolute bottom-0 left-0 w-full p-5 z-20 text-white">
                <p className={cn(
                    "text-xs font-bold uppercase tracking-wider mb-1",
                    isAvailable ? "text-emerald-300" : "text-slate-300"
                )}>
                    {/* Real implementation might categorise courts, for now hardcoded */}
                    Sân Tiêu chuẩn
                </p>

                <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold">{court.name}</h3>

                    {isAvailable ? (
                        <button
                            onClick={() => onBookClick?.(court.id)}
                            className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors z-30 relative"
                        >
                            Đặt ngay
                        </button>
                    ) : (
                        <div
                            className="text-right cursor-pointer z-30 relative"
                            onClick={() => court.currentBookingId && onViewBookingClick?.(court.currentBookingId)}
                        >
                            <p className="text-xs text-slate-300 font-medium">
                                Đến {court.bookingEndTime ? format(new Date(court.bookingEndTime), 'HH:mm') : '--:--'}
                            </p>
                            <p className="text-sm font-bold text-rose-300">
                                {court.matchType || "Đang chơi"}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar for In-Use Courts */}
            {!isAvailable && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700 z-30">
                    {/* We animate/hardcode a progress bar for visual flair */}
                    <div className="h-full bg-rose-500 w-[75%] rounded-r-full" />
                </div>
            )}
        </div>
    );
}

interface CourtStatusSectionProps {
    courts: CourtStatus[];
    onBookClick?: (courtId: string) => void;
    onViewBookingClick?: (bookingId: string) => void;
}

export function CourtStatusSection({ courts, onBookClick, onViewBookingClick }: CourtStatusSectionProps) {
    // Determine if facility is totally empty, partial, or full
    const activeCourts = courts.filter(c => !c.isAvailable).length;
    const isFacilityActive = activeCourts > 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Trạng thái Sân</h3>
                <span className={cn(
                    "text-sm font-semibold flex items-center gap-1",
                    isFacilityActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                )}>
                    {isFacilityActive && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {isFacilityActive ? 'Hoạt động' : 'Đang trống'}
                </span>
            </div>

            <div className="flex flex-col gap-4">
                {courts.map(court => (
                    <CourtCard
                        key={court.id}
                        court={court}
                        onBookClick={onBookClick}
                        onViewBookingClick={onViewBookingClick}
                    />
                ))}
            </div>
        </div>
    );
}
