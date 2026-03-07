'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { InvoiceList, Invoice } from '@/components/invoices/invoice-list';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

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

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    const openPaymentModal = (debtor: Debtor, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDebtor(debtor);
        setPaymentMethod('BANK_TRANSFER');
        setSuccessMessage(null);
        setPaymentModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!selectedDebtor) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/invoices/pay-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: selectedDebtor.customerId === 'guest' ? null : selectedDebtor.customerId,
                    payment_method: paymentMethod
                })
            });
            const data = await res.json();

            if (data.success) {
                setSuccessMessage(`Đã thu thành công ${formatCurrency(selectedDebtor.totalDebt)} từ ${selectedDebtor.customerName}`);
                fetchUnpaidInvoices();
                setTimeout(() => {
                    setPaymentModalOpen(false);
                    setSuccessMessage(null);
                }, 1500);
            } else {
                alert('Có lỗi xảy ra: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối khi thanh toán');
        } finally {
            setIsSubmitting(false);
        }
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
            <div className="flex items-center justify-between bg-white dark:bg-[#0d1b17] p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div>
                    <p className="text-sm font-medium text-slate-500 mt-1">Tổng công nợ</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-red-600">
                        {formatCurrency(debtors.reduce((sum, d) => sum + d.totalDebt, 0))}
                    </h2>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-500 mt-1">Khách nợ</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{debtors.length}</p>
                </div>
            </div>

            {/* Debtor List */}
            <div className="mt-4 flex flex-col gap-4">
                {debtors.map((debtor) => {
                    const isExpanded = expandedCustomerId === debtor.customerId;
                    return (
                        <div key={debtor.customerId} className="flex flex-col bg-white dark:bg-[#0d1b17] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800">

                            {/* Debtor Header Row */}
                            <div
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                onClick={() => setExpandedCustomerId(isExpanded ? null : debtor.customerId)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-xl">person</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                            {debtor.customerName}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {debtor.customerPhone || 'Không có số ĐT'} • {debtor.invoiceCount} hóa đơn
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 justify-between md:justify-end border-t border-slate-100 dark:border-white/5 md:border-0 pt-4 md:pt-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Nợ chưa thu</p>
                                        <span className="text-xl font-bold text-red-600">
                                            {formatCurrency(debtor.totalDebt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => openPaymentModal(debtor, e)}
                                            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg flex items-center justify-center transition-colors"
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
                                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#11231e]/50">
                                    <p className="text-sm font-semibold text-slate-500 mb-4 pb-2 border-b border-gray-100 dark:border-white/5">Chi tiết hóa đơn nợ</p>
                                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        <InvoiceList invoices={debtor.invoices} loading={false} onRefresh={fetchUnpaidInvoices} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Payment Modal */}
            <Dialog open={paymentModalOpen} onOpenChange={(open) => {
                if (!open && !isSubmitting) setPaymentModalOpen(false);
            }}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800">
                    {successMessage ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                            </div>
                            <h3 className="text-xl font-bold text-center text-emerald-600 px-4 leading-relaxed">{successMessage}</h3>
                        </div>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-500">payments</span>
                                    Xác nhận thanh toán
                                </DialogTitle>
                                <DialogDescription className="text-gray-500 dark:text-gray-400">
                                    Thu toàn bộ công nợ của khách hàng <span className="font-bold text-gray-900 dark:text-white">{selectedDebtor?.customerName}</span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-6 flex flex-col gap-6">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center justify-center">
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Tổng tiền thanh toán</span>
                                    <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-500">
                                        {selectedDebtor ? formatCurrency(selectedDebtor.totalDebt) : formatCurrency(0)}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phương thức thanh toán</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${paymentMethod === 'BANK_TRANSFER'
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-500 hover:border-emerald-200'
                                                }`}
                                            onClick={() => setPaymentMethod('BANK_TRANSFER')}
                                        >
                                            <span className="material-symbols-outlined text-3xl mb-2">account_balance</span>
                                            <span className="font-semibold text-sm">Chuyển khoản</span>
                                            {paymentMethod === 'BANK_TRANSFER' && (
                                                <span className="absolute top-2 right-2 material-symbols-outlined text-emerald-500 text-sm font-bold">check_circle</span>
                                            )}
                                        </button>
                                        <button
                                            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${paymentMethod === 'CASH'
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-500 hover:border-emerald-200'
                                                }`}
                                            onClick={() => setPaymentMethod('CASH')}
                                        >
                                            <span className="material-symbols-outlined text-3xl mb-2">payments</span>
                                            <span className="font-semibold text-sm">Tiền mặt</span>
                                            {paymentMethod === 'CASH' && (
                                                <span className="absolute top-2 right-2 material-symbols-outlined text-emerald-500 text-sm font-bold">check_circle</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mt-2 w-full">
                                <button
                                    disabled={isSubmitting}
                                    className="w-full px-8 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
                                    onClick={confirmPayment}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                            Xác nhận Thu
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

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
