import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export interface InvoiceItemSummary {
    name: string;
    quantity: number;
    price: number;
    unit?: string;
}

interface InvoiceSummaryCardProps {
    rentalFee: number;
    overtimeFee?: number;
    overtimeMins?: number;
    itemsFee: number;
    deposit: number;
    totalAmount: number;
    prepaidAmount?: number;
    
    // Optional rendering details
    items?: InvoiceItemSummary[];
    startTime?: string | Date;
    endTime?: string | Date;
    morningHours?: number;
    eveningHours?: number;
    isQuickSale?: boolean;
    showItemsList?: boolean;
}

export function InvoiceSummaryCard({
    rentalFee,
    overtimeFee = 0,
    overtimeMins = 0,
    itemsFee,
    deposit,
    totalAmount,
    prepaidAmount = 0,
    items = [],
    startTime,
    endTime,
    morningHours = 0,
    eveningHours = 0,
    isQuickSale = false,
    showItemsList = true
}: InvoiceSummaryCardProps) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
            <h4 className="text-black dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-2">
                Chi tiết thanh toán
            </h4>

            {/* Court / Time details */}
            {!isQuickSale && startTime && (
                <div className="flex justify-between items-start text-sm">
                    <div className="flex flex-col">
                        <span className="text-black dark:text-gray-200">Tiền sân</span>
                        <span className="text-[10px] text-gray-400">
                            {format(new Date(startTime), 'HH:mm')} - {endTime ? format(new Date(endTime), 'HH:mm') : '---'}
                            {((morningHours > 0 || eveningHours > 0)) && (
                                <span className="ml-1">
                                    ({morningHours > 0 && `${morningHours.toFixed(1)}h sáng `}
                                    {eveningHours > 0 && `${eveningHours.toFixed(1)}h tối`})
                                </span>
                            )}
                        </span>
                    </div>
                    <span className="font-bold">{formatCurrency(rentalFee)}</span>
                </div>
            )}

            {/* Overtime Fee */}
            {overtimeFee > 0 && (
                <div className="flex justify-between items-start text-sm text-red-500">
                    <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">warning</span> 
                            Quá giờ {overtimeMins > 0 ? `(${overtimeMins}p)` : ''}
                        </span>
                    </div>
                    <span className="font-bold">{formatCurrency(overtimeFee)}</span>
                </div>
            )}

            {/* Products / Services list */}
            {itemsFee > 0 && (
                <div className="py-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center text-sm text-blue-600 mb-1">
                        <span className="font-medium">Tiền dịch vụ</span>
                        <span className="font-bold">{formatCurrency(itemsFee)}</span>
                    </div>
                    {showItemsList && items.length > 0 && (
                        <div className="space-y-1 pl-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-gray-500">
                                    <span>{item.name} {item.unit ? `(${item.unit})` : ''} x{item.quantity}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Deposit */}
            {deposit > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-500 border-t border-dashed border-gray-100 dark:border-gray-800 pt-2">
                    <span>Đã cọc trước</span>
                    <span>-{formatCurrency(deposit)}</span>
                </div>
            )}

            {/* Prepaid Amount */}
            {prepaidAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-emerald-600 border-t border-dashed border-gray-100 dark:border-gray-800 pt-2">
                    <span>Đã thanh toán trước</span>
                    <span>-{formatCurrency(prepaidAmount)}</span>
                </div>
            )}

            {/* Total Amount */}
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="flex justify-between items-end">
                <span className="text-base font-bold">
                    {prepaidAmount > 0 ? 'Còn lại phải thu' : 'Tổng cộng'}
                </span>
                <span className="text-2xl font-extrabold text-primary">
                    {formatCurrency(prepaidAmount > 0 ? Math.max(0, totalAmount - prepaidAmount) : totalAmount)}
                </span>
            </div>
        </div>
    );
}
