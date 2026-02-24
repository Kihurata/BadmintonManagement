"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TopProducts } from "@/components/dashboard/top-products";
import { DebtorList } from "@/components/dashboard/debtor-list";
import { Loader2 } from "lucide-react";
import { subMonths, format } from "date-fns";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        rentRevenue: 0,
        productRevenue: 0,
        cashRevenue: 0,
        bankRevenue: 0,
    });
    const [chartData, setChartData] = useState<{ name: string; fullDate: string; total: number }[]>([]);
    const [topProducts, setTopProducts] = useState<{ id: string; name: string; sales: number; revenue: number }[]>([]);
    const [debtors, setDebtors] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true);
            try {
                // 1. Fetch Paid Invoices for Metrics & Charts
                const { data: paidInvoices, error: paidError } = await supabase
                    .from("invoices")
                    .select(`
            id,
            total_amount,
            payment_method,
            created_at,
            invoice_items (
              sale_price,
              quantity,
              products ( id, product_name, is_packable, pack_price, unit_price, units_per_pack )
            )
          `)
                    .eq("is_paid", true);

                if (paidError) throw paidError;

                // 2. Fetch Unpaid Invoices for Debtors
                const { data: unpaidInvoices, error: unpaidError } = await supabase
                    .from("invoices")
                    .select(`
            id,
            total_amount,
            created_at,
            customers ( id, name, phone ),
            bookings ( start_time, courts ( court_name ) )
          `)
                    .eq("is_paid", false)
                    .order('created_at', { ascending: false });

                if (unpaidError) throw unpaidError;

                // --- Process Metrics ---
                let total = 0;
                let productTotal = 0;
                let cashTotal = 0;
                let bankTotal = 0;
                const productMap = new Map<string, { name: string; sales: number; revenue: number }>();
                const monthlyRevenue = new Map<string, number>();

                // Initialize last 6 months
                for (let i = 5; i >= 0; i--) {
                    const date = subMonths(new Date(), i);
                    const key = format(date, 'MM/yyyy');
                    monthlyRevenue.set(key, 0);
                }

                if (paidInvoices) {
                    paidInvoices.forEach((inv) => {
                        total += inv.total_amount;

                        if (inv.payment_method === "CASH") cashTotal += inv.total_amount;
                        else if (inv.payment_method === "BANK_TRANSFER") bankTotal += inv.total_amount;

                        // Product Logic
                        let invProductRevenue = 0;
                        inv.invoice_items?.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                            const itemRevenue = item.sale_price * item.quantity;
                            invProductRevenue += itemRevenue;

                            if (item.products) {
                                const p = item.products;
                                const pid = p.id;

                                // Pack Logic Conversion
                                let quantitySold = item.quantity;
                                // Heuristic: If sold price is closer to pack price than unit price * 1.5, assume it's a pack
                                // OR better: reuse logic from checkout if possible, but here we only have price.
                                // If is_packable and price >= pack_price (or significantly higher than unit_price), we treat as pack.
                                // Simple check: if unit_price exists and sale_price > unit_price * 1.5, likely a pack.
                                if (p.is_packable && p.units_per_pack > 1) {
                                    const isPackSale = item.sale_price > (p.unit_price * 1.2); // Margin of error
                                    if (isPackSale) {
                                        quantitySold = item.quantity * p.units_per_pack;
                                    }
                                }

                                const current = productMap.get(pid) || { name: p.product_name, sales: 0, revenue: 0 };
                                productMap.set(pid, {
                                    ...current,
                                    sales: current.sales + quantitySold,
                                    revenue: current.revenue + itemRevenue
                                });
                            }
                        });
                        productTotal += invProductRevenue;

                        // Monthly Revenue
                        const monthKey = format(new Date(inv.created_at), 'MM/yyyy');
                        if (monthlyRevenue.has(monthKey)) {
                            monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + inv.total_amount);
                        }
                    });
                }

                setMetrics({
                    totalRevenue: total,
                    rentRevenue: total - productTotal,
                    productRevenue: productTotal,
                    cashRevenue: cashTotal,
                    bankRevenue: bankTotal,
                });

                // Chart Data
                const chart = Array.from(monthlyRevenue.entries()).map(([name, total]) => ({
                    name: name.split('/')[0],
                    fullDate: name,
                    total
                }));
                setChartData(chart);

                // Top Products
                const top = Array.from(productMap.entries())
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => b.sales - a.sales)
                    .slice(0, 5);
                setTopProducts(top);

                // --- Process Debtors ---
                if (unpaidInvoices) {
                    const debtorMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any

                    unpaidInvoices.forEach((inv: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                        const cid = inv.customers?.id || 'unknown';
                        const cname = inv.customers?.name || 'Khách vãng lai';

                        if (!debtorMap.has(cid)) {
                            debtorMap.set(cid, {
                                customerId: cid,
                                customerName: cname,
                                phone: inv.customers?.phone,
                                totalDebt: 0,
                                invoiceCount: 0,
                                invoices: []
                            });
                        }

                        const debtor = debtorMap.get(cid);
                        debtor.totalDebt += inv.total_amount;
                        debtor.invoiceCount += 1;

                        // Use booking start time if available, otherwise invoice creation time
                        const displayDate = inv.bookings?.start_time || inv.created_at;

                        debtor.invoices.push({
                            id: inv.id,
                            created_at: displayDate, // Use displayDate here
                            total_amount: inv.total_amount,
                            summary: inv.bookings?.courts?.court_name
                        });
                    });

                    setDebtors(Array.from(debtorMap.values()));
                }

            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="animate-spin text-emerald-600 size-10" />
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark h-screen overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
            <Sidebar />

            <div className="flex-1 flex flex-col md:pl-64 transition-all overflow-hidden relative">
                <main className="flex-1 overflow-y-auto w-full p-6 md:p-10 pb-24 md:pb-10 no-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <header className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard Overview</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Welcome back! Here&apos;s what&apos;s happening at your badminton center.</p>
                        </header>

                        {/* Metrics */}
                        <MetricGrid {...metrics} />

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Chart + Debtors - Takes up 2 columns */}
                            <div className="lg:col-span-2 space-y-8">
                                <RevenueChart data={chartData} />
                                <DebtorList debtors={debtors} />
                            </div>

                            {/* Top Products - Takes up 1 column */}
                            <div className="lg:col-span-1">
                                <TopProducts products={topProducts} />
                            </div>
                        </div>
                    </div>
                </main>

                {/* Mobile Nav (if viewed on mobile) */}
                <div className="md:hidden flex-none z-50">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
}
