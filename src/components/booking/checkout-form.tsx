import { useState, useEffect } from 'react';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateRentalFee } from '@/lib/pricing';
import { InvoiceSummaryCard, type InvoiceItemSummary } from '@/components/invoices/invoice-summary-card';
import { PaymentSelector } from '@/components/invoices/payment-selector';

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
            try {
                const res = await fetch(`/api/bookings/details?bookingId=${bookingId}`);
                const data = await res.json();
                if (res.ok && data.success) {
                    // Map customer layout for legacy compat
                    const mappedBooking = {
                        ...data.booking,
                        customers: data.booking.customers ? {
                            ...data.booking.customers,
                            display_name: data.booking.customers.name
                        } : null
                    };
                    setBooking(mappedBooking);
                    setCheckoutTime(new Date());

                    if (data.invoice) {
                        setInvoice(data.invoice);
                        setInvoiceItems(data.invoiceItems || []);
                    }
                }
            } catch (err) {
                console.error("Error loading checkout details:", err);
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
    const prepaidAmount = invoice?.paid_amount || 0;
    const dueAmount = Math.max(0, total - prepaidAmount);

    const handleConfirmPayment = async () => {
        setLoading(true);

        try {
            const response = await fetch('/api/bookings/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId: booking.id,
                    actualEndTime: actualEndTime.toISOString(),
                    overtimeFee,
                    rentalFee,
                    totalAmount: total,
                    paymentMethod,
                    customerId: booking.customer_id,
                }),
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || 'Thanh toán thất bại');
            }

            onSuccess();

        } catch (err: unknown) {
            console.error(err);
            alert('Lỗi thanh toán: ' + (err instanceof Error ? (err as Error).message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Format products list for InvoiceSummaryCard
    const formattedItems: InvoiceItemSummary[] = invoiceItems.map(item => ({
        name: item.products?.product_name || item.product_name,
        quantity: item.quantity,
        price: item.sale_price,
        unit: item.is_pack_sold ? item.products?.pack_unit : item.products?.base_unit
    }));

    return (
        <div className="flex flex-col h-full max-h-[100dvh] sm:max-h-[90vh] bg-background-light dark:bg-background-dark font-sans w-full max-w-md mx-auto sm:rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex shrink-0 items-center px-4 pt-8 pb-4 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-gray-800">
                <button onClick={onCancel} className="text-black dark:text-gray-200 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
                </button>
                <h2 className="text-black dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                    Thanh toán
                </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">

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

                {/* Invoice Summary Card */}
                <InvoiceSummaryCard
                    rentalFee={rentalFee}
                    overtimeFee={overtimeFee}
                    overtimeMins={overtimeMins}
                    itemsFee={productsFee}
                    deposit={deposit}
                    totalAmount={total}
                    prepaidAmount={prepaidAmount}
                    items={formattedItems}
                    startTime={startTime}
                    endTime={scheduledEndTime}
                    morningHours={pricingResult.morningHours}
                    eveningHours={pricingResult.eveningHours}
                />

                {/* Payment Selector */}
                <PaymentSelector
                    totalAmount={dueAmount}
                    qrDescription={`Thanh toan san ${booking?.courts?.court_name || ''}`}
                    paymentMethod={paymentMethod}
                    onChangePaymentMethod={setPaymentMethod}
                />
            </div>

            {/* Bottom Button */}
            <div className="shrink-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 z-30">
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
