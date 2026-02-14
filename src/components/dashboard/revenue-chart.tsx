"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
    data: {
        name: string; // Month name (e.g. "Jan")
        total: number;
    }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Doanh thu theo tháng</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value / 1000000}M`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{payload[0].payload.name}</p>
                                            <p className="text-sm text-emerald-600 font-semibold">
                                                {formatCurrency(payload[0].value as number)}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="total"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-emerald-600"
                            barSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
