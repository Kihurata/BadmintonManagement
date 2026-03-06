'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InvoiceList, Invoice } from '@/components/invoices/invoice-list';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function TransactionHistory() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    const defaultStart = startOfMonth(now);
    const defaultEnd = endOfMonth(now);

    const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'));

    const fetchInvoices = async () => {
        setLoading(true);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const { data } = await supabase
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
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .order('created_at', { ascending: false });

        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedInvoices: Invoice[] = data.map((inv: any) => {
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
                    total: inv.total_amount,
                    rawDate: displayDate.toISOString()
                };
            });
            setInvoices(formattedInvoices);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchInvoices();
    }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-[#0d1b17] p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex-1 w-full flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Từ ngày</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-transparent border-0 border-b-2 border-slate-900 dark:border-white font-bold text-slate-900 dark:text-white px-0 py-2 focus:ring-0 focus:border-emerald-500 transition-colors"
                    />
                </div>
                <div className="flex-1 w-full flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Đến ngày</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-transparent border-0 border-b-2 border-slate-900 dark:border-white font-bold text-slate-900 dark:text-white px-0 py-2 focus:ring-0 focus:border-emerald-500 transition-colors"
                    />
                </div>
                <button
                    onClick={fetchInvoices}
                    className="w-full md:w-auto px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold tracking-wider uppercase text-sm sharp flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Lọc
                </button>
            </div>

            <div className="mt-2">
                <InvoiceList invoices={invoices} loading={loading} onRefresh={fetchInvoices} />
            </div>
        </div>
    );
}
