import { ArrowDown, ArrowUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: number | string;
    type?: "currency" | "number";
    icon?: React.ReactNode;
    trend?: {
        value: number; // percentage
        isPositive: boolean;
    };
    className?: string; // Allow custom classes like background color
}

export function StatCard({ title, value, type = "currency", icon, trend, className }: StatCardProps) {
    const displayValue = type === "currency" && typeof value === "number"
        ? formatCurrency(value)
        : value;

    return (
        <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{displayValue}</h3>
                </div>
                {icon && <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{icon}</div>}
            </div>

            {trend && (
                <div className={`flex items-center text-xs font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {trend.isPositive ? <ArrowUp className="size-3 mr-1" /> : <ArrowDown className="size-3 mr-1" />}
                    {Math.abs(trend.value)}%
                    <span className="text-gray-400 font-normal ml-1">so với tháng trước</span>
                </div>
            )}
        </div>
    );
}
