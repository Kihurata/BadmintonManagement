
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SummaryCard } from '@/components/invoices/summary-card';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Bell, User } from 'lucide-react'; // Using Lucide for header icons as fallback

export default function InvoicesPage() {
    const [filter, setFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'UNPAID'>('TODAY');
    const [invoices, setInvoices] = useState<any[]>([]);
    const [summary, setSummary] = useState({ revenue: 0, courtRevenue: 0, productRevenue: 0, count: 0, avg: 0 });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchInvoices = async () => {
        setLoading(true);
        const now = new Date();
        let start, end;
        let isUnpaid = false;

        // Determine Time Range or Filter
        if (filter === 'TODAY') {
            start = startOfDay(now).toISOString();
            end = endOfDay(now).toISOString();
        } else if (filter === 'WEEK') {
            start = startOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Monday start
            end = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
        } else if (filter === 'MONTH') {
            start = startOfMonth(now).toISOString();
            end = endOfMonth(now).toISOString();
        } else if (filter === 'UNPAID') {
            isUnpaid = true;
        }

        let query = supabase
            .from('invoices')
            .select(`
                id,
                total_amount,
                created_at,
                is_paid,
                customers ( name ),
                bookings (
                    courts ( court_name ),
                    start_time,
                    end_time
                ),
                invoice_items ( sale_price, quantity )
            `)
            .order('created_at', { ascending: false });

        if (isUnpaid) {
            query = query.eq('is_paid', false);
        } else if (start && end) {
            query = query.gte('created_at', start).lte('created_at', end);
        }

        const { data, error } = await query;

        if (data) {
            // Transform data for display
            const formattedInvoices = data.map((inv: any) => {
                const startTime = inv.bookings?.start_time ? new Date(inv.bookings.start_time) : null;
                const endTime = inv.bookings?.end_time ? new Date(inv.bookings.end_time) : null;
                const duration = startTime && endTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;

                const displayDate = startTime || new Date(inv.created_at);

                return {
                    id: inv.id,
                    customer_name: inv.customers?.name || 'Khách vãng lai',
                    date: displayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                    time: displayDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    status: inv.is_paid ? 'PAID' : 'PENDING',
                    summary: inv.bookings?.courts?.court_name
                        ? `${inv.bookings.courts.court_name} • ${duration.toFixed(1)} giờ`
                        : 'Mua hàng',
                    total: inv.total_amount
                };
            });
            setInvoices(formattedInvoices);

            // Calculate Summary
            let totalRevenue = 0;
            let totalProductRevenue = 0;

            data.forEach((inv: any) => {
                totalRevenue += inv.total_amount;

                // Calculate product revenue for this invoice
                const invProductRevenue = inv.invoice_items?.reduce((sum: number, item: any) => {
                    return sum + (item.sale_price * item.quantity);
                }, 0) || 0;

                totalProductRevenue += invProductRevenue;
            });

            const totalCourtRevenue = totalRevenue - totalProductRevenue;
            const count = data.length;
            const avg = count > 0 ? totalRevenue / count : 0;

            setSummary({
                revenue: totalRevenue,
                courtRevenue: totalCourtRevenue,
                productRevenue: totalProductRevenue,
                count: count,
                avg: avg
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    const handleCloseDay = async () => {
        if (!confirm('Bạn có chắc chắn muốn kết thúc ngày? Hệ thống sẽ tự động tạo hóa đơn cho các đơn chưa thanh toán.')) return;

        setGenerating(true);
        try {
            const res = await fetch('/api/invoices/auto-generate', {
                method: 'POST',
                body: JSON.stringify({ date: new Date() }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                alert(`Đã tạo thành công ${data.generated} hóa đơn.`);
                fetchInvoices(); // Refresh list
            } else {
                alert('Có lỗi xảy ra: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-sans text-midnight dark:text-gray-100 min-h-screen flex flex-col w-full">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between bg-background-light dark:bg-background-dark sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                            {/* Placeholder Avatar */}
                            <span className="material-symbols-outlined text-gray-500">person</span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-background-dark"></div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Xin chào, Quản lý</p>
                        <p className="text-sm font-semibold capitalize">
                            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCloseDay}
                        disabled={generating}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                        {generating ? 'Đang xử lý...' : (
                            <>
                                <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                                Kết thúc ngày
                            </>
                        )}
                    </button>
                    <div className="relative">
                        <button className="p-2 rounded-full bg-white dark:bg-[#18332c] shadow-sm text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-primary/20 transition-colors">
                            <Bell className="size-6" />
                        </button>
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#18332c]"></span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 px-6 pb-24 overflow-y-auto no-scrollbar">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Quản Lý Hóa Đơn</h1>

                {/* Filter Chips */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6 pb-1">
                    <button
                        onClick={() => setFilter('TODAY')}
                        className={`px-5 py-2.5 rounded-full font-medium shadow-sm whitespace-nowrap text-sm transition-transform active:scale-95 ${filter === 'TODAY'
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-white dark:bg-[#18332c] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Hôm nay
                    </button>
                    <button
                        onClick={() => setFilter('WEEK')}
                        className={`px-5 py-2.5 rounded-full font-medium shadow-sm whitespace-nowrap text-sm transition-transform active:scale-95 ${filter === 'WEEK'
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-white dark:bg-[#18332c] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Tuần này
                    </button>
                    <button
                        onClick={() => setFilter('MONTH')}
                        className={`px-5 py-2.5 rounded-full font-medium shadow-sm whitespace-nowrap text-sm transition-transform active:scale-95 ${filter === 'MONTH'
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-white dark:bg-[#18332c] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Tháng này
                    </button>
                    <button
                        onClick={() => setFilter('UNPAID')}
                        className={`px-5 py-2.5 rounded-full font-medium shadow-sm whitespace-nowrap text-sm transition-transform active:scale-95 flex items-center gap-1 ${filter === 'UNPAID'
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                            : "bg-white dark:bg-[#18332c] text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-50"
                            }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                        Chưa thanh toán
                    </button>
                </div>

                {/* Summary Card */}
                <SummaryCard
                    revenue={summary.revenue}
                    courtRevenue={summary.courtRevenue}
                    productRevenue={summary.productRevenue}
                    invoiceCount={summary.count}
                    avgOrderValue={summary.avg}
                />

                {/* List Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                        {filter === 'UNPAID' ? 'Cần thanh toán' : 'Hóa đơn gần đây'}
                    </h3>
                </div>

                {/* Invoice List */}
                <InvoiceList invoices={invoices} loading={loading} onRefresh={fetchInvoices} />

            </main>

            {/* Bottom Nav */}
            <BottomNav />

            {/* Safe Area Padding for mobile */}
            <style jsx global>{`
                .pb-safe-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 20px);
                }
            `}</style>
        </div>
    );
}
