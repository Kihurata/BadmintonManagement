import { formatCurrency, cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    sales: number;    // quantity sold
    revenue: number;  // total revenue
    profit: number;   // total profit (revenue - cogs)
    margin: number;   // profit margin % (0–100)
}

interface TopProductsProps {
    products: Product[];
}

export function TopProducts({ products }: TopProductsProps) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-fit">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Top Sản Phẩm Bán Chạy</h3>

            {/* Header row */}
            {products.length > 0 && (
                <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 pb-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="w-8" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sản phẩm</span>
                    <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lãi</span>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                {products.map((product, index) => (
                    <div key={product.id} className="grid grid-cols-[auto_1fr_auto] gap-x-3 items-center py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition px-1">
                        {/* Rank badge */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-black text-sm shrink-0">
                            {index + 1}
                        </div>

                        {/* Product info */}
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{product.sales} đã bán</span>
                                <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                                <span className="text-xs text-gray-500">{formatCurrency(product.revenue)}</span>
                            </div>
                        </div>

                        {/* Profit + Margin */}
                        <div className="text-right shrink-0">
                            <p className={cn(
                                "text-sm font-bold tabular-nums",
                                product.profit >= 0 ? "text-emerald-600" : "text-red-500"
                            )}>
                                {formatCurrency(Math.abs(product.profit))}
                            </p>
                            <span className={cn(
                                "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5",
                                product.margin >= 30
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                                    : product.margin >= 10
                                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-500"
                            )}>
                                {product.margin.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ))}

                {products.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-6">Chưa có dữ liệu bán hàng</p>
                )}
            </div>
        </div>
    );
}
