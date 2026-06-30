
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Trash2, Minus, Share } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceItem } from '@/types';
import { InvoiceSummaryCard } from '@/components/invoices/invoice-summary-card';
import { PaymentSelector } from '@/components/invoices/payment-selector';
import { formatInvoiceShareText } from '@/lib/invoice-utils';

interface InvoiceDetailDialogProps {
    invoiceId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function InvoiceDetailDialog({ invoiceId, open, onOpenChange, onSuccess }: InvoiceDetailDialogProps) {
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [products, setProducts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [currentProductKey, setCurrentProductKey] = useState('');

    const fetchInvoiceDetails = useCallback(async () => {
        if (!invoiceId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/invoices?invoiceId=${invoiceId}`);
            const data = await res.json();
            if (res.ok && data.success) {
                setInvoice(data.invoice);
                setPaymentMethod(data.invoice.payment_method as 'CASH' | 'BANK_TRANSFER' || 'CASH');
                setItems(data.items || []);
            }
        } catch (err) {
            console.error("Error fetching invoice details:", err);
        }
        setLoading(false);
    }, [invoiceId]);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/products');
            const resData = await res.json();
            if (res.ok && resData.success) {
                const processedProducts: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
                resData.data.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    // Option 1: Base Unit
                    processedProducts.push({
                        key: `${p.id}-base`,
                        productId: p.id,
                        name: p.product_name,
                        unit: p.base_unit,
                        price: p.unit_price,
                        isPack: false,
                        deduct: 1
                    });

                    // Option 2: Pack Unit (if available)
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
            console.error("Error fetching products:", err);
        }
    }, []);

    useEffect(() => {
        if (open && invoiceId) {
            fetchInvoiceDetails();
            fetchProducts();
        }
    }, [open, invoiceId, fetchInvoiceDetails, fetchProducts]);

    const handlePayment = async () => {
        if (!invoice) return;
        setLoading(true);

        try {
            const res = await fetch('/api/invoices', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    paymentMethod,
                    totalAmount: invoice.total_amount
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Thanh toán thất bại');
            }
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            alert('Lỗi: ' + (err instanceof Error ? (err as Error).message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!currentProductKey || !invoice) return;
        setLoading(true);

        try {
            const productOption = products.find(p => p.key === currentProductKey);
            if (!productOption) return;

            const existingItem = items.find(i => i.product_id === productOption.productId && i.sale_price === productOption.price);

            if (existingItem) {
                // Update quantity using the existing update helper
                await handleUpdateQuantity(existingItem, 1);
            } else {
                // Insert new via API
                const response = await fetch('/api/invoices/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        invoiceId: invoice.id,
                        productId: productOption.productId,
                        quantity: 1,
                        salePrice: productOption.price,
                        isPackSold: productOption.isPack,
                        invoiceTotalAmount: invoice.total_amount
                    })
                });

                const resData = await response.json();
                if (!response.ok || !resData.success) {
                    throw new Error(resData.error || 'Lỗi thêm món hàng');
                }
            }

            await fetchInvoiceDetails();
            setCurrentProductKey('');

        } catch (err: unknown) {
            alert('Lỗi thêm món: ' + (err instanceof Error ? (err as Error).message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async (item: InvoiceItem, delta: number) => {
        if (!invoice) return;
        setLoading(true);
        try {
            if (delta < 0 && item.quantity <= 1) {
                await handleRemoveItem(item);
                return;
            }

            const response = await fetch('/api/invoices/items', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemId: item.id,
                    invoiceId: invoice.id,
                    newQty: item.quantity + delta,
                    delta,
                    salePrice: item.sale_price,
                    invoiceTotalAmount: invoice.total_amount
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || 'Lỗi cập nhật số lượng');
            }

            await fetchInvoiceDetails();

        } catch (err) {
            alert('Lỗi cập nhật: ' + String(err));
            setLoading(false);
        }
    };

    const handleRemoveItem = async (item: InvoiceItem) => {
        if (!confirm('Xóa món này?') || !invoice) return;
        setLoading(true);
        try {
            const productMatch = products.find(p => p.productId === item.product_id && Math.abs(p.price - item.sale_price) < 1);
            const deductPerUnit = productMatch ? productMatch.deduct : 1;
            const deduct = item.is_pack_sold ? deductPerUnit : 1;

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
                    isPackSold: item.is_pack_sold,
                    deduct,
                    invoiceTotalAmount: invoice.total_amount
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || 'Lỗi xóa món hàng');
            }

            await fetchInvoiceDetails();

        } catch (err) {
            alert('Lỗi xóa: ' + String(err));
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!invoice) return;

        try {
            const isQuickSale = !invoice.bookings;
            const rentalFee = invoice.bookings?.total_court_fee || 0;
            const overtimeFee = invoice.bookings?.overtime_fee || 0;
            const deposit = invoice.bookings?.deposit_amount || 0;
            const formattedItems = items.map(i => ({
                name: i.products?.product_name || 'Sản phẩm',
                quantity: i.quantity,
                price: i.sale_price,
                unit: (i.is_pack_sold ? i.products?.pack_unit : i.products?.base_unit) || undefined
            }));

            const text = formatInvoiceShareText({
                customerName: invoice.customers?.name || 'Khách lẻ',
                isQuickSale,
                courtName: invoice.bookings?.courts?.court_name,
                startTime: invoice.bookings?.start_time,
                endTime: invoice.bookings?.end_time,
                rentalFee,
                overtimeFee,
                itemsFee,
                deposit,
                totalAmount: invoice.total_amount,
                isPaid: invoice.is_paid,
                paymentMethod: invoice.payment_method,
                items: formattedItems
            });

            if (navigator.share) {
                await navigator.share({
                    title: isQuickSale ? 'Hoá đơn bán hàng' : 'Hoá đơn sân cầu lông',
                    text: text,
                });
            } else {
                await navigator.clipboard.writeText(text);
                alert('Đã copy hoá đơn, bạn có thể dán vào Zalo/Messenger!');
            }
        } catch (error) {
            console.log('Chia sẻ bị hủy hoặc lỗi:', error);
        }
    };

    if (!open) return null;

    // Calc totals for summary display logic if needed (though we rely on invoice.total_amount)
    // Detailed breakdown:
    const rentalFee = invoice?.bookings?.total_court_fee || 0;
    const overtimeFee = invoice?.bookings?.overtime_fee || 0;
    const deposit = invoice?.bookings?.deposit_amount || 0;
    const itemsFee = items.reduce((sum, i) => sum + (i.sale_price * i.quantity), 0);

    // Check if displayed total matches invoice total (consistency)
    // const calculatedTotal = rentalFee + overtimeFee + itemsFee - deposit;
    // We use invoice.total_amount as truth.

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#0d1b17] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 p-0 overflow-hidden gap-0">
                <DialogHeader className="p-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
                    <DialogTitle className="text-center text-lg">Chi tiết hóa đơn</DialogTitle>
                </DialogHeader>

                {loading && !invoice ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-600" />
                    </div>
                ) : invoice ? (
                    <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

                        {/* Court Info */}
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                            <div>
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                    {invoice.bookings ? 'Sân' : 'Loại'}
                                </div>
                                <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                                    {invoice.bookings?.courts?.court_name || 'Hóa đơn bán nhanh'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Khách</div>
                                <div className="text-base font-bold text-emerald-800 dark:text-emerald-300">{invoice.customers?.name}</div>
                                <div className="text-[10px] uppercase font-bold text-emerald-600">{invoice.customers?.type === 'LOYAL' ? '(Thân thiết)' : '(Vãng lai)'}</div>
                            </div>
                        </div>

                        {/* POS - Add Products (Only if unpaid) */}
                        {!invoice.is_paid && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h4 className="text-black dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-3">Dịch vụ đi kèm</h4>

                                <div className="flex gap-2 mb-4">
                                    <div className="flex-1">
                                        <Select value={currentProductKey} onValueChange={setCurrentProductKey}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Chọn món..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(p => (
                                                    <SelectItem key={p.key} value={p.key}>
                                                        {p.name} ({formatCurrency(p.price)}/{p.unit})
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
                                    {items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{item.products?.product_name}</div>
                                                <div className="text-xs text-gray-500">{formatCurrency(item.sale_price)}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleUpdateQuantity(item, -1)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Minus className="size-3" /></button>
                                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(item, 1)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Plus className="size-3" /></button>
                                                <button onClick={() => handleRemoveItem(item)} className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="size-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {items.length === 0 && <div className="text-center text-xs text-gray-400 py-2">Chưa chọn món nào</div>}
                                </div>
                            </div>
                        )}

                        {/* Read-only List if Paid */}
                        {invoice.is_paid && items.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h4 className="text-black dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-3">Dịch vụ đã dùng</h4>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0 dark:border-gray-800">
                                            <div className="text-sm">
                                                {item.products?.product_name} <span className="text-gray-400">x{item.quantity}</span>
                                            </div>
                                            <div className="font-medium text-sm">{formatCurrency(item.sale_price * item.quantity)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Invoice Summary Card */}
                        <InvoiceSummaryCard
                            rentalFee={rentalFee}
                            overtimeFee={overtimeFee}
                            itemsFee={itemsFee}
                            deposit={deposit}
                            totalAmount={invoice.total_amount}
                            items={items.map(i => ({
                                name: i.products?.product_name || 'Sản phẩm',
                                quantity: i.quantity,
                                price: i.sale_price,
                                unit: (i.is_pack_sold ? i.products?.pack_unit : i.products?.base_unit) || undefined
                            }))}
                            startTime={invoice.bookings?.start_time}
                            endTime={invoice.bookings?.end_time}
                            isQuickSale={!invoice.bookings}
                            showItemsList={invoice.is_paid}
                        />

                        {/* Payment Selector or Paid Alert */}
                        {!invoice.is_paid ? (
                            <PaymentSelector
                                totalAmount={invoice.total_amount}
                                qrDescription={invoice.bookings ? `Thanh toan san ${invoice.bookings.courts?.court_name || ''}` : 'Thanh toan mua le'}
                                paymentMethod={paymentMethod}
                                onChangePaymentMethod={setPaymentMethod}
                            />
                        ) : (
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center border border-green-100 dark:border-green-800">
                                <span className="text-green-700 dark:text-green-400 font-bold flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    ĐÃ THANH TOÁN ({invoice.payment_method === 'CASH' ? 'TIỀN MẶT' : 'CHUYỂN KHOẢN'})
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center text-red-500">
                        <span className="material-symbols-outlined text-4xl mb-2">error</span>
                        <p>Không tìm thấy hóa đơn</p>
                    </div>
                )}

                <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    {!invoice?.is_paid ? (
                        <div className="flex gap-2 w-full">
                            <Button
                                variant="outline"
                                className="w-12 h-12 rounded-xl border-gray-200 dark:border-gray-700 flex-shrink-0 text-gray-600 dark:text-gray-300"
                                onClick={handleShare}
                                disabled={loading}
                                title="Chia sẻ hóa đơn"
                            >
                                <Share className="size-5" />
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg rounded-xl shadow-lg shadow-emerald-600/20"
                                onClick={handlePayment}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : (
                                    <span className="material-symbols-outlined mr-2">check_circle</span>
                                )}
                                Xác nhận thanh toán
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 text-base font-bold rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 flex items-center justify-center gap-2"
                                onClick={handleShare}
                            >
                                <Share className="size-5" />
                                Chia sẻ Bill
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 h-12 text-base font-bold rounded-xl"
                                onClick={() => onOpenChange(false)}
                            >
                                Đóng
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
