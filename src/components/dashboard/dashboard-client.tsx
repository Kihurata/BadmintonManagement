"use client";

import { useState, useEffect, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { format, subMonths, addMonths, parse } from "date-fns";
import { vi } from "date-fns/locale";
import { StickyHeader } from "@/components/home/sticky-header";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/components/auth-provider";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import type { DashboardData, LowStockItem } from "@/server/repositories/dashboard-repo";

// ─── Sub-components ───────────────────────────────────────────────────
function TreasuryCard({ label, icon, amount, colorClass }: {
    label: string; icon: string; amount: number; colorClass: string;
}) {
    return (
        <div className={cn("rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden", colorClass)}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold opacity-80 uppercase tracking-widest">{label}</span>
                <span className="material-symbols-outlined text-2xl opacity-70">{icon}</span>
            </div>
            <p className="text-3xl font-black tracking-tight">{formatCurrency(amount)}</p>
            <div className="absolute -bottom-4 -right-4 size-24 rounded-full bg-white/10" />
        </div>
    );
}

function MetricRow({ label, value, icon, colorClass, subLabel }: {
    label: string; value: number; icon: string; colorClass: string; subLabel?: string;
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
            <div className="flex items-center gap-3">
                <span className={cn("size-8 rounded-lg flex items-center justify-center", colorClass)}>
                    <span className="material-symbols-outlined text-sm">{icon}</span>
                </span>
                <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                    {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
                </div>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(value)}</span>
        </div>
    );
}

function ReorderAlert({ items, onCopy, copied }: {
    items: LowStockItem[];
    onCopy: () => void;
    copied: boolean;
}) {
    if (items.length === 0) return null;
    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-xl">warning</span>
                    <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                        {items.length} món sắp hết hàng
                    </h3>
                </div>
                <button
                    onClick={onCopy}
                    className={cn(
                        "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                        copied
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                            : "bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300 hover:bg-amber-300"
                    )}
                >
                    <span className="material-symbols-outlined text-base">
                        {copied ? "check_circle" : "content_copy"}
                    </span>
                    {copied ? "Đã copy!" : "Copy đặt hàng"}
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {items.map(item => (
                    <span key={item.id} className="inline-flex items-center gap-1 bg-white dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/40 rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                        <span className="material-symbols-outlined text-xs text-amber-400">inventory_2</span>
                        {item.product_name}
                        <span className="ml-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-black">
                            {item.stock_quantity}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── Main Client Component ───────────────────────────────────────────
interface DashboardClientProps {
    initialData: DashboardData;
    selectedMonth: string; // "yyyy-MM"
}

export function DashboardClient({ initialData, selectedMonth }: DashboardClientProps) {
    const { role, loading: roleLoading } = useUserRole();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!roleLoading && role === 'STAFF') {
            router.replace('/?error=' + encodeURIComponent('Bạn không có quyền truy cập vào báo cáo tài chính.'));
        }
    }, [role, roleLoading, router]);

    const [reorderCopied, setReorderCopied] = useState(false);

    // Parse selected month into a Date anchor
    const selectedDate = parse(`${selectedMonth}-01`, "yyyy-MM-dd", new Date());
    const currentMonthLabel = format(selectedDate, "MM/yyyy", { locale: vi });

    const {
        treasury,
        monthMetrics,
        chartData,
        topProducts,
        lowStockItems,
        recentExpenses
    } = initialData;

    function handleMonthChange(newDate: Date) {
        const nextMonth = format(newDate, "yyyy-MM");
        startTransition(() => {
            router.push(`/dashboard?month=${nextMonth}`, { scroll: false });
        });
    }

    function handleCopyReorder() {
        const list = lowStockItems.map(i => `${i.product_name} (Còn ${i.stock_quantity})`).join(", ");
        const msg = `📦 Đặt hàng bổ sung:\n${list}`;
        navigator.clipboard.writeText(msg);
        setReorderCopied(true);
        setTimeout(() => setReorderCopied(false), 2500);
    }

    const totalTreasury = treasury.cashBalance + treasury.bankBalance;
    const isCurrentMonth = format(selectedDate, "yyyy-MM") === format(new Date(), "yyyy-MM");

    return (
        <div className="bg-background-light dark:bg-background-dark h-screen overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
            <Sidebar />

            <div className="flex-1 flex flex-col md:pl-64 transition-all overflow-hidden relative">
                <div className="md:hidden">
                    <StickyHeader title="Báo cáo" />
                </div>

                <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-24 md:pb-10 no-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Page Header */}
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Buồng lái Tài chính</h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Ngân quỹ lũy kế & hiệu suất kinh doanh tháng {currentMonthLabel}.</p>
                            </div>

                            {/* Month Selector */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-1 shadow-sm w-fit">
                                <button
                                    onClick={() => handleMonthChange(subMonths(selectedDate, 1))}
                                    disabled={isPending}
                                    className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-2xl">chevron_left</span>
                                </button>
                                <div className="px-4 flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                                        Thời gian báo cáo
                                        {isPending && <Loader2 className="animate-spin size-3 text-emerald-600" />}
                                    </span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                                        {format(selectedDate, "MM / yyyy")}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleMonthChange(addMonths(selectedDate, 1))}
                                    disabled={isPending || isCurrentMonth}
                                    className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors disabled:opacity-50"
                                >
                                    <span className={cn("material-symbols-outlined text-2xl", 
                                        isCurrentMonth && "opacity-20"
                                    )}>chevron_right</span>
                                </button>
                                <div className="h-6 w-px bg-gray-100 dark:bg-slate-700 mx-1" />
                                <button
                                    onClick={() => handleMonthChange(new Date())}
                                    disabled={isPending || isCurrentMonth}
                                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all disabled:opacity-50"
                                >
                                    Hiện tại
                                </button>
                            </div>
                        </header>

                        {/* ── SECTION 1: Treasury (Always Persisted) ────── */}
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-gray-400 text-lg">account_balance_wallet</span>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ngân quỹ hiện tại (Lũy kế)</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <TreasuryCard label="Tiền mặt" icon="payments" amount={treasury.cashBalance} colorClass="bg-emerald-600 text-white" />
                                <TreasuryCard label="Ngân hàng" icon="account_balance" amount={treasury.bankBalance} colorClass="bg-sky-600 text-white" />
                                <TreasuryCard
                                    label="Tổng ngân quỹ"
                                    icon="savings"
                                    amount={totalTreasury}
                                    colorClass={totalTreasury >= 0 ? "bg-slate-800 dark:bg-slate-700 text-white" : "bg-red-600 text-white"}
                                />
                                <TreasuryCard
                                    label="Vốn lưu động"
                                    icon="inventory_2"
                                    amount={treasury.workingCapital}
                                    colorClass="bg-indigo-600 text-white"
                                />
                            </div>
                        </section>

                        {/* ── Reorder Alert ──────────────────────────── */}
                        <ReorderAlert items={lowStockItems} onCopy={handleCopyReorder} copied={reorderCopied} />

                        {/* ── Month-Bound Metrics (Soft Opacity Transition on Month Change) ── */}
                        <div className={cn("space-y-6 transition-opacity duration-200", isPending ? "opacity-60 pointer-events-none" : "opacity-100")}>
                            {/* ── SECTION 2: P&L tháng ─────────────────── */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-gray-400 text-lg">bar_chart</span>
                                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lãi / Lỗ tháng {currentMonthLabel}</h2>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                                    {/* Revenue */}
                                    <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Doanh thu</span>
                                            <span className="text-xl font-extrabold text-emerald-600">{formatCurrency(monthMetrics.totalRevenue)}</span>
                                        </div>
                                        <MetricRow label="Tiền sân" value={monthMetrics.courtRevenue} icon="sports_tennis" colorClass="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" />
                                        <MetricRow label="Bán hàng" value={monthMetrics.productRevenue} icon="point_of_sale" colorClass="bg-blue-50 dark:bg-blue-900/30 text-blue-600" subLabel={`Lãi gộp: ${formatCurrency(monthMetrics.productProfit)}`} />
                                    </div>

                                    {/* Expenses */}
                                    <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Chi phí vận hành</span>
                                            <span className="text-xl font-extrabold text-red-500">{formatCurrency(monthMetrics.fixedExpenses + monthMetrics.variableExpenses)}</span>
                                        </div>
                                        <MetricRow label="Cố định" value={monthMetrics.fixedExpenses} icon="home_work" colorClass="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" subLabel="Điện, nước, mặt bằng..." />
                                        <MetricRow label="Biến động" value={monthMetrics.variableExpenses} icon="shopping_cart" colorClass="bg-orange-50 dark:bg-orange-900/30 text-orange-500" subLabel="Đá, trà, vật tư..." />
                                    </div>

                                    {/* Net Profit (Accrual) */}
                                    <div className={cn(
                                        "rounded-2xl p-5 flex flex-col justify-between shadow-sm",
                                        monthMetrics.netProfit >= 0
                                            ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white"
                                            : "bg-gradient-to-br from-red-500 to-red-700 text-white"
                                    )}>
                                        <div>
                                            <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">Lợi nhuận ròng</p>
                                            <p className="text-[10px] opacity-60 font-medium">= Lãi sân + Lãi hàng hóa − Chi phí vận hành</p>
                                        </div>
                                        <div>
                                            <p className="text-4xl font-black tracking-tight mt-4">{formatCurrency(Math.abs(monthMetrics.netProfit))}</p>
                                            <div className="flex items-center gap-1.5 mt-2 opacity-80">
                                                <span className="material-symbols-outlined text-lg">
                                                    {monthMetrics.netProfit >= 0 ? "trending_up" : "trending_down"}
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {monthMetrics.netProfit >= 0 ? "Có lãi" : "Đang lỗ"}
                                                    {monthMetrics.totalRevenue > 0 && ` · ${Math.abs(Math.round((monthMetrics.netProfit / monthMetrics.totalRevenue) * 100))}%`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ── SECTION 3: Charts + Top Products ─────── */}
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <RevenueChart data={chartData} />
                                    <RecentExpenses items={recentExpenses} />
                                </div>
                                <div className="lg:col-span-1">
                                    <TopProducts products={topProducts} />
                                </div>
                            </section>
                        </div>

                    </div>
                </main>

                <div className="md:hidden z-50 sticky bottom-0 left-0 right-0 w-full mt-auto">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
}
