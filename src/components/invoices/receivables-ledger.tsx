'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { InvoiceDetailDialog } from '@/components/invoices/invoice-detail-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Share2, ArrowRight } from 'lucide-react';

export interface Invoice {
    id: string;
    customer_name: string;
    date: string;
    time: string;
    status: string; // 'PAID' | 'PENDING'
    summary: string; // e.g. "Sân 1 • 2 giờ"
    total: number;
    rawDate?: string;
    startTimeStr?: string;
    endTimeStr?: string;
}

interface Debtor {
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalDebt: number;
    invoiceCount: number;
    invoices: Invoice[];
}

export function ReceivablesLedger() {
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [loading, setLoading] = useState(true);

    // Debtor Modal State (Step 1: AutoCheckInPreviewModal style)
    const [modalDebtor, setModalDebtor] = useState<Debtor | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

    // Export Modal & Format State
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'SUMMARY' | 'ITEMIZED'>('SUMMARY');
    const [copied, setCopied] = useState(false);

    // Export Column Selection Checkboxes (for ITEMIZED)
    const [colDate, setColDate] = useState(true);
    const [colStart, setColStart] = useState(true);
    const [colEnd, setColEnd] = useState(true);
    const [colSummary, setColSummary] = useState(true);
    const [colTotal, setColTotal] = useState(true);

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Invoice Detail Dialog State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const fetchUnpaidInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/invoices?unpaid=true');
            const resData = await res.json();

            if (res.ok && resData.success && resData.data) {
                const data = resData.data;
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

                    const startTime = inv.bookings?.start_time ? new Date(inv.bookings.start_time) : null;
                    const endTime = inv.bookings?.end_time ? new Date(inv.bookings.end_time) : null;
                    const duration = startTime && endTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : 0;
                    const displayDate = startTime || new Date(inv.created_at);

                    const startTimeStr = startTime ? startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                    const endTimeStr = endTime ? endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

                    acc[cId].invoices.push({
                        id: inv.id,
                        customer_name: inv.bookings?.guest_name && (inv.customers?.type === 'GUEST' || inv.customers?.name === 'Khách vãng lai')
                            ? `${inv.bookings.guest_name} (Vãng lai)`
                            : (inv.customers?.name || 'Khách vãng lai'),
                        date: displayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        time: displayDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        status: 'PENDING',
                        summary: inv.bookings?.courts?.court_name
                            ? `${inv.bookings.courts.court_name} • ${duration.toFixed(1)} giờ`
                            : 'Mua hàng POS',
                        total: inv.total_amount,
                        rawDate: displayDate.toISOString(),
                        startTimeStr,
                        endTimeStr,
                    });

                    return acc;
                }, {} as Record<string, Debtor>);

                // Sort by highest debt first
                const sortedDebtors = (Object.values(grouped) as Debtor[]).sort((a, b) => b.totalDebt - a.totalDebt);
                setDebtors(sortedDebtors);
            }
        } catch (err) {
            console.error("Error fetching unpaid invoices:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUnpaidInvoices();
    }, []);

    // Filter modal invoices by selected month
    const availableMonths = useMemo(() => {
        if (!modalDebtor) return [];
        const months = new Set<string>();
        for (const inv of modalDebtor.invoices) {
            if (inv.rawDate) {
                months.add(inv.rawDate.substring(0, 7)); // YYYY-MM
            }
        }
        return Array.from(months).sort().reverse();
    }, [modalDebtor]);

    const filteredInvoices = useMemo(() => {
        if (!modalDebtor) return [];
        if (selectedMonth === 'ALL') return modalDebtor.invoices;
        return modalDebtor.invoices.filter(inv => inv.rawDate && inv.rawDate.startsWith(selectedMonth));
    }, [modalDebtor, selectedMonth]);

    const filteredTotalDebt = useMemo(() => {
        return filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    }, [filteredInvoices]);

    const monthLabel = useMemo(() => {
        if (selectedMonth === 'ALL') return 'tất cả các tháng';
        const [y, m] = selectedMonth.split('-');
        return `Tháng ${m}/${y}`;
    }, [selectedMonth]);

    // Generated export text for copy tool
    const exportText = useMemo(() => {
        if (!modalDebtor || filteredInvoices.length === 0) return '';

        if (exportType === 'SUMMARY') {
            return `[TIỀN SÂN - ${monthLabel.toUpperCase()}]\nKhách hàng: ${modalDebtor.customerName}${modalDebtor.customerPhone ? ` (${modalDebtor.customerPhone})` : ''}\nSố ca / hóa đơn: ${filteredInvoices.length} ca\nTổng tiền nợ: ${formatCurrency(filteredTotalDebt)}`;
        }

        // ITEMIZED export
        const lines = filteredInvoices.map((inv) => {
            const parts = [];
            if (colDate) parts.push(inv.date);
            if (colStart && inv.startTimeStr) parts.push(inv.startTimeStr);
            if (colEnd && inv.endTimeStr) parts.push(`- ${inv.endTimeStr}`);
            if (colSummary) parts.push(inv.summary);
            if (colTotal) parts.push(formatCurrency(inv.total));
            return `- ${parts.join(' | ')}`;
        });

        return `[CHI TIẾT CÔNG NỢ - ${monthLabel.toUpperCase()}]\nKhách hàng: ${modalDebtor.customerName}\n${lines.join('\n')}\n-----------------------------------\nTỔNG CỘNG: ${formatCurrency(filteredTotalDebt)}`;
    }, [modalDebtor, filteredInvoices, monthLabel, exportType, colDate, colStart, colEnd, colSummary, colTotal, filteredTotalDebt]);

    const handleCopyText = async () => {
        if (!exportText) return;
        try {
            await navigator.clipboard.writeText(exportText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            alert('Lỗi khi sao chép: ' + (err as Error).message);
        }
    };

    const openPaymentModal = (debtor: Debtor, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
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
                    setModalDebtor(null);
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
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="animate-spin text-emerald-600 size-8 mb-2" />
                <span className="text-sm">Đang tải dữ liệu công nợ...</span>
            </div>
        );
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
                    <p className="text-sm font-medium text-slate-500 mt-1">Tổng công nợ chưa thu</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-rose-600">
                        {formatCurrency(debtors.reduce((sum, d) => sum + d.totalDebt, 0))}
                    </h2>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-500 mt-1">Khách nợ</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{debtors.length} người</p>
                </div>
            </div>

            {/* Debtor List */}
            <div className="mt-4 flex flex-col gap-3">
                {debtors.map((debtor) => (
                    <div
                        key={debtor.customerId}
                        className="bg-white dark:bg-[#0d1b17] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                        onClick={() => {
                            setModalDebtor(debtor);
                            setSelectedMonth('ALL');
                        }}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="size-11 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-2xl font-bold">person</span>
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {debtor.customerName}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span>{debtor.customerPhone || 'Không có số ĐT'}</span>
                                    <span>•</span>
                                    <span className="font-semibold text-rose-600 dark:text-rose-400">{debtor.invoiceCount} hóa đơn nợ</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-gray-50 dark:border-white/5 pt-3 sm:pt-0 shrink-0">
                            <div className="text-left sm:text-right">
                                <p className="text-[10px] text-gray-400 font-medium">Nợ chưa thu</p>
                                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                                    {formatCurrency(debtor.totalDebt)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={(e) => openPaymentModal(debtor, e)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 h-9 px-3 shrink-0 shadow-sm text-xs"
                                >
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    <span>Thu nợ</span>
                                </Button>
                                <div className="size-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                    <ArrowRight className="size-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Debtor Invoices Modal (Step 1 AutoCheckInPreviewModal style) */}
            <Dialog open={modalDebtor !== null} onOpenChange={(open) => {
                if (!open) {
                    setModalDebtor(null);
                }
            }}>
                <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl border-none bg-white dark:bg-[#0d1b17] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {modalDebtor && (
                        <>
                            <DialogHeader className="border-b dark:border-white/5 pb-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-11 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-2xl font-bold">person</span>
                                    </div>
                                    <div>
                                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                            {modalDebtor.customerName}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-gray-500">
                                            {modalDebtor.customerPhone || 'Khách vãng lai'} • Danh sách hóa đơn chưa thanh toán
                                        </DialogDescription>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setExportModalOpen(true)}
                                    className="rounded-xl border-blue-200 hover:bg-blue-50 text-blue-600 dark:border-blue-900/30 dark:hover:bg-blue-950/20 dark:text-blue-400 text-xs h-9 px-3 gap-1.5"
                                >
                                    <Share2 className="size-3.5" />
                                    <span>Xuất báo nợ</span>
                                </Button>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto space-y-4 py-3">
                                {/* Month Selector */}
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Lọc theo tháng:</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white"
                                    >
                                        <option value="ALL">Tất cả các tháng ({modalDebtor.invoices.length} HĐ)</option>
                                        {availableMonths.map((mStr) => {
                                            const [y, m] = mStr.split('-');
                                            return (
                                                <option key={mStr} value={mStr}>
                                                    Tháng {m}/{y}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* 4 Stats Summary Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-400 font-semibold block">Số hóa đơn</span>
                                        <span className="text-lg font-bold text-gray-900 dark:text-white">{filteredInvoices.length} HĐ</span>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl text-center border border-rose-100 dark:border-rose-900/30">
                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block">Tổng nợ chưa thu</span>
                                        <span className="text-sm font-bold text-rose-700 dark:text-rose-400">{formatCurrency(filteredTotalDebt)}</span>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl text-center border border-amber-100 dark:border-amber-900/30">
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">Nợ trung bình / HĐ</span>
                                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                            {formatCurrency(filteredInvoices.length > 0 ? filteredTotalDebt / filteredInvoices.length : 0)}
                                        </span>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">Số điện thoại</span>
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 truncate block">
                                            {modalDebtor.customerPhone || 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                </div>

                                {/* Invoices Table / Cards */}
                                {filteredInvoices.length === 0 ? (
                                    <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center text-xs text-gray-500">
                                        Không có hóa đơn nợ nào trong khoảng thời gian đã chọn.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                            <span>Danh sách {filteredInvoices.length} hóa đơn chưa thanh toán:</span>
                                            <span className="text-[10px] font-normal text-gray-400">(Bấm vào dòng để xem chi tiết)</span>
                                        </span>
                                        <div className="max-h-64 overflow-y-auto border border-gray-100 dark:border-white/5 rounded-xl divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-black/20">
                                            {filteredInvoices.map((inv) => (
                                                <div
                                                    key={inv.id}
                                                    onClick={() => {
                                                        setSelectedInvoiceId(inv.id);
                                                        setDetailOpen(true);
                                                    }}
                                                    className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                                                >
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                                {inv.date} ({inv.time})
                                                            </span>
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                                                Chờ thanh toán
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-[11px]">{inv.summary}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm block">
                                                            {formatCurrency(inv.total)}
                                                        </span>
                                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline inline-flex items-center gap-0.5">
                                                            Chi tiết <ArrowRight className="size-3" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between pt-3 border-t dark:border-white/5">
                                <Button
                                    variant="outline"
                                    onClick={() => setModalDebtor(null)}
                                    className="rounded-xl h-10 px-4 text-xs"
                                >
                                    Đóng
                                </Button>
                                <Button
                                    onClick={() => openPaymentModal(modalDebtor)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5 text-xs font-semibold shadow-md active:scale-95 transition-all gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    <span>Thu nợ tất cả ({formatCurrency(modalDebtor.totalDebt)})</span>
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Export Debt Statement Dialog */}
            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                <DialogContent className="sm:max-w-[540px] p-6 rounded-2xl border-none bg-white dark:bg-[#0d1b17] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Share2 className="size-5 text-blue-500" />
                            <span>Xuất báo cáo công nợ gửi khách hàng</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Định dạng tin nhắn để gửi cho khách hàng qua Zalo / SMS / Messenger
                        </DialogDescription>
                    </DialogHeader>

                    {modalDebtor && (
                        <div className="space-y-4 py-2">
                            {/* Export Type Segmented Switch */}
                            <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                                <button
                                    onClick={() => setExportType('SUMMARY')}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${exportType === 'SUMMARY'
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Format 1: Tóm tắt tổng quan
                                </button>
                                <button
                                    onClick={() => setExportType('ITEMIZED')}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${exportType === 'ITEMIZED'
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Format 2: Chi tiết từng ca
                                </button>
                            </div>

                            {/* Column Selection Checkboxes (for ITEMIZED) */}
                            {exportType === 'ITEMIZED' && (
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl space-y-2 border border-gray-100 dark:border-white/5">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">Chọn cột hiển thị:</span>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={colDate} onChange={(e) => setColDate(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Ngày</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={colStart} onChange={(e) => setColStart(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Giờ BĐ</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={colEnd} onChange={(e) => setColEnd(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Giờ KT</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={colSummary} onChange={(e) => setColSummary(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Sân / Dịch vụ</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" checked={colTotal} onChange={(e) => setColTotal(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                            <span>Thành tiền</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Text Preview Monospace Box */}
                            <div className="relative">
                                <textarea
                                    readOnly
                                    rows={8}
                                    value={exportText}
                                    className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none custom-scrollbar"
                                />
                            </div>

                            {/* Export Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setExportModalOpen(false)}
                                    className="rounded-xl h-10 px-4 text-xs"
                                >
                                    Đóng
                                </Button>
                                <Button
                                    onClick={handleCopyText}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs font-semibold shadow-md active:scale-95 transition-all gap-1.5"
                                >
                                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                                    <span>{copied ? 'Đã sao chép!' : 'Sao chép tin nhắn'}</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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

            {/* Individual Item Inspection Dialog */}
            <InvoiceDetailDialog
                invoiceId={selectedInvoiceId}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onSuccess={() => {
                    fetchUnpaidInvoices();
                    setModalDebtor(null);
                }}
            />

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
