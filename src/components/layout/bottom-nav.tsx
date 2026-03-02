
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { icon: 'home', label: 'Trang chủ', href: '/', active: pathname === '/' },
        { icon: 'calendar_today', label: 'Lịch đặt', href: '/schedule', active: pathname === '/schedule' },
        { icon: 'receipt_long', label: 'Hóa đơn', href: '/invoices', active: pathname === '/invoices' },
        { icon: 'analytics', label: 'Báo cáo', href: '/dashboard', active: pathname === '/dashboard' },
        { icon: 'groups', label: 'Khách hàng', href: '/customers', active: pathname === '/customers' },
    ];

    return (
        <nav className="flex-none bg-white dark:bg-[#10221c] border-t border-gray-100 dark:border-white/5 pb-safe-bottom z-50">
            <div className="grid grid-cols-4 h-16">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 transition-colors",
                            item.active ? "text-primary" : "text-gray-400 hover:text-primary"
                        )}
                    >
                        <span className={cn("material-symbols-outlined text-2xl", item.active && "fill-1")}>
                            {item.icon}
                        </span>
                        <span className={cn("text-[10px]", item.active ? "font-bold" : "font-medium")}>
                            {item.label}
                        </span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
