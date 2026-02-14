"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Receipt, Package, Users } from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { icon: <LayoutDashboard className="size-5" />, label: 'Tổng quan', href: '/dashboard', active: pathname === '/dashboard' },
        { icon: <CalendarDays className="size-5" />, label: 'Lịch đặt', href: '/', active: pathname === '/' },
        { icon: <Receipt className="size-5" />, label: 'Hóa đơn', href: '/invoices', active: pathname === '/invoices' },
        { icon: <Package className="size-5" />, label: 'Kho hàng', href: '/products', active: pathname === '/products' },
        { icon: <Users className="size-5" />, label: 'Khách hàng', href: '/customers', active: pathname === '/customers' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#10221c] border-r border-gray-100 dark:border-white/5 h-screen fixed left-0 top-0 z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-xl">sports_tennis</span>
                </div>
                <h1 className="font-bold text-lg tracking-tight">Badminton Manager</h1>
            </div>

            <nav className="flex-1 px-4 space-y-2 py-4">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                            item.active
                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5 hover:text-gray-900"
                        )}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-500 text-sm">person</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold">Admin User</p>
                        <p className="text-xs text-gray-500">Quản lý</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
