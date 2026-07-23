import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { calculateRentalFee } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import {
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { ProductSelectorList, type ProductSelectorItem } from './product-selector-list';

interface BookingDetailsProps {
    bookingId: string;
    onClose: () => void;
    onCheckInSuccess: () => void;
    onCheckOutClick?: () => void;
}

export function BookingDetails({ bookingId, onClose, onCheckInSuccess, onCheckOutClick }: BookingDetailsProps) {
    const [booking, setBooking] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');

    const [invoice, setInvoice] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<ProductSelectorItem[]>([]);
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            try {
                // 1. Fetch Booking, Invoice & Items via API
                const res = await fetch(`/api/bookings/details?bookingId=${bookingId}`);
                const data = await res.json();
                if (res.ok && data.success) {
                    setBooking(data.booking);
                    if (data.invoice) {
                        setInvoice(data.invoice);
                        setInvoiceItems(data.invoiceItems || []);
                    }
                }

                // 2. Fetch Products via API
                const prodRes = await fetch('/api/v1/products');
                const prodData = await prodRes.json();
                if (prodRes.ok && prodData.success) {
                    const processedProducts: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
                    prodData.data.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                        // Base Unit
                        processedProducts.push({
                            key: `${p.id}-base`,
                            productId: p.id,
                            name: p.product_name,
                            unit: p.base_unit || 'Cái',
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
            } catch (err) {
                console.error("Error loading booking details:", err);
            }

            setLoading(false);
        }
        fetchData();
    }, [bookingId]);

    const refreshInvoice = async () => {
        if (!bookingId) return;
        try {
            const res = await fetch(`/api/bookings/details?bookingId=${bookingId}`);
            const data = await res.json();
            if (res.ok && data.success) {
                if (data.invoice) {
                    setInvoice(data.invoice);
                    setInvoiceItems(data.invoiceItems || []);
                }
            }
        } catch (err) {
            console.error("Error refreshing invoice:", err);
        }
    };

    const handleUpdateBookingTime = async () => {
        if (!editStartTime || !editEndTime) return;

        if (booking.recurring_rule_id) {
            if (!confirm('Lưu ý: Ca đặt sân này thuộc một chuỗi lịch cố định. Thay đổi này sẽ chỉ áp dụng cho riêng ca đặt sân này. Bạn có chắc chắn muốn tiếp tục?')) {
                return;
            }
        }

        setActionLoading(true);
        const originalDate = new Date(booking.start_time);
        const dateStr = format(originalDate, 'yyyy-MM-dd');

        const newStart = new Date(`${dateStr}T${editStartTime}`);
        const newEnd = new Date(`${dateStr}T${editEndTime}`);

        try {
            const response = await fetch('/api/bookings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId,
                    startTime: newStart.toISOString(),
                    endTime: newEnd.toISOString()
                })
            });

            const resData = await response.json();
            if (response.ok && resData.success) {
                setBooking({
                    ...booking,
                    start_time: newStart.toISOString(),
                    end_time: newEnd.toISOString()
                });
                setIsEditingTime(false);
            } else {
                alert('Lỗi cập nhật: ' + (resData.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Lỗi cập nhật: ' + (err as Error).message);
        }
        setActionLoading(false);
    };

    const handleCheckIn = async () => {
        setActionLoading(true);

        let currentRentalFee = 0;
        try {
            const pricing = calculateRentalFee(
                new Date(booking.start_time),
                new Date(booking.end_time),
                booking.courts,
                booking.customers?.type || 'GUEST'
            );
            currentRentalFee = pricing.rentalFee;
        } catch (err) {
            console.error("Lỗi tính tiền sân dự kiến:", err);
        }

        try {
            const response = await fetch('/api/bookings/check-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId,
                    customerId: booking.customer_id,
                    rentalFee: currentRentalFee
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                alert('Lỗi Check-in: ' + (resData.error || 'Check-in failed'));
            } else {
                await refreshInvoice();
                onCheckInSuccess();
              }
        } catch (err) {
            alert('Lỗi Check-in: ' + (err as Error).message);
        }

        setActionLoading(false);
    };

    const handleCancelBooking = async () => {
        const isRecurring = !!booking.recurring_rule_id;
        const confirmMsg = isRecurring 
            ? 'Lưu ý: Ca đặt sân này thuộc một chuỗi lịch cố định. Việc hủy này sẽ chỉ áp dụng cho riêng ca đặt sân này. Bạn có chắc chắn muốn hủy?' 
            : 'Bạn có chắc chắn muốn hủy đặt sân này không?';

        if (!confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            const response = await fetch('/api/bookings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bookingId,
                    status: 'CANCELLED'
                })
            });

            const resData = await response.json();
            if (response.ok && resData.success) {
                onCheckInSuccess();
                onClose();
            } else {
                alert('Lỗi hủy sân: ' + (resData.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Lỗi hủy sân: ' + (err as Error).message);
        }
        setActionLoading(false);
    };

    // --- POS Handlers ---
    const handleAddItem = async (product: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!invoice) return;

        const tempId = 'temp-' + Date.now();
        const optimisticItem = { id: tempId, product_id: product.productId, quantity: 1, sale_price: product.price, products: { product_name: product.name } };
        setInvoiceItems((prev) => [...prev, optimisticItem]);

        try {
            const existing = invoiceItems.find(i => i.product_id === product.productId && Math.abs(i.sale_price - product.price) < 1);

            if (existing) {
                await handleUpdateQuantity(existing, 1, product);
                setInvoiceItems((prev) => prev.filter(i => i.id !== tempId));
            } else {
                const response = await fetch('/api/invoices/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        invoiceId: invoice.id,
                        productId: product.productId,
                        quantity: 1,
                        salePrice: product.price,
                        isPackSold: product.isPack,
                        invoiceTotalAmount: invoice.total_amount
                    })
                });

                const resData = await response.json();
                if (!response.ok || !resData.success) {
                    throw new Error(resData.error || 'Lỗi thêm món hàng');
                }

                await refreshInvoice();
            }
        } catch (err) {
            console.error(err);
            setInvoiceItems((prev) => prev.filter(i => i.id !== tempId));
        }
    };

    const handleUpdateQuantity = async (item: any, delta: number, product: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            if (confirm('Xóa món này khỏi hóa đơn?')) {
                await handleRemoveItem(item, product);
            }
            return;
        }

        setInvoiceItems((prev) => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));

        try {
            const response = await fetch('/api/invoices/items', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemId: item.id,
                    invoiceId: invoice.id,
                    newQty,
                    delta,
                    salePrice: item.sale_price,
                    invoiceTotalAmount: invoice.total_amount
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || 'Lỗi cập nhật số lượng');
            }

            await refreshInvoice();
        } catch (err) {
            console.error(err);
            setInvoiceItems((prev) => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i));
        }
    };

    const handleRemoveItem = async (item: any, product: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const oldItems = [...invoiceItems];
        setInvoiceItems((prev) => prev.filter(i => i.id !== item.id));

        try {
            const isPack = product?.isPack || item.is_pack_sold;
            const deduct = isPack ? (product?.deduct || 1) : 1;

            const response = await fetch('/api/invoices/items', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemId: item.id,
                    invoiceId: invoice.id,
                    productId: item.product_id,
                    quantity: item.quantity,
                    salePrice: item.sale_price,
                    isPackSold: isPack,
                    deduct,
                    invoiceTotalAmount: invoice.total_amount
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || 'Lỗi xóa món hàng');
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

    const itemsQuantities = Object.fromEntries(
        products.map(p => {
            const existingItem = invoiceItems.find(i => i.product_id === p.productId && Math.abs(i.sale_price - p.price) < 1);
            return [p.key, existingItem ? existingItem.quantity : 0];
        })
    );

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
                                    aria-label="Start Time"
                                    className="border rounded p-1 text-lg font-bold w-24 text-center bg-white dark:bg-gray-800"
                                    value={editStartTime}
                                    onChange={(e) => setEditStartTime(e.target.value)}
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="time"
                                    aria-label="End Time"
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
                            {(booking.guest_name && (booking.customers?.type === 'GUEST' || booking.customers?.name === 'Khách vãng lai')
                                ? booking.guest_name
                                : booking.customers?.name)?.charAt(0) || 'K'}
                        </div>
                        <div>
                            <div className="font-bold text-lg">
                                {booking.guest_name && (booking.customers?.type === 'GUEST' || booking.customers?.name === 'Khách vãng lai')
                                    ? `${booking.guest_name} (Vãng lai)`
                                    : booking.customers?.name}
                            </div>
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
                            <ProductSelectorList
                                products={products}
                                quantities={itemsQuantities}
                                onAdd={(p) => handleAddItem(p)}
                                onUpdateQuantity={(p, delta) => {
                                    const existingItem = invoiceItems.find(i => i.product_id === p.productId && Math.abs(i.sale_price - p.price) < 1);
                                    if (existingItem) handleUpdateQuantity(existingItem, delta, p);
                                }}
                                loading={actionLoading}
                            />
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
