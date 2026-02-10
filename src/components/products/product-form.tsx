
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductFormProps {
    productToEdit?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ProductForm({ productToEdit, onSuccess, onCancel }: ProductFormProps) {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.product_name);
            setUnit(productToEdit.unit || '');
            setPrice(productToEdit.current_sale_price.toString());
            setStock(productToEdit.stock_quantity.toString());
        }
    }, [productToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const productData = {
            product_name: name,
            unit: unit,
            current_sale_price: parseFloat(price),
            stock_quantity: parseInt(stock) || 0,
        };

        let error;

        if (productToEdit) {
            const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productToEdit.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('products')
                .insert([productData]);
            error = insertError;
        }

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <DialogTitle className="text-xl font-bold text-center">
                    {productToEdit ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
                </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name">Tên sản phẩm</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Nước suối, Cầu lông"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="unit">Đơn vị tính (DVT)</Label>
                    <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn đơn vị" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Chai">Chai</SelectItem>
                            <SelectItem value="Lon">Lon</SelectItem>
                            <SelectItem value="Chiếc">Chiếc</SelectItem>
                            <SelectItem value="Hộp">Hộp</SelectItem>
                            <SelectItem value="Ống">Ống</SelectItem>
                            <SelectItem value="Gói">Gói</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="price">Giá bán (VNĐ)</Label>
                    <Input
                        id="price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                        min="0"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stock">Tồn kho ban đầu</Label>
                    <Input
                        id="stock"
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="0"
                        min="0"
                        required
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
                    Lưu
                </Button>
            </div>
        </div>
    );
}
