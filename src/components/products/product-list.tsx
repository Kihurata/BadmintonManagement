
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProductForm } from './product-form';

export function ProductList() {
    const [products, setProducts] = useState<any[]>([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('product_name');

        if (data) {
            setProducts(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchProducts();
        }
    };

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    };

    const filteredProducts = products.filter(p =>
        p.product_name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-4 space-y-4 pb-24">
            {/* Search & Add */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                    <Input
                        placeholder="Tìm sản phẩm..."
                        className="pl-9 bg-white dark:bg-white/5"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                    <Plus className="size-5" />
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map((product) => (
                    <div key={product.id} className="bg-white dark:bg-[#0d1b17] p-3 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-midnight dark:text-white">{product.product_name}</h3>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <span>{product.stock_quantity} {product.unit}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="font-medium text-emerald-600">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.current_sale_price)}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500" onClick={() => handleEdit(product)}>
                                <Edit className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(product.id)}>
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {filteredProducts.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                        Chưa có sản phẩm nào.
                    </div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
                    <ProductForm
                        productToEdit={editingProduct}
                        onSuccess={() => {
                            setIsFormOpen(false);
                            fetchProducts();
                        }}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
