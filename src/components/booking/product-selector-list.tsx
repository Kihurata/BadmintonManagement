import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface ProductSelectorItem {
    key: string;
    productId: string;
    name: string;
    unit: string;
    price: number;
    isPack: boolean;
    deduct: number;
}

interface ProductSelectorListProps {
    products: ProductSelectorItem[];
    quantities: Record<string, number>; // Maps product.key -> quantity
    onAdd: (product: ProductSelectorItem) => void;
    onUpdateQuantity: (product: ProductSelectorItem, delta: number) => void;
    loading?: boolean;
}

export function ProductSelectorList({
    products,
    quantities,
    onAdd,
    onUpdateQuantity,
    loading = false
}: ProductSelectorListProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isPopularProduct = (name: string): boolean => {
        const popularKeywords = ["bamboo", "revive"];
        const lowerName = name.toLowerCase();
        return popularKeywords.some(keyword => lowerName.includes(keyword));
    };

    const popularProducts = products.filter(p => isPopularProduct(p.name));
    const otherProducts = products.filter(p => !isPopularProduct(p.name));

    const displayedProducts = isExpanded
        ? [...popularProducts, ...otherProducts]
        : (popularProducts.length > 0 ? popularProducts : products.slice(0, 4));

    if (products.length === 0) {
        return <div className="text-center py-4 text-sm text-gray-500">Không có sản phẩm nào trong kho.</div>;
    }

    return (
        <div className="space-y-3">
            {displayedProducts.map(product => {
                const quantity = quantities[product.key] || 0;

                return (
                    <div
                        key={product.key}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-xl flex justify-between items-center shadow-sm"
                    >
                        <div>
                            <div className="font-bold text-midnight dark:text-gray-100">{product.name}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                {formatCurrency(product.price)} / {product.unit}
                            </div>
                        </div>

                        {quantity === 0 ? (
                            <Button
                                size="sm"
                                className="bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg shadow-none"
                                onClick={() => onAdd(product)}
                                disabled={loading}
                            >
                                <Plus className="size-4 mr-1" /> Thêm
                            </Button>
                        ) : (
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button
                                    onClick={() => onUpdateQuantity(product, -1)}
                                    className="size-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-md shadow-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
                                    disabled={loading}
                                >
                                    <Minus className="size-4" />
                                </button>
                                <span className="w-8 text-center font-bold text-lg text-midnight dark:text-white">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => onUpdateQuantity(product, 1)}
                                    className="size-8 flex items-center justify-center bg-emerald-600 rounded-md shadow-sm text-white hover:bg-emerald-700 transition-colors"
                                    disabled={loading}
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {products.length > (popularProducts.length > 0 ? popularProducts.length : 4) && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
                >
                    {isExpanded ? (
                        <>
                            Thu gọn sản phẩm khác
                            <ChevronUp className="size-4" />
                        </>
                    ) : (
                        <>
                            Xem thêm sản phẩm khác
                            <ChevronDown className="size-4" />
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
