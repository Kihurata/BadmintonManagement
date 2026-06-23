"use client";

import { useState, useEffect, useCallback } from "react";

import { Loader2 } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { StickyHeader } from "@/components/home/sticky-header";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/components/auth-provider";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopProducts } from "@/components/dashboard/top-products";
import { RecentExpenses, type RecentExpenseItem } from "@/components/dashboard/recent-expenses";

// ─── Types ────────────────────────────────────────────────────────────
interface Treasury {
    cashBalance: number;
    bankBalance: number;
    workingCapital: number; // SUM(stock_qty * latest_cost)
}

interface TopProduct {
    id: string;
    name: string;
    sales: number;
    revenue: number;
    profit: number;
    margin: number;
}

interface MonthMetrics {
    totalRevenue: number;
    courtRevenue: number;
    productRevenue: number;
    productProfit: number;   // revenue - COGS (Accrual)
    fixedExpenses: number;
    variableExpenses: number;
    netProfit: number;       // (courtRevenue + productProfit) - (fixed + variable)
}

interface LowStockItem {
    id: string;
    product_name: string;
    stock_quantity: number;
}


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

// ─── Main Page ────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { role, loading: roleLoading } = useUserRole();
    const router = useRouter();

    useEffect(() => {
        if (!roleLoading && role === 'STAFF') {
            router.replace('/?error=' + encodeURIComponent('Bạn không có quyền truy cập vào báo cáo tài chính.'));
        }
    }, [role, roleLoading, router]);

    const [loading, setLoading] = useState(true);
    const [treasury, setTreasury] = useState<Treasury>({ cashBalance: 0, bankBalance: 0, workingCapital: 0 });
    const [monthMetrics, setMonthMetrics] = useState<MonthMetrics>({
        totalRevenue: 0, courtRevenue: 0, productRevenue: 0, productProfit: 0,
        fixedExpenses: 0, variableExpenses: 0, netProfit: 0,
    });
    const [chartData, setChartData] = useState<{ name: string; fullDate: string; total: number }[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [recentExpenses, setRecentExpenses] = useState<RecentExpenseItem[]>([]);
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [reorderCopied, setReorderCopied] = useState(false);

    const [selectedDate, setSelectedDate] = useState(new Date());

    const currentMonthLabel = format(selectedDate, "MM/yyyy", { locale: vi });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard?date=${selectedDate.toISOString()}`);
            const resData = await res.json();
            if (res.ok && resData.success) {
                setTreasury(resData.treasury);
                setMonthMetrics(resData.monthMetrics);
                setChartData(resData.chartData);
                setTopProducts(resData.topProducts);
                setLowStockItems(resData.lowStockItems);
                setRecentExpenses(resData.recentExpenses);
            } else {
                console.error("Failed to fetch dashboard data:", resData.error);
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Reorder copy handler ──────────────────────────────────────────
    function handleCopyReorder() {
        const list = lowStockItems.map(i => `${i.product_name} (Còn ${i.stock_quantity})`).join(", ");
        const msg = `📦 Đặt hàng bổ sung:\n${list}`;
        navigator.clipboard.writeText(msg);
        setReorderCopied(true);
        setTimeout(() => setReorderCopied(false), 2500);
    }

    if (loading || roleLoading || role === 'STAFF') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="animate-spin text-emerald-600 size-10" />
            </div>
        );
    }

    const totalTreasury = treasury.cashBalance + treasury.bankBalance;

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
                                    onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                                    className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-2xl">chevron_left</span>
                                </button>
                                <div className="px-4 flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">Thời gian báo cáo</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                                        {format(selectedDate, "MM / yyyy")}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                                    className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                                    disabled={format(selectedDate, "MM/yyyy") === format(new Date(), "MM/yyyy")}
                                >
                                    <span className={cn("material-symbols-outlined text-2xl", 
                                        format(selectedDate, "MM/yyyy") === format(new Date(), "MM/yyyy") && "opacity-20"
                                    )}>chevron_right</span>
                                </button>
                                <div className="h-6 w-px bg-gray-100 dark:bg-slate-700 mx-1" />
                                <button
                                    onClick={() => setSelectedDate(new Date())}
                                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                >
                                    Hiện tại
                                </button>
                            </div>
                        </header>

                        {/* ── SECTION 1: Treasury ───────────────────── */}
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
                </main>

                <div className="md:hidden z-50 sticky bottom-0 left-0 right-0 w-full mt-auto">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
}
