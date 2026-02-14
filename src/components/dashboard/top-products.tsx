import { formatCurrency } from "@/lib/utils";

interface TopProductsProps {
    products: {
        id: string;
        name: string;
        sales: number; // Quantity sold
        revenue: number; // Total revenue
    }[];
}

export function TopProducts({ products }: TopProductsProps) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Top Sản Phẩm Bán Chạy</h3>
            <div className="space-y-4">
                {products.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold text-sm">
                                {index + 1}
                            </div>
                            <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.sales} đã bán</p>
                            </div>
                        </div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-200">
                            {formatCurrency(product.revenue)}
                        </div>
                    </div>
                ))}
                {products.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu bán hàng</p>
                )}
            </div>
        </div>
    );
}
