import { useState } from 'react';
import { formatCurrency } from "@/lib/utils";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";

interface Invoice {
    id: string;
    customer_name: string;
    date: string;
    time: string;
    status: string; // 'PAID' | 'PENDING'
    summary: string; // e.g. "Sân 1 • 2 giờ"
    total: number;
}

interface InvoiceListProps {
    invoices: Invoice[];
    loading: boolean;
    onRefresh?: () => void;
}

export function InvoiceList({ invoices, loading, onRefresh }: InvoiceListProps) {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const handleInvoiceClick = (id: string) => {
        setSelectedInvoiceId(id);
        setDetailOpen(true);
    };

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Đang tải dữ liệu...</div>;
    }

    if (invoices.length === 0) {
        return <div className="text-center py-10 text-gray-400">Chưa có hóa đơn nào.</div>;
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                {invoices.map((inv) => (
                    <div
                        key={inv.id}
                        onClick={() => handleInvoiceClick(inv.id)}
                        className="bg-white dark:bg-[#0d1b17] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 group active:scale-[0.99] transition-all duration-200 cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <span className="material-symbols-outlined text-xl">qr_code_2</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">{inv.customer_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">calendar_today</span> {inv.date}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${inv.status === 'PAID' || inv.status === 'COMPLETED'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50'
                                }`}>
                                {inv.status === 'PAID' || inv.status === 'COMPLETED' ? 'Đã thanh toán' : 'Chờ xử lý'}
                            </span>
                        </div>
                        <div className="flex justify-between items-end border-t border-gray-50 dark:border-gray-800 pt-3 mt-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {inv.summary}
                            </div>
                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                                {formatCurrency(inv.total)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <InvoiceDetailDialog
                invoiceId={selectedInvoiceId}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onSuccess={() => {
                    if (onRefresh) onRefresh();
                }}
            />
        </>
    );
}
