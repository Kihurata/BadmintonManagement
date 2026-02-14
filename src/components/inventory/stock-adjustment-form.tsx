
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockAdjustmentFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function StockAdjustmentForm({ onSuccess, onCancel }: StockAdjustmentFormProps) {
    const [products, setProducts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [selectedProductId, setSelectedProductId] = useState('');
    const [type, setType] = useState('RESTOCK');
    const [quantity, setQuantity] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProducts() {
            setPageLoading(true);
            const { data } = await supabase.from('products').select('id, product_name, stock_quantity');
            if (data) {
                setProducts(data);
            }
            setPageLoading(false);
        }
        fetchProducts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            setError('Số lượng phải lớn hơn 0');
            setLoading(false);
            return;
        }

        if (!selectedProductId) {
            setError('Vui lòng chọn sản phẩm');
            setLoading(false);
            return;
        }

        // Logic: Calculate change quantity (positive for Restock, negative for others)
        // Actually, let's keep log quantity distinct from sign, but usually restock is + and others are -
        // But for "Inventory Logs", we might want to store the absolute value and the TYPE determines the sign for calculation.
        // However, updating the `products.stock_quantity` needs the sign.

        let changeQty = qty;
        if (type !== 'RESTOCK') {
            changeQty = -qty;
        }

        // 1. Insert Log
        const logData = {
            product_id: selectedProductId,
            type: type,
            quantity: changeQty,
            purchase_price: type === 'RESTOCK' && purchasePrice ? parseFloat(purchasePrice) : null,
            reason: reason
        };

        const { error: logError } = await supabase.from('inventory_logs').insert([logData]);

        if (logError) {
            setError(logError.message);
            setLoading(false);
            return;
        }

        // 2. Update Product Stock (using RPC ideally, but client-side calc for now is okay for MVP if simple)
        // Better to fetch current stock again or use Supabase rpc to increment.
        // For simplicity: We already fetched products. We can just add. 
        // But to be safe against race conditions, RPC `increment` function is best.
        // Since we don't have an RPC set up in schema.sql for this yet (probably), we will just do a read-update.

        // Fetch latest stock to be safe
        const { data: currentProduct } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', selectedProductId)
            .single();

        if (currentProduct) {
            const newStock = (currentProduct.stock_quantity || 0) + changeQty;
            const { error: updateError } = await supabase
                .from('products')
                .update({ stock_quantity: newStock })
                .eq('id', selectedProductId);

            if (updateError) {
                setError('Logged but failed to update stock: ' + updateError.message);
            } else {
                onSuccess();
            }
        } else {
            setError('Product not found');
        }

        setLoading(false);
    };

    if (pageLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <DialogTitle className="text-xl font-bold text-center">Điều Chỉnh Kho</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="type">Loại giao dịch</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="RESTOCK">Nhập hàng (Restock)</SelectItem>
                            <SelectItem value="SALE">Bán hàng (Sale) - Thường tự động</SelectItem>
                            <SelectItem value="DAMAGED">Hỏng / Hết hạn (Damaged)</SelectItem>
                            <SelectItem value="INTERNAL_USE">Sử dụng nội bộ (Internal)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product">Sản phẩm</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn sản phẩm" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.product_name} (Tồn: {p.stock_quantity})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="quantity">Số lượng</Label>
                    <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        min="1"
                        required
                    />
                </div>

                {type === 'RESTOCK' && (
                    <div className="space-y-2">
                        <Label htmlFor="purchasePrice">Giá nhập (VNĐ) / Đơn vị</Label>
                        <Input
                            id="purchasePrice"
                            type="number"
                            value={purchasePrice}
                            onChange={(e) => setPurchasePrice(e.target.value)}
                            placeholder="0"
                            min="0"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="reason">Lý do / Ghi chú</Label>
                    <Input
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Nhập ghi chú..."
                    />
                </div>
            </form>

            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Hủy</Button>
                <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Xác nhận
                </Button>
            </div>
        </div>
    );
}
