
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from '@/lib/utils';
import { Loader2, Plus, Trash2, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { InvoiceItem } from '@/types';

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
        // 1. Fetch Invoice + Booking + Customer
        const { data: inv } = await supabase
            .from('invoices')
            .select(`
                *,
                customers ( name, phone, type ),
                bookings (
                    start_time, end_time,
                    total_court_fee, overtime_fee, deposit_amount,
                    courts ( court_name )
                )
            `)
            .eq('id', invoiceId)
            .single();

        if (inv) {
            setInvoice(inv);
            setPaymentMethod(inv.payment_method as 'CASH' | 'BANK_TRANSFER' || 'CASH');

            // 2. Fetch Invoice Items
            const { data: invItems } = await supabase
                .from('invoice_items')
                .select(`
                    *,
                    products ( product_name, base_unit, pack_unit )
                `)
                .eq('invoice_id', invoiceId);

            setItems((invItems as unknown as InvoiceItem[]) || []);
        }
        setLoading(false);
    }, [invoiceId]);

    const fetchProducts = useCallback(async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .gt('stock_quantity', 0)
            .order('product_name');

        if (data) {
            const processedProducts: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
            data.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
            const { error } = await supabase
                .from('invoices')
                .update({
                    is_paid: true,
                    payment_method: paymentMethod
                })
                .eq('id', invoice.id);

            if (error) throw error;
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
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

            // Add directly to invoice_items (one by one or merge? simple append for now)
            // Check if item exists with same price/pack? 
            // Ideally we should group, but DB handles separate lines fine. 
            // For UX, let's just insert a new line for simplicity as it matches standard "Add" behavior in this context.
            // Or update existing line if same product & price. 

            // Simplest consistent with POS: Just Insert. 
            // Merging is nicer but complexity. CheckoutForm merges locallly. here we deal with DB rows.
            // Let's Check if exists in `items` with same product_id and price.

            const existingItem = items.find(i => i.product_id === productOption.productId && i.sale_price === productOption.price);

            let itemError;

            if (existingItem) {
                // Update quantity
                const { error } = await supabase.from('invoice_items')
                    .update({ quantity: existingItem.quantity + 1 })
                    .eq('id', existingItem.id);
                itemError = error;
            } else {
                // Insert new
                const { error } = await supabase.from('invoice_items')
                    .insert([{
                        invoice_id: invoice.id,
                        product_id: productOption.productId,
                        quantity: 1,
                        sale_price: productOption.price
                    }]);
                itemError = error;
            }

            if (itemError) throw itemError;

            // Inv Log
            await supabase.from('inventory_logs').insert([{
                product_id: productOption.productId,
                type: 'SALE',
                quantity: -productOption.deduct,
                reason: `Thêm vào HĐ #${invoice.id.slice(0, 6)}`
            }]);

            // Update Stock
            const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', productOption.productId).single();
            if (prod) {
                await supabase.from('products')
                    .update({ stock_quantity: prod.stock_quantity - productOption.deduct })
                    .eq('id', productOption.productId);
            }

            // Update Total
            const newTotal = invoice.total_amount + productOption.price;
            await supabase
                .from('invoices')
                .update({ total_amount: newTotal })
                .eq('id', invoice.id);

            await fetchInvoiceDetails();
            setCurrentProductKey('');

        } catch (err: unknown) {
            alert('Lỗi thêm món: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async (item: InvoiceItem, delta: number) => {
        if (!invoice) return;
        setLoading(true);
        try {
            // Find product option to know deduct amount?
            // Existing item doesn't explicitly store "isPack" or "deduct".
            // We have to infer or fallback.
            // But we know sale_price.
            // If delta is negative and qty is 1, call remove.
            if (delta < 0 && item.quantity <= 1) {
                await handleRemoveItem(item);
                return;
            }

            // Need to find the product definition to know deduct quantity
            // This is tricky if price changed, but assuming current match:
            // We'll search `products` for matching productId and price.
            // If not found, assume base unit (deduct 1).

            // Wait, `products` state has available products.
            // Let's try to match by productId and price.
            const productMatch = products.find(p => p.productId === item.product_id && Math.abs(p.price - item.sale_price) < 1);
            const deduct = productMatch ? productMatch.deduct : 1;

            // Update Item
            await supabase.from('invoice_items')
                .update({ quantity: item.quantity + delta })
                .eq('id', item.id);

            // Inv Log
            await supabase.from('inventory_logs').insert([{
                product_id: item.product_id,
                type: delta > 0 ? 'SALE' : 'RETURN',
                quantity: delta > 0 ? -deduct : deduct,
                reason: `Cập nhật HĐ #${invoice.id.slice(0, 6)}`
            }]);

            // Update Stock
            const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
            if (prod) {
                await supabase.from('products')
                    .update({ stock_quantity: prod.stock_quantity + (delta > 0 ? -deduct : deduct) })
                    .eq('id', item.product_id);
            }

            // Update Invoice Total
            const newTotal = invoice.total_amount + (delta * item.sale_price);
            await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', invoice.id);

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
            const totalReturn = deductPerUnit * item.quantity;

            // Delete Item
            await supabase.from('invoice_items').delete().eq('id', item.id);

            // Inv Log
            await supabase.from('inventory_logs').insert([{
                product_id: item.product_id,
                type: 'RETURN',
                quantity: totalReturn,
                reason: `Xóa khỏi HĐ #${invoice.id.slice(0, 6)}`
            }]);

            // Stock
            const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
            if (prod) {
                await supabase.from('products')
                    .update({ stock_quantity: prod.stock_quantity + totalReturn })
                    .eq('id', item.product_id);
            }

            // Update Total
            const newTotal = invoice.total_amount - (item.sale_price * item.quantity);
            await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', invoice.id);

            await fetchInvoiceDetails();

        } catch (err) {
            alert('Lỗi xóa: ' + String(err));
            setLoading(false);
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
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Sân</div>
                                <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{invoice.bookings?.courts?.court_name}</div>
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

                        {/* Invoice Summary */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                            <h4 className="text-black dark:text-gray-300 text-xs font-bold uppercase tracking-widest border-b border-gray-50 dark:border-gray-800 pb-2 mb-2">Chi tiết thanh toán</h4>

                            <div className="flex justify-between items-start text-sm">
                                <div className="flex flex-col">
                                    <span className="text-black dark:text-gray-200">Tiền sân</span>
                                    <span className="text-[10px] text-gray-400">
                                        {format(new Date(invoice.bookings?.start_time), 'HH:mm')} - {format(new Date(invoice.bookings?.end_time), 'HH:mm')}
                                    </span>
                                </div>
                                <span className="font-bold">{formatCurrency(rentalFee)}</span>
                            </div>

                            {overtimeFee > 0 && (
                                <div className="flex justify-between items-start text-sm text-red-500">
                                    <span className="font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">warning</span> Quá giờ / Phụ phí
                                    </span>
                                    <span className="font-bold">{formatCurrency(overtimeFee)}</span>
                                </div>
                            )}

                            {itemsFee > 0 && (
                                <div className="flex justify-between items-center text-sm text-blue-600">
                                    <span className="font-medium">Tiền dịch vụ</span>
                                    <span className="font-bold">{formatCurrency(itemsFee)}</span>
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
                                <span className="text-2xl font-extrabold text-primary">{formatCurrency(invoice.total_amount)}</span>
                            </div>
                        </div>

                        {/* Payment Method */}
                        {!invoice.is_paid && (
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
                        )}
                        {invoice.is_paid && (
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
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg rounded-xl shadow-lg shadow-emerald-600/20"
                            onClick={handlePayment}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : (
                                <span className="material-symbols-outlined mr-2">check_circle</span>
                            )}
                            Xác nhận thanh toán
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full h-12 text-lg rounded-xl"
                            onClick={() => onOpenChange(false)}
                        >
                            Đóng
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
