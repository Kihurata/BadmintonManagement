
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { calculateRentalFee } from '@/lib/pricing';

interface CheckoutFormProps {
    bookingId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function CheckoutForm({ bookingId, onSuccess, onCancel }: CheckoutFormProps) {
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [invoice, setInvoice] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [checkoutTime, setCheckoutTime] = useState(new Date());

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // 1. Fetch Booking
            const { data: bookingData } = await supabase
                .from('bookings')
                .select(`*, customers ( display_name:name, type, id ), courts ( * )`)
                .eq('id', bookingId)
                .single();

            if (bookingData) {
                setBooking(bookingData);
                setCheckoutTime(new Date());

                // 2. Fetch Invoice
                const { data: inv } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .maybeSingle();

                if (inv) {
                    setInvoice(inv);
                    // 3. Fetch Items
                    const { data: items } = await supabase
                        .from('invoice_items')
                        .select('*, products (product_name, base_unit, pack_unit)')
                        .eq('invoice_id', inv.id);
                    setInvoiceItems(items || []);
                }
            }
            setLoading(false);
        }
        fetchData();
    }, [bookingId]);

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!booking) return <div className="p-4 text-center">Booking not found</div>;

    // --- Calculations ---
    const startTime = new Date(booking.start_time);
    const scheduledEndTime = new Date(booking.end_time);
    const actualEndTime = checkoutTime;

    // 1. Rental Fee
    const pricingResult = calculateRentalFee(
        startTime,
        scheduledEndTime,
        booking.courts,
        booking.customers?.type || 'GUEST'
    );
    const rentalFee = pricingResult.rentalFee;

    // 2. Overtime Fee (Placeholder)
    const overtimeFee = 0;
    const overtimeMins = 0;

    // 3. Deposit
    const deposit = booking.deposit_amount || 0;

    // 4. Products Fee (From fetched items)
    const productsFee = invoiceItems.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);

    // Total
    const total = rentalFee + overtimeFee + productsFee - deposit;

    const handleConfirmPayment = async () => {
        setLoading(true);

        try {
            // 1. Update Booking
            const { error: bookingError } = await supabase
                .from('bookings')
                .update({
                    status: 'COMPLETED',
                    actual_end_time: actualEndTime.toISOString(),
                    overtime_fee: overtimeFee,
                    total_court_fee: rentalFee,
                })
                .eq('id', booking.id);

            if (bookingError) throw bookingError;

            // 2. Update Invoice (or Create if missing - legacy support)
            if (invoice) {
                const { error: invoiceError } = await supabase
                    .from('invoices')
                    .update({
                        total_amount: total,
                        payment_method: paymentMethod,
                        is_paid: true
                    })
                    .eq('id', invoice.id);
                if (invoiceError) throw invoiceError;
            } else {
                // Create new invoice for legacy booking
                const { error: invoiceError } = await supabase
                    .from('invoices')
                    .insert([{
                        booking_id: booking.id,
                        customer_id: booking.customer_id,
                        total_amount: total,
                        payment_method: paymentMethod,
                        is_paid: true
                    }]);
                if (invoiceError) throw invoiceError;
            }

            onSuccess();

        } catch (err: unknown) {
            console.error(err);
            alert('Lỗi thanh toán: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark font-sans w-full max-w-md mx-auto relative">
            {/* Header */}
            <div className="flex items-center px-4 pt-8 pb-4 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
                <button onClick={onCancel} className="text-black dark:text-gray-200 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
                </button>
                <h2 className="text-black dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                    Thanh toán
                </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">

                {/* Court Info */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                    <div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Sân</div>
                        <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{booking.courts?.court_name}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Khách</div>
                        <div className="text-base font-bold text-emerald-800 dark:text-emerald-300">{booking.customers?.display_name}</div>
                        <div className="text-[10px] uppercase font-bold text-emerald-600">{booking.customers?.type === 'LOYAL' ? '(Thân thiết)' : '(Vãng lai)'}</div>
                    </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                    <h4 className="text-black dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-2">Chi tiết thanh toán</h4>

                    <div className="flex justify-between items-start text-sm">
                        <div className="flex flex-col">
                            <span className="text-black dark:text-gray-200">Tiền sân</span>
                            {(pricingResult.morningHours > 0 || pricingResult.eveningHours > 0) && (
                                <span className="text-[10px] text-gray-400">
                                    {pricingResult.morningHours > 0 && `${pricingResult.morningHours.toFixed(1)}h sáng `}
                                    {pricingResult.eveningHours > 0 && `${pricingResult.eveningHours.toFixed(1)}h tối`}
                                </span>
                            )}
                        </div>
                        <span className="font-bold">{formatCurrency(rentalFee)}</span>
                    </div>

                    {overtimeMins > 0 && (
                        <div className="flex justify-between items-start text-sm text-red-500">
                            <div className="flex flex-col">
                                <span className="font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">warning</span> Quá giờ ({overtimeMins}p)
                                </span>
                                {(overtimeFee > 0) && (
                                    <span className="text-[10px] text-red-400 pl-4">
                                        Phí tính theo giờ thực tế
                                    </span>
                                )}
                            </div>
                            <span className="font-bold">{formatCurrency(overtimeFee)}</span>
                        </div>
                    )}

                    {/* Products List (Read Only) */}
                    {invoiceItems.length > 0 && (
                        <div className="py-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center text-sm text-blue-600 mb-1">
                                <span className="font-medium">Dịch vụ ({invoiceItems.length})</span>
                                <span className="font-bold">{formatCurrency(productsFee)}</span>
                            </div>
                            <div className="space-y-1 pl-2">
                                {invoiceItems.map((item, idx) => {
                                    const unit = item.is_pack_sold ? item.products?.pack_unit : item.products?.base_unit;
                                    return (
                                        <div key={idx} className="flex justify-between text-xs text-gray-500">
                                            <span>{item.products?.product_name || item.product_name} ({unit}) x{item.quantity}</span>
                                            <span>{formatCurrency(item.sale_price * item.quantity)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {deposit > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-500 border-t border-dashed border-gray-100 dark:border-gray-800 pt-2">
                            <span>Đã cọc</span>
                            <span>-{formatCurrency(deposit)}</span>
                        </div>
                    )}

                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
                    <div className="flex justify-between items-end">
                        <span className="text-base font-bold">Tổng cộng</span>
                        <span className="text-2xl font-extrabold text-primary">{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="pt-2">
                    <p className="text-black text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Phương thức thanh toán</p>
                    <div className="flex bg-gray-200/50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="payment_method"
                                value="CASH"
                                checked={paymentMethod === 'CASH'}
                                onChange={() => setPaymentMethod('CASH')}
                                className="peer sr-only"
                            />
                            <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-gray-700 peer-checked:text-primary peer-checked:shadow-sm">
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
                                onChange={() => setPaymentMethod('BANK_TRANSFER')}
                                className="peer sr-only"
                            />
                            <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-gray-700 peer-checked:text-primary peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                                <span className="text-sm font-bold">Chuyển khoản</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Button */}
            <div className="absolute bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 pb-4 z-30">
                <Button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : (
                        <span className="material-symbols-outlined mr-2">check_circle</span>
                    )}
                    Thanh toán
                </Button>
            </div>
        </div>
    );
}
