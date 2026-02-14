
import { useState, useEffect } from 'react';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';

interface InvoiceDetailDialogProps {
    invoiceId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function InvoiceDetailDialog({ invoiceId, open, onOpenChange, onSuccess }: InvoiceDetailDialogProps) {
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');

    // Add Item State
    const [isAdding, setIsAdding] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');

    useEffect(() => {
        if (open && invoiceId) {
            fetchInvoiceDetails();
            fetchProducts();
        }
    }, [open, invoiceId]);

    const fetchInvoiceDetails = async () => {
        setLoading(true);
        // 1. Fetch Invoice + Booking + Customer
        const { data: inv, error } = await supabase
            .from('invoices')
            .select(`
                *,
                customers ( name, phone ),
                bookings (
                    start_time, end_time,
                    courts ( court_name )
                )
            `)
            .eq('id', invoiceId)
            .single();

        if (inv) {
            setInvoice(inv);
            setPaymentMethod(inv.payment_method || 'CASH');

            // 2. Fetch Invoice Items
            const { data: invItems } = await supabase
                .from('invoice_items')
                .select(`
                    *,
                    products ( product_name, base_unit )
                `)
                .eq('invoice_id', invoiceId);

            setItems(invItems || []);
        }
        setLoading(false);
    };

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .gt('stock_quantity', 0)
            .order('product_name');
        setProducts(data || []);
    };

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
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!selectedProduct || !invoice) return;
        setLoading(true);

        try {
            const product = products.find(p => p.id === selectedProduct);
            if (!product) return;

            if (product.unit_price === undefined || product.unit_price === null) {
                alert('Lỗi: Sản phẩm không có giá bán hợp lệ!');
                setLoading(false);
                return;
            }

            // Add to invoice_items
            const { error: itemError } = await supabase
                .from('invoice_items')
                .insert([{
                    invoice_id: invoice.id,
                    product_id: product.id,
                    quantity: 1,
                    sale_price: Number(product.unit_price)
                }]);

            if (itemError) throw itemError;

            // Update Invoice Total
            const newTotal = invoice.total_amount + Number(product.unit_price);
            await supabase
                .from('invoices')
                .update({ total_amount: newTotal })
                .eq('id', invoice.id);

            // Update Inventory (Deduct stock)
            await supabase.from('inventory_logs').insert([{
                product_id: product.id,
                type: 'SALE',
                quantity: -1,
                reason: `Thêm vào HĐ #${invoice.id.slice(0, 6)}`
            }]);

            await supabase.from('products')
                .update({ stock_quantity: product.stock_quantity - 1 })
                .eq('id', product.id);

            // Refresh
            await fetchInvoiceDetails();
            setIsAdding(false);
            setSelectedProduct('');

        } catch (err: any) {
            alert('Lỗi thêm món: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

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

                        {/* Info Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{invoice.customers?.name}</h3>
                                <p className="text-sm text-gray-500">{invoice.customers?.phone || 'Không có SĐT'}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${invoice.is_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                    }`}>
                                    {invoice.is_paid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                                </span>
                                <p className="text-xs text-gray-400 mt-1">#{invoice.id.slice(0, 8)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(invoice.created_at).toLocaleDateString('vi-VN')} {new Date(invoice.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Booking Info */}
                        {invoice.bookings && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                <div className="flex justify-between">
                                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                        {invoice.bookings.courts?.court_name}
                                    </span>
                                    <span className="text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                                        {format(new Date(invoice.bookings.start_time), 'HH:mm')} - {format(new Date(invoice.bookings.end_time), 'HH:mm')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Items List */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-sm">Chi tiết</h4>
                                {!invoice.is_paid && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                        onClick={() => setIsAdding(!isAdding)}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Thêm món
                                    </Button>
                                )}
                            </div>

                            {/* Add Item Form */}
                            {isAdding && (
                                <div className="flex gap-2 mb-2 animate-in slide-in-from-top-2 fade-in">
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Chọn sản phẩm..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.product_name} - {formatCurrency(p.unit_price)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={handleAddItem} disabled={!selectedProduct} className="bg-emerald-600 h-9 w-9 p-0 mb-4">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Court Fee (Implicit in total but not a separate 'item' row in DB usually, but logic adds it to total. 
                               Wait, current 'invoice_items' doesn't store Court Fee. It's stored in `total_court_fee` in bookings or integrated into invoice total.
                               Let's display standard Items first.
                            */}

                            {items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm py-1">
                                    <span>
                                        {item.products?.product_name || 'Sản phẩm'}
                                        <span className="text-gray-400 text-xs ml-1">x{item.quantity}</span>
                                    </span>
                                    <span>{formatCurrency(item.sale_price * item.quantity)}</span>
                                </div>
                            ))}

                            {/* Calculate Remainder (Total - Items) = Court Fee (Approx) */}
                            {(() => {
                                const itemsTotal = items.reduce((sum, i) => sum + (i.sale_price * i.quantity), 0);
                                const courtFee = invoice.total_amount - itemsTotal;
                                if (courtFee > 0) {
                                    return (
                                        <div className="flex justify-between text-sm py-1 font-medium text-gray-600 dark:text-gray-300">
                                            <span>Tiền sân & Dịch vụ khác</span>
                                            <span>{formatCurrency(courtFee)}</span>
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        {/* Total */}
                        <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-end">
                            <span className="font-bold">Tổng cộng</span>
                            <span className="text-2xl font-extrabold text-primary">{formatCurrency(invoice.total_amount)}</span>
                        </div>

                        {/* Payment Method (Only if unpaid) */}
                        {!invoice.is_paid && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Phương thức thanh toán</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('CASH')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium border transition-all ${paymentMethod === 'CASH'
                                            ? 'bg-white dark:bg-gray-700 border-emerald-500 text-emerald-600 shadow-sm'
                                            : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        Tiền mặt
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('BANK_TRANSFER')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium border transition-all ${paymentMethod === 'BANK_TRANSFER'
                                            ? 'bg-white dark:bg-gray-700 border-emerald-500 text-emerald-600 shadow-sm'
                                            : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        Chuyển khoản
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center text-red-500">Không tìm thấy hóa đơn</div>
                )}

                <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-800">
                    {!invoice?.is_paid ? (
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                            onClick={handlePayment}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Xác nhận thanh toán
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full"
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
