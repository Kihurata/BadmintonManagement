"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

interface InvoiceShort {
    id: string;
    created_at: string;
    total_amount: number;
    summary?: string;
}

interface Debtor {
    customerId: string;
    customerName: string;
    phone?: string;
    totalDebt: number;
    invoiceCount: number;
    invoices: InvoiceShort[];
}

interface DebtorListProps {
    debtors: Debtor[];
}

export function DebtorList({ debtors }: DebtorListProps) {
    const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);

    if (debtors.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Công nợ chưa thu</h3>
                <p className="text-gray-500 text-center py-4">Không có hóa đơn chưa thanh toán.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Công nợ chưa thu</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Khách hàng</th>
                                <th className="px-4 py-3 text-center">Số hóa đơn</th>
                                <th className="px-4 py-3 text-right rounded-r-lg">Tổng nợ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debtors.map((debtor) => (
                                <tr
                                    key={debtor.customerId}
                                    onClick={() => setSelectedDebtor(debtor)}
                                    className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {debtor.customerName}
                                        {debtor.phone && <div className="text-xs text-gray-500 font-normal">{debtor.phone}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                                            {debtor.invoiceCount}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-red-500">
                                        {formatCurrency(debtor.totalDebt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={!!selectedDebtor} onOpenChange={(open) => !open && setSelectedDebtor(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Chi tiết công nợ: {selectedDebtor?.customerName}</DialogTitle>
                        <DialogDescription>
                            Tổng nợ: <span className="font-bold text-red-500">{selectedDebtor ? formatCurrency(selectedDebtor.totalDebt) : 0}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {selectedDebtor?.invoices.map((inv) => (
                            <div key={inv.id} className="p-3 border rounded-lg border-gray-100 dark:border-gray-800 flex justify-between items-center group hover:border-emerald-200 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                        {format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm')}
                                    </p>
                                    {inv.summary && <p className="text-xs text-gray-500">{inv.summary}</p>}
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(inv.total_amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
