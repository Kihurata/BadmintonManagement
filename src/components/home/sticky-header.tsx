import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface StickyHeaderProps {
    userName?: string;
    avatarUrl?: string;
    notificationCount?: number;
}

export function StickyHeader({
    // userName = "Admin", // Unused
    avatarUrl = "https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff",
    notificationCount = 0,
}: StickyHeaderProps) {
    const today = new Date();

    return (
        <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pb-2 justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center">
                    <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-emerald-500/20"
                        style={{ backgroundImage: `url("${avatarUrl}")` }}
                    />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        HÔM NAY
                    </p>
                    <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
                        {format(today, "dd MMM, yyyy", { locale: vi })}
                    </h2>
                </div>
            </div>

            <div className="flex items-center justify-end">
                <button className="group flex size-10 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative">
                    <span className="material-symbols-outlined text-slate-700 dark:text-slate-200 transition-transform group-hover:rotate-12" style={{ fontSize: "24px" }}>
                        notifications
                    </span>
                    {notificationCount > 0 && (
                        <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-800" />
                    )}
                </button>
            </div>
        </div>
    );
}
