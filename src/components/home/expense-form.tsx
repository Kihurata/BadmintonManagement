"use client";

import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

type ExpenseType = "FIXED" | "VARIABLE";

const EXPENSE_TYPE_OPTIONS: { value: ExpenseType; label: string; icon: string; description: string }[] = [
    {
        value: "FIXED",
        label: "Cố định",
        icon: "home_work",
        description: "Điện, nước, wifi, mặt bằng...",
    },
    {
        value: "VARIABLE",
        label: "Biến động",
        icon: "shopping_cart",
        description: "Đá, trà, vật tư, sửa chữa...",
    },
];

const QUICK_TITLES: Record<ExpenseType, string[]> = {
    FIXED: ["Tiền điện", "Tiền nước", "Tiền wifi", "Tiền mặt bằng"],
    VARIABLE: ["Mua đá", "Mua trà", "Sửa chữa", "Vật tư"],
};

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
    const [type, setType] = useState<ExpenseType>("VARIABLE");
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Vui lòng nhập tên khoản chi.");
            return;
        }

        const parsedAmount = parseFloat(amount.replace(/\./g, ""));
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            setError("Vui lòng nhập số tiền hợp lệ.");
            return;
        }

        setLoading(true);
        try {
            const { error: insertError } = await supabase.from("expenses").insert([
                {
                    title: title.trim(),
                    type,
                    amount: parsedAmount,
                    expense_date: expenseDate,
                    note: note.trim() || null,
                    payment_method: paymentMethod,
                },
            ]);

            if (insertError) throw new Error(insertError.message);

            setSuccess(true);
            setTimeout(() => onSuccess(), 900);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // Format amount display (e.g. 1000000 → 1.000.000)
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");
        if (raw === "") { setAmount(""); return; }
        const formatted = parseInt(raw, 10).toLocaleString("vi-VN");
        setAmount(formatted);
    };

    if (success) {
        return (
            <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-2xl flex flex-col items-center justify-center h-64 gap-4">
                <div className="size-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-emerald-600">Đã ghi nhận chi phí!</h3>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-2xl overflow-hidden flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex shrink-0 items-center px-4 pt-6 pb-4 border-b border-gray-100 dark:border-white/10">
                <button
                    onClick={onCancel}
                    className="text-black dark:text-gray-200 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-black dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                    Nhập chi phí
                </h2>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/40">
                        {error}
                    </div>
                )}

                {/* Expense Type Toggle */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Loại chi phí</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {EXPENSE_TYPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    setType(opt.value);
                                    setTitle("");
                                }}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-3.5 rounded-xl border-2 text-left transition-all",
                                    type === opt.value
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                        : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300"
                                )}
                            >
                                <span
                                    className={cn(
                                        "material-symbols-outlined text-xl",
                                        type === opt.value ? "text-emerald-600" : "text-gray-400"
                                    )}
                                >
                                    {opt.icon}
                                </span>
                                <span className={cn("font-bold text-sm", type === opt.value ? "text-emerald-700 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300")}>
                                    {opt.label}
                                </span>
                                <span className="text-[11px] text-gray-400 leading-tight">{opt.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Title Chips */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Tên khoản chi</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {QUICK_TITLES[type].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTitle(t)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-sm font-medium border transition-all",
                                    title === t
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                        : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        id="expense-title"
                        placeholder="Hoặc nhập tên khác..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <Label htmlFor="expense-amount" className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                        Số tiền (VNĐ)
                    </Label>
                    <div className="relative">
                        <input
                            id="expense-amount"
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={amount}
                            onChange={handleAmountChange}
                            className="w-full h-14 px-4 pr-14 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xl font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₫</span>
                    </div>
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                    <Label htmlFor="expense-date" className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                        Ngày phát sinh
                    </Label>
                    <input
                        id="expense-date"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Thanh toán từ</Label>
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
                        <label className="flex-1 cursor-pointer">
                            <input type="radio" name="expense-payment" value="CASH" checked={paymentMethod === "CASH"} onChange={() => setPaymentMethod("CASH")} className="peer sr-only" />
                            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-emerald-600 peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-base">payments</span>
                                <span className="text-sm font-bold">Tiền mặt</span>
                            </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input type="radio" name="expense-payment" value="BANK_TRANSFER" checked={paymentMethod === "BANK_TRANSFER"} onChange={() => setPaymentMethod("BANK_TRANSFER")} className="peer sr-only" />
                            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-emerald-600 peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-base">account_balance</span>
                                <span className="text-sm font-bold">Ngân hàng</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Note Input */}
                <div className="space-y-2">
                    <Label htmlFor="expense-note" className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                        Ghi chú <span className="text-gray-400 normal-case font-normal">(tuỳ chọn)</span>
                    </Label>
                    <textarea
                        id="expense-note"
                        rows={2}
                        placeholder="Thêm ghi chú nếu cần..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                    />
                </div>
            </form>

            {/* Footer CTA */}
            <div className="shrink-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 z-30">
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                    {loading ? (
                        <Loader2 className="animate-spin mr-2" />
                    ) : (
                        <span className="material-symbols-outlined mr-2">save</span>
                    )}
                    Lưu chi phí
                </Button>
            </div>
        </div>
    );
}
