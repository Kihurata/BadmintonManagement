import Image from 'next/image';
import { generateVietQrUrl } from '@/lib/invoice-utils';
import { formatCurrency } from '@/lib/utils';

interface PaymentSelectorProps {
    totalAmount: number;
    qrDescription: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    onChangePaymentMethod: (method: 'CASH' | 'BANK_TRANSFER') => void;
}

export function PaymentSelector({
    totalAmount,
    qrDescription,
    paymentMethod,
    onChangePaymentMethod
}: PaymentSelectorProps) {
    return (
        <div className="space-y-4">
            <p className="text-black dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1">
                Phương thức thanh toán
            </p>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                <label className="flex-1 cursor-pointer">
                    <input
                        type="radio"
                        name="payment_method"
                        value="CASH"
                        checked={paymentMethod === 'CASH'}
                        onChange={() => onChangePaymentMethod('CASH')}
                        className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-gray-700 peer-checked:text-emerald-600 peer-checked:shadow-sm">
                        <span className="material-symbols-outlined text-lg">payments</span>
                        <span className="text-sm font-bold">Tiền mặt</span>
                    </div>
                </label>
                <label className="flex-1 cursor-pointer">
                    <input
                        type="radio"
                        name="payment_method"
                        value="BANK_TRANSFER"
                        checked={paymentMethod === 'BANK_TRANSFER'}
                        onChange={() => onChangePaymentMethod('BANK_TRANSFER')}
                        className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-gray-700 peer-checked:text-emerald-600 peer-checked:shadow-sm">
                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                        <span className="text-sm font-bold">Chuyển khoản</span>
                    </div>
                </label>
            </div>

            {/* Render dynamic VietQR */}
            {paymentMethod === 'BANK_TRANSFER' && totalAmount > 0 && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative w-[280px] h-[280px] mx-auto max-w-full">
                        <Image
                            src={generateVietQrUrl(totalAmount, qrDescription)}
                            alt="QR Code Thanh Toán"
                            fill
                            className="object-contain rounded-lg"
                            unoptimized
                            sizes="280px"
                        />
                    </div>
                    <p className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full font-medium">
                        Số tiền cần chuyển: {formatCurrency(totalAmount)}
                    </p>
                </div>
            )}
        </div>
    );
}
