'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { InvoiceList, Invoice } from '@/components/invoices/invoice-list';

interface Debtor {
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalDebt: number;
    invoiceCount: number;
    invoices: Invoice[]; // The raw formatted invoice records
}

export function ReceivablesLedger() {
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

    const fetchUnpaidInvoices = async () => {
        setLoading(true);

        const { data } = await supabase
            .from('invoices')
            .select(`
                id,
                total_amount,
                created_at,
                is_paid,
                customer_id,
                customers ( name, phone ),
                bookings (
                    courts ( court_name ),
                    start_time,
                    end_time
                ),
                invoice_items ( sale_price, quantity )
            `)
            .eq('is_paid', false)
            .order('created_at', { ascending: false });

        if (data) {
            // Group by customer
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const grouped = data.reduce((acc: Record<string, Debtor>, inv: any) => {
                const cId = inv.customer_id || 'guest';
                if (!acc[cId]) {
                    acc[cId] = {
                        customerId: cId,
                        customerName: inv.customers?.name || 'Khách vãng lai',
                        customerPhone: inv.customers?.phone || '',
                        totalDebt: 0,
                        invoiceCount: 0,
                        invoices: []
                    };
                }

                acc[cId].totalDebt += inv.total_amount;
                acc[cId].invoiceCount += 1;

                // Format invoice for the InvoiceList component
                const startTime = inv.bookings?.start_time ? new Date(inv.bookings.start_time) : null;
                const endTime = inv.bookings?.end_time ? new Date(inv.bookings.end_time) : null;
                const duration = startTime && endTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;
                const displayDate = startTime || new Date(inv.created_at);

                acc[cId].invoices.push({
                    id: inv.id,
                    customer_name: inv.customers?.name || 'Khách vãng lai',
                    date: displayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                    time: displayDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    status: 'PENDING',
                    summary: inv.bookings?.courts?.court_name
                        ? `${inv.bookings.courts.court_name} • ${duration.toFixed(1)} giờ`
                        : 'Mua hàng',
                    total: inv.total_amount,
                    rawDate: displayDate.toISOString()
                });

                return acc;
            }, {});

            // Sort by highest debt first
            const sortedDebtors = Object.values(grouped).sort((a: Debtor, b: Debtor) => b.totalDebt - a.totalDebt);
            setDebtors(sortedDebtors as unknown as Debtor[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUnpaidInvoices();
    }, []);

    const handlePayAll = (debtor: Debtor, e: React.MouseEvent) => {
        e.stopPropagation();
        alert(`Tính năng thu công nợ tổng cho ${debtor.customerName} với số tiền ${formatCurrency(debtor.totalDebt)} đang được phát triển.`);
        // Note: Real implementation would create a consolidated payment or update all invoice statuses to PAID
    };

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Đang tải dữ liệu công nợ...</div>;
    }

    if (debtors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tuyệt vời!</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Không có khách hàng nào đang nợ.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Ledger Header */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                <div>
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-500 mt-1">Tổng công nợ</p>
                    <h2 className="text-2xl md:text-3xl font-black text-red-600 tracking-tight">
                        {formatCurrency(debtors.reduce((sum, d) => sum + d.totalDebt, 0))}
                    </h2>
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-500 mt-1">Khách nợ</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{debtors.length}</p>
                </div>
            </div>

            {/* Debtor List */}
            <div className="mt-4 flex flex-col gap-4">
                {debtors.map((debtor) => {
                    const isExpanded = expandedCustomerId === debtor.customerId;
                    return (
                        <div key={debtor.customerId} className="flex flex-col border-2 border-slate-900 dark:border-white bg-white dark:bg-[#0d1b17] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all">

                            {/* Debtor Header Row */}
                            <div
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                onClick={() => setExpandedCustomerId(isExpanded ? null : debtor.customerId)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-100 text-red-600 border-2 border-red-200 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined font-bold">person</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                                            {debtor.customerName}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500">
                                            {debtor.customerPhone || 'Không có số ĐT'} • {debtor.invoiceCount} hóa đơn
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 justify-between md:justify-end border-t-2 border-slate-100 md:border-0 pt-4 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Nợ chưa thu</p>
                                        <span className="text-xl font-black text-red-600">
                                            {formatCurrency(debtor.totalDebt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handlePayAll(debtor, e)}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 flex items-center justify-center transition-colors border-2 border-emerald-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                                            title="Thu nợ tất cả"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">payments</span>
                                        </button>
                                        <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Invoices */}
                            {isExpanded && (
                                <div className="p-4 border-t-2 border-slate-900 dark:border-white bg-slate-50 dark:bg-[#11231e]">
                                    <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest border-b-2 border-slate-200 pb-2">Chi tiết hóa đơn nợ</p>
                                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        <InvoiceList invoices={debtor.invoices} loading={false} onRefresh={fetchUnpaidInvoices} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #475569;
                }
            `}</style>
        </div>
    );
}
