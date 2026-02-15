import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Loader2, Plus, Minus } from 'lucide-react';

interface BookingDetailsProps {
    bookingId: string;
    onClose: () => void;
    onCheckInSuccess: () => void;
    onCheckOutClick?: () => void;
}

export function BookingDetails({ bookingId, onClose, onCheckInSuccess, onCheckOutClick }: BookingDetailsProps) {
    // Original State
    const [booking, setBooking] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');

    // POS / Invoice State
    const [invoice, setInvoice] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Fetch Booking & Invoice & Products
    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // 1. Fetch Booking
            const { data: bookingData } = await supabase
                .from('bookings')
                .select(`*, customers ( name, phone, type ), courts ( court_name )`)
                .eq('id', bookingId)
                .single();

            if (bookingData) {
                setBooking(bookingData);

                // 2. Fetch Invoice (if exists)
                const { data: inv } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .maybeSingle(); // Use maybeSingle to avoid error if not found

                if (inv) {
                    setInvoice(inv);
                    // 3. Fetch Invoice Items
                    const { data: items } = await supabase
                        .from('invoice_items')
                        .select('*, products (product_name, base_unit, pack_unit)')
                        .eq('invoice_id', inv.id);
                    setInvoiceItems(items || []);
                }
            }

            // 4. Fetch Products (for POS)
            const { data: prodData } = await supabase
                .from('products')
                .select('*')
                .gt('stock_quantity', 0)
                .order('product_name');

            if (prodData) {
                const processedProducts: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
                prodData.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    // Base Unit
                    processedProducts.push({
                        key: `${p.id}-base`,
                        productId: p.id,
                        name: p.product_name,
                        unit: p.base_unit,
                        price: p.unit_price,
                        isPack: false,
                        deduct: 1
                    });
                    // Pack Unit
                    if (p.is_packable && p.pack_unit) {
                        const packPrice = p.pack_price || (p.unit_price * p.units_per_pack);
                        processedProducts.push({
                            key: `${p.id}-pack`,
                            productId: p.id,
                            name: `${p.product_name} (${p.pack_unit})`,
                            unit: p.pack_unit,
                            price: packPrice,
                            isPack: true,
                            deduct: p.units_per_pack
                        });
                    }
                });
                setProducts(processedProducts);
            }

            setLoading(false);
        }
        fetchData();
    }, [bookingId]);

    const refreshInvoice = async () => {
        if (!bookingId) return;
        const { data: inv } = await supabase.from('invoices').select('*').eq('booking_id', bookingId).maybeSingle();
        if (inv) {
            setInvoice(inv);
            const { data: items } = await supabase.from('invoice_items').select('*, products (product_name)').eq('invoice_id', inv.id);
            setInvoiceItems(items || []);
        }
    };

    const handleUpdateBookingTime = async () => {
        if (!editStartTime || !editEndTime) return;

        setActionLoading(true);
        // Combine date from original booking with new time
        const originalDate = new Date(booking.start_time);
        const dateStr = format(originalDate, 'yyyy-MM-dd');

        const newStart = new Date(`${dateStr}T${editStartTime}`);
        const newEnd = new Date(`${dateStr}T${editEndTime}`);

        const { error } = await supabase
            .from('bookings')
            .update({
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString()
            })
            .eq('id', bookingId);

        if (!error) {
            setBooking({
                ...booking,
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString()
            });
            setIsEditingTime(false);
        }
        setActionLoading(false);
    };

    const handleCheckIn = async () => {
        setActionLoading(true);

        // 1. Update Booking Status
        const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'CHECKED_IN' })
            .eq('id', bookingId);

        if (bookingError) {
            alert('Lỗi Check-in: ' + bookingError.message);
            setActionLoading(false);
            return;
        }

        // 2. Create Invoice (if not exists)
        if (!invoice) {
            const { error: invError } = await supabase
                .from('invoices')
                .insert([{
                    booking_id: bookingId,
                    customer_id: booking.customer_id,
                    total_amount: 0,
                    is_paid: false
                }]);

            if (invError) console.error('Error creating invoice:', invError);
            else await refreshInvoice();
        }

        setActionLoading(false);
        onCheckInSuccess();
    };

    const handleCancelBooking = async () => {
        if (!confirm('Bạn có chắc chắn muốn hủy đặt sân này không?')) return;

        setActionLoading(true);
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'CANCELLED' })
            .eq('id', bookingId);

        setActionLoading(false);
        if (!error) {
            onCheckInSuccess();
            onClose();
        }
    };

    // --- POS Handlers ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddItem = async (product: any) => {
        if (!invoice) return;

        // Optimistic
        const tempId = 'temp-' + Date.now();
        const optimisticItem = { id: tempId, product_id: product.productId, quantity: 1, sale_price: product.price, products: { product_name: product.name } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setInvoiceItems((prev: any[]) => [...prev, optimisticItem]);

        try {
            // Check existing
            const existing = invoiceItems.find(i => i.product_id === product.productId && Math.abs(i.sale_price - product.price) < 1);

            if (existing) {
                // Update
                await handleUpdateQuantity(existing, 1, product);
                // Remove optimistic duplicate since we delegated to update
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setInvoiceItems((prev: any[]) => prev.filter(i => i.id !== tempId));
            } else {
                // Insert
                const { error } = await supabase.from('invoice_items').insert([{
                    invoice_id: invoice.id,
                    product_id: product.productId,
                    quantity: 1,
                    sale_price: product.price,
                    is_pack_sold: product.isPack
                }]);
                if (error) throw error;
                await refreshInvoice();
            }
        } catch (err) {
            console.error(err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setInvoiceItems((prev: any[]) => prev.filter(i => i.id !== tempId));
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdateQuantity = async (item: any, delta: number, product: any) => {
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            if (confirm('Xóa món này khỏi hóa đơn?')) {
                await handleRemoveItem(item, product);
            }
            return;
        }

        // Optimistic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setInvoiceItems((prev: any[]) => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));

        try {
            const { error } = await supabase.from('invoice_items')
                .update({ quantity: newQty })
                .eq('id', item.id);

            if (error) throw error;

            // Manual Sync for UPDATE (Trigger only handles INSERT?) 
            // WAIT - The trigger `fn_auto_sync_inventory_v2` handles BOTH INSERT and UPDATE.
            // So we DO NOT need manual sync here anymore, unlike InvoiceDetailDialog where I was keeping it for safety/legacy.
            // Let's trust the Trigger `fn_auto_sync_inventory_v2`.

            // However, we DO need to refresh to get updated totals if `fn_update_invoice_total` runs.
            await refreshInvoice();

        } catch (err) {
            console.error(err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setInvoiceItems((prev: any[]) => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i));
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRemoveItem = async (item: any, product: any) => {
        // Optimistic
        const oldItems = [...invoiceItems];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setInvoiceItems((prev: any[]) => prev.filter(i => i.id !== item.id));

        try {
            // Delete
            const { error } = await supabase.from('invoice_items').delete().eq('id', item.id);
            if (error) throw error;

            // Restore Inventory for DELETE
            const isPack = product?.isPack || item.is_pack_sold;
            const deduct = isPack ? (product?.deduct || 1) : 1;
            const restoreQty = item.quantity * deduct;

            await supabase.from('inventory_logs').insert([{
                product_id: item.product_id,
                type: 'RETURN',
                quantity: restoreQty,
                reason: `Xóa khỏi HĐ #${invoice.id.slice(0, 6)}`
            }]);

            const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
            if (prod) {
                await supabase.from('products')
                    .update({ stock_quantity: prod.stock_quantity + restoreQty })
                    .eq('id', item.product_id);
            }

            await refreshInvoice();

        } catch (err) {
            console.error(err);
            setInvoiceItems(oldItems);
        }
    };


    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!booking) {
        return <div className="p-4 text-center">Booking not found</div>;
    }

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <DialogTitle className="text-xl font-bold text-center">Chi tiết đặt sân</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Court & Time */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center">
                    <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-1">{booking.courts?.court_name}</h3>

                    {!isEditingTime ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-2xl font-bold text-midnight dark:text-white">
                                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full hover:bg-emerald-200/50"
                                onClick={() => {
                                    setEditStartTime(format(startTime, 'HH:mm'));
                                    setEditEndTime(format(endTime, 'HH:mm'));
                                    setIsEditingTime(true);
                                }}
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-2">
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="time"
                                    className="border rounded p-1 text-lg font-bold w-24 text-center bg-white dark:bg-gray-800"
                                    value={editStartTime}
                                    onChange={(e) => setEditStartTime(e.target.value)}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="time"
                                    className="border rounded p-1 text-lg font-bold w-24 text-center bg-white dark:bg-gray-800"
                                    value={editEndTime}
                                    onChange={(e) => setEditEndTime(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => setIsEditingTime(false)} disabled={actionLoading}>Hủy</Button>
                                <Button size="sm" onClick={handleUpdateBookingTime} disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="animate-spin size-4" /> : 'Lưu'}
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {format(startTime, 'dd/MM/yyyy')}
                    </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Thông tin khách hàng</h4>

                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">
                            {booking.customers?.name?.charAt(0) || 'K'}
                        </div>
                        <div>
                            <div className="font-bold text-lg">{booking.customers?.name}</div>
                            <div className="text-gray-500 text-sm">{booking.customers?.phone}</div>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${booking.customers?.type === 'LOYAL'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {booking.customers?.type === 'LOYAL' ? 'THÂN THIẾT' : 'VÃNG LAI'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</h4>
                    <div className={`p-3 rounded-lg font-bold text-center ${booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                            booking.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                                booking.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                                    'bg-red-100 text-red-700'
                        }`}>
                        {booking.status === 'PENDING' ? 'CHỜ XÁC NHẬN' :
                            booking.status === 'CONFIRMED' ? 'ĐÃ ĐẶT LỊCH' :
                                booking.status === 'CHECKED_IN' ? 'ĐANG SỬ DỤNG' :
                                    booking.status === 'COMPLETED' ? 'HOÀN THÀNH' :
                                        'ĐÃ HỦY'}
                    </div>
                </div>

                {/* POS / Service Ordering */}
                {booking.status === 'CHECKED_IN' && (
                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/10 pb-2">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dịch vụ / Menu</h4>
                            {invoice && (
                                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                                    Hóa đơn: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.total_amount)}
                                </span>
                            )}
                        </div>

                        {!invoice ? (
                            <div className="text-center py-4 text-gray-500">
                                Đang tạo hóa đơn...
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {products.map(product => {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const existingItem = invoiceItems.find((i: any) =>
                                        i.product_id === product.productId &&
                                        Math.abs(i.sale_price - product.price) < 1
                                    );
                                    const quantity = existingItem ? existingItem.quantity : 0;

                                    return (
                                        <div key={product.key} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                                            <div>
                                                <div className="font-bold text-midnight dark:text-gray-100">{product.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)} / {product.unit}
                                                </div>
                                            </div>

                                            {quantity === 0 ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-emerald-200 dark:shadow-none"
                                                    onClick={() => handleAddItem(product)}
                                                    disabled={actionLoading}
                                                >
                                                    <Plus className="size-4 mr-1" /> Thêm
                                                </Button>
                                            ) : (
                                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                                    <button
                                                        onClick={() => handleUpdateQuantity(existingItem, -1, product)}
                                                        className="size-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-md shadow-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                                                        disabled={actionLoading}
                                                    >
                                                        <Minus className="size-4" />
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-lg text-midnight dark:text-white">{quantity}</span>
                                                    <button
                                                        onClick={() => handleUpdateQuantity(existingItem, 1, product)}
                                                        className="size-8 flex items-center justify-center bg-emerald-600 rounded-md shadow-sm text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                        disabled={actionLoading}
                                                    >
                                                        <Plus className="size-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Notes */}
                {booking.note && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ghi chú</h4>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg text-sm">
                            {booking.note}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <span className="material-symbols-outlined mr-2">login</span>}
                        Check In (Nhận Sân)
                    </Button>
                )}

                {booking.status === 'CHECKED_IN' && (
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-blue-600/20 mb-3"
                        onClick={onCheckOutClick}
                    >
                        <span className="material-symbols-outlined mr-2">shopping_cart_checkout</span>
                        Thanh toán & Trả sân
                    </Button>
                )}

                <Button
                    variant="ghost"
                    className={`w-full mt-2 ${booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : ''}`}
                    onClick={() => {
                        if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
                            handleCancelBooking();
                        } else {
                            onClose();
                        }
                    }}
                    disabled={actionLoading}
                >
                    {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? 'Hủy Sân' : 'Đóng'}
                </Button>
            </div>
        </div>
    );
}
