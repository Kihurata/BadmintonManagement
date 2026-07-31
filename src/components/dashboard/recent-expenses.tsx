import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatCurrency, cn } from "@/lib/utils";

export interface RecentExpenseItem {
    id: string;
    date: string;           // ISO string
    label: string;          // Mô tả khoản chi
    amount: number;         // Tổng tiền
    category: "FIXED" | "VARIABLE" | "RESTOCK" | "FIXED_EXPENSE" | "VARIABLE_EXPENSE" | "INVENTORY_RESTOCK" | "INVOICE_PAYMENT";
    paymentMethod: "CASH" | "BANK_TRANSFER";
}

interface RecentExpensesProps {
    items: RecentExpenseItem[];
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; colorClass: string }> = {
    FIXED: {
        icon: "home_work",
        label: "Chi phí cố định",
        colorClass: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    },
    FIXED_EXPENSE: {
        icon: "home_work",
        label: "Chi phí cố định",
        colorClass: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    },
    VARIABLE: {
        icon: "shopping_cart",
        label: "Chi phí biến động",
        colorClass: "bg-orange-50 dark:bg-orange-900/20 text-orange-500",
    },
    VARIABLE_EXPENSE: {
        icon: "shopping_cart",
        label: "Chi phí biến động",
        colorClass: "bg-orange-50 dark:bg-orange-900/20 text-orange-500",
    },
    RESTOCK: {
        icon: "inventory_2",
        label: "Nhập hàng",
        colorClass: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500",
    },
    INVENTORY_RESTOCK: {
        icon: "inventory_2",
        label: "Nhập hàng",
        colorClass: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500",
    },
    INVOICE_PAYMENT: {
        icon: "receipt_long",
        label: "Thanh toán HD",
        colorClass: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    },
};

export function RecentExpenses({ items }: RecentExpensesProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Giao dịch gần đây</h3>
                {items.length > 0 && (
                    <span className="text-xs text-gray-400 font-medium">{items.length} khoản</span>
                )}
            </div>

            {items.length === 0 ? (
                <div className="px-6 pb-6">
                    <p className="text-gray-500 text-center py-4 text-sm">Chưa có giao dịch nào.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {items.map((item) => {
                        const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.VARIABLE;
                        const isIncome = item.category === "INVOICE_PAYMENT";
                        return (
                            <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                {/* Category icon */}
                                <span className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", cfg.colorClass)}>
                                    <span className="material-symbols-outlined text-base">{cfg.icon}</span>
                                </span>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.label}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-xs text-gray-400">
                                            {format(new Date(item.date), "dd/MM · HH:mm", { locale: vi })}
                                        </span>
                                        <span className="text-gray-200 dark:text-gray-700">·</span>
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                            item.paymentMethod === "CASH"
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                                                : "bg-sky-50 dark:bg-sky-900/20 text-sky-500"
                                        )}>
                                            {item.paymentMethod === "CASH" ? "Tiền mặt" : "Ngân hàng"}
                                        </span>
                                    </div>
                                </div>

                                {/* Amount */}
                                <span className={cn(
                                    "text-sm font-bold tabular-nums shrink-0",
                                    isIncome ? "text-emerald-600" : "text-red-500"
                                )}>
                                    {isIncome ? "+" : "-"}{formatCurrency(item.amount)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
