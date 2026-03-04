import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface OverviewMetricsProps {
    totalRevenue: number;
    revenueStatus: "up" | "down" | "neutral";
    revenueChangePercent: number;
    occupancyRate: number;
}

export function OverviewMetricsSection({
    totalRevenue,
    // revenueStatus, // unused right now
    revenueChangePercent,
    occupancyRate,
}: OverviewMetricsProps) {
    return (
        <div className="pb-8">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Tổng quan</h3>
                <Link href="/dashboard" className="text-slate-400 text-xs font-semibold hover:text-emerald-600">
                    Xem báo cáo
                </Link>
            </div>

            <div className="flex gap-4">
                {/* Revenue Card */}
                <div className="flex-1 bg-midnight dark:bg-slate-800 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-white/5 rounded-full size-24 blur-xl group-hover:bg-emerald-500/20 transition-colors" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <span className="material-symbols-outlined text-emerald-400">payments</span>
                            </div>
                            {revenueChangePercent > 0 && (
                                <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded-full">
                                    +{revenueChangePercent}%
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 text-xs font-medium mb-1">Tổng doanh thu</p>
                        <h4 className="text-2xl font-bold tracking-tight">{formatCurrency(totalRevenue)}</h4>
                    </div>
                </div>

                {/* Occupancy Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${occupancyRate}%` }}
                        />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                <span className="material-symbols-outlined text-slate-900 dark:text-white">groups</span>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">Tỉ lệ lấp đầy</p>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{occupancyRate}%</h4>
                    </div>
                </div>
            </div>
        </div>
    );
}
