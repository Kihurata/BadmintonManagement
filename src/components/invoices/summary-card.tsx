
import { formatCurrency } from "@/lib/utils";

interface SummaryCardProps {
    revenue: number;
    courtRevenue: number;
    productRevenue: number;
    invoiceCount: number;
    avgOrderValue: number;
    growth?: number;
}

export function SummaryCard({ revenue, courtRevenue, productRevenue, invoiceCount, avgOrderValue, growth = 12 }: SummaryCardProps) {
    return (
        <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-2xl p-6 shadow-xl shadow-primary/20 mb-8 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <div className="absolute right-12 bottom-[-40px] w-24 h-24 bg-white opacity-5 rounded-full"></div>

            <div className="flex flex-col gap-6">
                <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">Tổng doanh thu</p>
                    <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(revenue)}</h2>
                </div>

                {/* Sub-metrics */}
                <div className="flex gap-4 mb-2">
                    <div className="bg-white/10 rounded-lg p-2.5 flex-1 shadow-inner">
                        <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-wider mb-0.5">Tiền sân</p>
                        <p className="font-semibold text-base">{formatCurrency(courtRevenue)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2.5 flex-1 shadow-inner">
                        <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-wider mb-0.5">Bán hàng</p>
                        <p className="font-semibold text-base">{formatCurrency(productRevenue)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/20 pt-4">
                    <div>
                        <p className="text-emerald-100 text-xs mb-0.5">Số hóa đơn</p>
                        <p className="font-semibold text-lg">{invoiceCount}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-white/20"></div>
                    <div>
                        <p className="text-emerald-100 text-xs mb-0.5">Trung bình / đơn</p>
                        <p className="font-semibold text-lg">{formatCurrency(avgOrderValue)}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-white/20"></div>
                    <div>
                        <p className="text-emerald-100 text-xs mb-0.5">Tăng trưởng</p>
                        <div className="flex items-center text-green-100 font-semibold text-lg">
                            <span className="material-symbols-outlined text-sm mr-0.5">trending_up</span>
                            {growth}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
