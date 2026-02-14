
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import {
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product } from "@/types";

interface ProductFormProps {
    productToEdit?: Product;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ProductForm({ productToEdit, onSuccess, onCancel }: ProductFormProps) {
    // Base Unit
    const [name, setName] = useState('');
    const [baseUnit, setBaseUnit] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [stock, setStock] = useState(''); // Always in base unit

    // Pack Unit
    const [isPackable, setIsPackable] = useState(false);
    const [packUnit, setPackUnit] = useState('');
    const [unitsPerPack, setUnitsPerPack] = useState('1');
    const [packPrice, setPackPrice] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.product_name);
            setBaseUnit(productToEdit.base_unit || productToEdit.unit || ''); // Handle legacy 'unit' if needed or assume migration renamed it
            setUnitPrice(productToEdit.unit_price?.toString() || productToEdit.current_sale_price?.toString() || '');
            setStock(productToEdit.stock_quantity.toString());

            setIsPackable(productToEdit.is_packable || false);
            setPackUnit(productToEdit.pack_unit || '');
            setUnitsPerPack(productToEdit.units_per_pack?.toString() || '1');
            setPackPrice(productToEdit.pack_price?.toString() || '');
        }
    }, [productToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic Validation
        if (!name || !baseUnit || !unitPrice) {
            setError('Vui lòng điền tên, đơn vị cơ bản và giá bán lẻ');
            setLoading(false);
            return;
        }

        if (isPackable) {
            if (!packUnit || !unitsPerPack) {
                setError('Vui lòng điền thông tin đóng gói (Đơn vị gói, Quy cách)');
                setLoading(false);
                return;
            }
        }

        const productData = {
            product_name: name,
            base_unit: baseUnit,
            unit_price: parseFloat(unitPrice),
            stock_quantity: parseInt(stock) || 0,
            is_packable: isPackable,
            pack_unit: isPackable ? packUnit : null,
            units_per_pack: isPackable ? parseInt(unitsPerPack) : 1,
            pack_price: (isPackable && packPrice) ? parseFloat(packPrice) : null // Can be null if auto-calc wanted, but simpler to force or default? database can handle null.
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

                <div className="space-y-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 border-b pb-2">Thông tin cơ bản</h3>

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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="baseUnit">Đơn vị cơ bản</Label>
                            <Select value={baseUnit} onValueChange={setBaseUnit}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Chai">Chai</SelectItem>
                                    <SelectItem value="Lon">Lon</SelectItem>
                                    <SelectItem value="Trái">Trái (Cầu)</SelectItem>
                                    <SelectItem value="Cái">Cái</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitPrice">Giá lẻ (VNĐ)</Label>
                            <Input
                                id="unitPrice"
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                placeholder="0"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stock">Tồn kho (Theo đơn vị cơ bản)</Label>
                        <Input
                            id="stock"
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="0"
                            min="0"
                            required
                        />
                        <p className="text-[11px] text-gray-500">Ví dụ: Nhập 120 trái (Không nhập số ống)</p>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2 border-b pb-2">
                        <Checkbox
                            id="isPackable"
                            checked={isPackable}
                            onCheckedChange={(checked) => setIsPackable(checked as boolean)}
                        />
                        <Label htmlFor="isPackable" className="font-bold text-sm cursor-pointer">Bán theo gói (Ống, Hộp, Lốc...)</Label>
                    </div>

                    {isPackable && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/10">
                            <div className="space-y-2">
                                <Label htmlFor="packUnit">Đơn vị gói</Label>
                                <Select value={packUnit} onValueChange={setPackUnit}>
                                    <SelectTrigger h-9>
                                        <SelectValue placeholder="Chọn..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Ống">Ống</SelectItem>
                                        <SelectItem value="Hộp">Hộp</SelectItem>
                                        <SelectItem value="Lốc">Lốc</SelectItem>
                                        <SelectItem value="Thùng">Thùng</SelectItem>
                                        <SelectItem value="Gói">Gói</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unitsPerPack">Quy cách (SL/Gói)</Label>
                                <Input
                                    id="unitsPerPack"
                                    type="number"
                                    value={unitsPerPack}
                                    onChange={(e) => setUnitsPerPack(e.target.value)}
                                    placeholder="12"
                                    min="1"
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="packPrice">Giá bán theo gói (VNĐ)</Label>
                                <Input
                                    id="packPrice"
                                    type="number"
                                    value={packPrice}
                                    onChange={(e) => setPackPrice(e.target.value)}
                                    placeholder="Để trống = Giá lẻ * SL"
                                    min="0"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    )}
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
