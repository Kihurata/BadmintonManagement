import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateRentalFee } from '@/lib/pricing';
import { InvoiceSummaryCard, type InvoiceItemSummary } from '@/components/invoices/invoice-summary-card';
import { PaymentSelector } from '@/components/invoices/payment-selector';
import { formatCurrency } from '@/lib/utils';
import { formatSplitBreakdownZaloText } from '@/lib/invoice-utils';
import type { InvoiceSplitDetails } from '@/server/repositories/split-repo';

interface CheckoutFormProps {
    bookingId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function CheckoutForm({ bookingId, onSuccess, onCancel }: CheckoutFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [invoice, setInvoice] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [checkoutTime, setCheckoutTime] = useState(new Date());

    // Split details state
    const [splitDetails, setSplitDetails] = useState<InvoiceSplitDetails | null>(null);
    const [copiedZalo, setCopiedZalo] = useState(false);
    const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

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
                            display_name: data.booking.guest_name && (data.booking.customers.type === 'GUEST' || data.booking.customers.name === 'Khách vãng lai')
                                ? `${data.booking.guest_name} (Vãng lai)`
                                : data.booking.customers.name
                        } : null
                    };
                    setBooking(mappedBooking);
                    setCheckoutTime(new Date());

                    if (data.invoice) {
                        setInvoice(data.invoice);
                        setInvoiceItems(data.invoiceItems || []);

                        // Fetch split breakdown
                        try {
                            const splitRes = await fetch(`/api/v1/invoices/${data.invoice.id}/split`);
                            const splitData = await splitRes.json();
                            if (splitRes.ok && splitData.success && splitData.data) {
                                setSplitDetails(splitData.data);
                            }
                        } catch (sErr) {
                            console.error("Error loading split details:", sErr);
                        }
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

    const handleToggleMemberPayment = async (attendanceId: string, currentPaid: boolean) => {
        if (!invoice) return;
        setUpdatingPaymentId(attendanceId);
        try {
            const res = await fetch(`/api/v1/invoices/${invoice.id}/split`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_payment',
                    attendanceId,
                    isPaid: !currentPaid,
                    paymentMethod: 'CASH',
                }),
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                const splitRes = await fetch(`/api/v1/invoices/${invoice.id}/split`);
                const splitData = await splitRes.json();
                if (splitRes.ok && splitData.success && splitData.data) {
                    setSplitDetails(splitData.data);
                }
            }
        } catch (err) {
            console.error("Error updating member payment:", err);
        } finally {
            setUpdatingPaymentId(null);
        }
    };

    const handleCopyZalo = () => {
        if (!splitDetails) return;
        const text = formatSplitBreakdownZaloText({
            courtName: booking?.courts?.court_name,
            startTime: booking?.start_time,
            endTime: actualEndTime,
            courtFee: rentalFee,
            splitDetails,
        });
        navigator.clipboard.writeText(text);
        setCopiedZalo(true);
        setTimeout(() => setCopiedZalo(false), 2500);
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

                {/* Dynamic Split Breakdown Card */}
                {splitDetails && splitDetails.attendees && splitDetails.attendees.length > 0 && (
                    <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-3 shadow-sm animate-in fade-in-50">
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Bảng chia tiền nhóm</h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        {splitDetails.attendees.length} người chơi tham gia
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleCopyZalo}
                                className="h-8 px-2.5 text-xs font-semibold border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 flex items-center gap-1.5"
                            >
                                {copiedZalo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedZalo ? 'Đã chép Zalo!' : 'Sao chép Zalo'}
                            </Button>
                        </div>

                        {/* Pool Calculation Header */}
                        <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Chi phí chung (Sân + Đồ chung):</span>
                                <span className="font-semibold text-foreground">
                                    {formatCurrency(splitDetails.summary.shared_pool_total)}
                                </span>
                            </div>
                            <div className="flex justify-between font-bold text-blue-700 dark:text-blue-300">
                                <span>Mỗi người chia đều:</span>
                                <span>{formatCurrency(splitDetails.summary.per_person_shared)}</span>
                            </div>
                        </div>

                        {/* Attendees Breakdown Table */}
                        <div className="space-y-1.5 pt-1">
                            {splitDetails.attendees.map((att) => {
                                const isUpdating = updatingPaymentId === att.attendance_id;
                                const personalItems = splitDetails.items.filter(
                                    (i) => i.assigned_member_id === att.group_member_id
                                );

                                return (
                                    <div
                                        key={att.attendance_id}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-border/60 text-xs"
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                                                <span>{att.member_name}</span>
                                                {att.member_phone && att.member_phone !== 'N/A' && (
                                                    <span className="text-[10px] text-muted-foreground font-normal">
                                                        ({att.member_phone})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                Chung: {formatCurrency(att.shared_share)}
                                                {personalItems.length > 0 && (
                                                    <span> + Riêng: {formatCurrency(att.individual_total)}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-right">
                                                <div className="font-bold text-sm text-foreground">
                                                    {formatCurrency(att.total_due)}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={isUpdating}
                                                onClick={() =>
                                                    handleToggleMemberPayment(att.attendance_id, att.is_paid)
                                                }
                                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                                    att.is_paid
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                                                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                                                }`}
                                                title="Nhấn để đổi trạng thái thanh toán"
                                            >
                                                {isUpdating ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : att.is_paid ? (
                                                    '✓ Đã trả'
                                                ) : (
                                                    'Chưa trả'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Payment Selector */}
                <PaymentSelector
                    totalAmount={dueAmount}
                    qrDescription={`Thanh toan san ${booking?.courts?.court_name || ''}`}
                    paymentMethod={paymentMethod}
                    onChangePaymentMethod={setPaymentMethod}
                />
            </div>

            {/* Bottom Button */}
            <div className="shrink-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 z-30 flex gap-2">
                <Button
                    variant="outline"
                    className="h-12 px-4 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 font-bold rounded-xl flex items-center justify-center gap-1.5"
                    onClick={() => {
                        onCancel();
                        router.push(`/invoices?tab=GROUPS&invoiceId=${invoice?.id || ''}&customerId=${booking?.customer_id || ''}`);
                    }}
                >
                    <Users className="w-5 h-5" />
                    Chia tiền nhóm
                </Button>
                <Button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-emerald-600/20"
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
