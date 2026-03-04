
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { icon: 'calendar_today', label: 'Lịch đặt', href: '/schedule', active: pathname === '/schedule' },
        { icon: 'receipt_long', label: 'Hóa đơn', href: '/invoices', active: pathname === '/invoices' },
        { icon: 'home', label: 'Trang chủ', href: '/', active: pathname === '/', isCenter: true },
        { icon: 'analytics', label: 'Báo cáo', href: '/dashboard', active: pathname === '/dashboard' },
        { icon: 'groups', label: 'Khách hàng', href: '/customers', active: pathname === '/customers' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-[#10221c] border-t border-gray-100 dark:border-white/5 pb-safe-bottom z-[100] transition-all">
            <div className="flex items-center justify-around h-16 px-1">
                {navItems.map((item) => (
                    item.isCenter ? (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex flex-col items-center justify-center -mt-6 group flex-1"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shadow-md border-4 border-white dark:border-[#10221c] group-active:scale-95 transition-transform">
                                <span className={cn("material-symbols-outlined text-3xl", item.active && "fill-1")}>
                                    {item.icon}
                                </span>
                            </div>
                            <span className={cn("text-[10px] mt-1", item.active ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-medium text-gray-500 dark:text-gray-400")}>
                                {item.label}
                            </span>
                        </Link>
                    ) : (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-colors flex-1",
                                item.active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                            )}
                        >
                            <span className={cn("material-symbols-outlined text-2xl", item.active && "fill-1")}>
                                {item.icon}
                            </span>
                            <span className={cn("text-[10px]", item.active ? "font-bold" : "font-medium")}>
                                {item.label}
                            </span>
                        </Link>
                    )
                ))}
            </div>
        </nav>
    );
}
