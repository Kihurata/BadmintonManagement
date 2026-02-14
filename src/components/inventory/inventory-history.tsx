
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, AlertCircle, RefreshCw } from 'lucide-react';

export function InventoryHistory() {
    const [logs, setLogs] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('inventory_logs')
            .select(`
                *,
                products ( product_name, base_unit )
            `)
            .order('created_at', { ascending: false })
            .limit(50); // Limit to last 50 logs for now

        if (data) {
            setLogs(data);
        }
        setLoading(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'RESTOCK': return <ArrowDown className="text-emerald-500" />; // In
            case 'SALE': return <ArrowUp className="text-blue-500" />; // Out
            case 'DAMAGED': return <AlertCircle className="text-red-500" />; // Loss
            case 'INTERNAL_USE': return <RefreshCw className="text-orange-500" />;
            default: return <div className="w-4" />;
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'RESTOCK': return 'Nhập hàng';
            case 'SALE': return 'Bán hàng';
            case 'DAMAGED': return 'Hỏng/Hủy';
            case 'INTERNAL_USE': return 'Nội bộ';
            default: return type;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;

    if (logs.length === 0) return <div className="p-8 text-center text-gray-500">Chưa có lịch sử giao dịch.</div>;

    return (
        <div className="space-y-3 p-4 pb-24">
            {logs.map((log) => (
                <div key={log.id} className="bg-white dark:bg-[#0d1b17] p-3 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-gray-50 dark:bg-white/5`}>
                        {getIcon(log.type)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-midnight dark:text-white">
                                {log.products?.product_name}
                            </h4>
                            <span className={`text-sm font-bold ${log.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {log.quantity > 0 ? '+' : ''}{log.quantity} {log.products?.base_unit}
                            </span>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{getLabel(log.type)}</span>
                                {log.reason && <span className="italic"> - {log.reason}</span>}
                            </div>
                            <div className="text-[10px] text-gray-400">
                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
