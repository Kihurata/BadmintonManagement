
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { Loader2, Plus, Trash2, Minus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { calculateRentalFee, PricingResult } from '@/lib/pricing';

// Helper to format time
const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

interface CheckoutFormProps {
    bookingId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

interface OrderItem {
    id: string; // product id
    name: string;
    unit: string;
    price: number;
    quantity: number;
}

export function CheckoutForm({ bookingId, onSuccess, onCancel }: CheckoutFormProps) {
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
    const [checkoutTime, setCheckoutTime] = useState(new Date());

    // POS State
    const [products, setProducts] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
    const [currentProductId, setCurrentProductId] = useState('');

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // Fetch Booking with full Court details for pricing
            const { data: bookingData } = await supabase
                .from('bookings')
                .select(`
                    *,
                    customers ( display_name:name, type, id ),
                    courts ( * ) 
                `)
                .eq('id', bookingId)
                .single();

            // Fetch Products
            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .gt('stock_quantity', 0) // Only show available items
                .order('product_name');

            if (bookingData) {
                setBooking(bookingData);
                setCheckoutTime(new Date());
            }
            if (productsData) {
                setProducts(productsData);
            }
            setLoading(false);
        }
        fetchData();
    }, [bookingId]);

    const handleAddItem = () => {
        if (!currentProductId) return;
        const product = products.find(p => p.id === currentProductId);
        if (!product) return;

        const existing = selectedItems.find(i => i.id === product.id);
        if (existing) {
            setSelectedItems(selectedItems.map(i =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setSelectedItems([...selectedItems, {
                id: product.id,
                name: product.product_name,
                unit: product.unit,
                price: product.current_sale_price,
                quantity: 1
            }]);
        }
        setCurrentProductId('');
    };

    const updateQuantity = (id: string, delta: number) => {
        setSelectedItems(selectedItems.map(i => {
            if (i.id === id) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : i;
            }
            return i;
        }));
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!booking) return <div className="p-4 text-center">Booking not found</div>;

    // --- Calculations ---
    const startTime = new Date(booking.start_time);
    const scheduledEndTime = new Date(booking.end_time);
    const actualEndTime = checkoutTime;

    // 1. Rental Fee (Dynamic Pricing)
    const pricingResult = calculateRentalFee(
        startTime,
        scheduledEndTime,
        booking.courts,
        booking.customers?.type || 'GUEST'
    );
    const rentalFee = pricingResult.rentalFee;

    // 2. Overtime Fee (Dynamic Pricing for Overtime period)
    let overtimeFee = 0;
    let overtimeMins = 0;

    if (actualEndTime > scheduledEndTime) {
        overtimeMins = differenceInMinutes(actualEndTime, scheduledEndTime);
        if (overtimeMins > 0) {
            const overtimePricing = calculateRentalFee(
                scheduledEndTime,
                actualEndTime,
                booking.courts,
                booking.customers?.type || 'GUEST'
            );
            overtimeFee = overtimePricing.rentalFee;
        }
    }

    // 3. Deposit
    const deposit = booking.deposit_amount || 0;

    // 4. Products Fee
    const productsFee = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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

            // 2. Create Invoice
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert([{
                    booking_id: booking.id,
                    customer_id: booking.customer_id,
                    total_amount: total,
                    payment_method: paymentMethod,
                    is_paid: true
                }])
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            // 3. Create Invoice Items & Update Inventory
            for (const item of selectedItems) {
                await supabase.from('invoice_items').insert([{
                    invoice_id: invoice.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    sale_price: item.price
                }]);

                await supabase.from('inventory_logs').insert([{
                    product_id: item.id,
                    type: 'SALE',
                    quantity: -item.quantity,
                    reason: `Bán kèm Booking #${booking.id.slice(0, 4)}`
                }]);

                const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.id).single();
                if (prod) {
                    await supabase.from('products').update({ stock_quantity: prod.stock_quantity - item.quantity }).eq('id', item.id);
                }
            }

            onSuccess();

        } catch (err: any) {
            console.error(err);
            alert('Lỗi thanh toán: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark font-sans w-full max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center px-4 pt-8 pb-4 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
                <button onClick={onCancel} className="text-secondary dark:text-gray-200 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
                </button>
                <h2 className="text-secondary dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
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

                {/* POS - Add Products */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h4 className="text-secondary dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-3">Dịch vụ đi kèm</h4>

                    <div className="flex gap-2 mb-4">
                        <div className="flex-1">
                            <Select value={currentProductId} onValueChange={setCurrentProductId}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Chọn món..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.product_name} ({formatCurrency(p.current_sale_price)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleAddItem} size="icon" className="bg-emerald-600 hover:bg-emerald-700 h-10 w-10">
                            <Plus className="size-5" />
                        </Button>
                    </div>

                    {/* Selected Items List */}
                    <div className="space-y-2">
                        {selectedItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                <div className="flex-1">
                                    <div className="font-bold text-sm">{item.name}</div>
                                    <div className="text-xs text-gray-500">{formatCurrency(item.price)} / {item.unit}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Minus className="size-3" /></button>
                                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Plus className="size-3" /></button>
                                    <button onClick={() => removeItem(item.id)} className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="size-4" /></button>
                                </div>
                            </div>
                        ))}
                        {selectedItems.length === 0 && <div className="text-center text-xs text-gray-400 py-2">Chưa chọn món nào</div>}
                    </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                    <h4 className="text-secondary dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-2">Chi tiết thanh toán</h4>

                    <div className="flex justify-between items-start text-sm">
                        <div className="flex flex-col">
                            <span className="text-secondary dark:text-gray-200">Tiền sân</span>
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
                        <div className="flex justify-between items-center text-sm text-red-500">
                            <span className="font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">warning</span> Quá giờ ({overtimeMins}p)
                            </span>
                            <span className="font-bold">{formatCurrency(overtimeFee)}</span>
                        </div>
                    )}

                    {productsFee > 0 && (
                        <div className="flex justify-between items-center text-sm text-blue-600">
                            <span className="font-medium">Tiền dịch vụ</span>
                            <span className="font-bold">{formatCurrency(productsFee)}</span>
                        </div>
                    )}

                    {deposit > 0 && (
                        <div className="flex justify-between items-center text-sm text-gray-500">
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
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Phương thức thanh toán</p>
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
                                value="TRANSFER"
                                checked={paymentMethod === 'TRANSFER'}
                                onChange={() => setPaymentMethod('TRANSFER')}
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
            <div className="absolute bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 pb-10 z-30">
                <button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-[#0ca048] active:bg-[#0a8a3e] text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70"
                >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            <span>Thanh toán</span>
                            <span className="material-symbols-outlined font-bold">check_circle</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
