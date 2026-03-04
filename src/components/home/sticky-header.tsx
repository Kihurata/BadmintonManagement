import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { logout } from '@/app/(auth)/actions';

interface StickyHeaderProps {
    userName?: string;
    avatarUrl?: string;
    notificationCount?: number;
    title?: string;
    rightContent?: React.ReactNode;
}

export function StickyHeader({
    // userName = "Admin", // Unused
    avatarUrl = "https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff",
    notificationCount = 0,
    title,
    rightContent,
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
                    {title ? (
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
                            {title}
                        </h2>
                    ) : (
                        <>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                HÔM NAY
                            </p>
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
                                {format(today, "dd MMM, yyyy", { locale: vi })}
                            </h2>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-1">
                {rightContent}
                <button className="group flex size-9 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative">
                    <span className="material-symbols-outlined text-slate-700 dark:text-slate-200 transition-transform group-hover:rotate-12" style={{ fontSize: "20px" }}>
                        notifications
                    </span>
                    {notificationCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-white dark:border-slate-800" />
                    )}
                </button>
                <form action={logout}>
                    <button
                        title="Đăng xuất"
                        className="group flex size-9 cursor-pointer items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                    >
                        <span className="material-symbols-outlined text-rose-600 dark:text-rose-400" style={{ fontSize: "20px" }}>
                            logout
                        </span>
                    </button>
                </form>
            </div>
        </div>
    );
}
