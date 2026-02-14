import { StatCard } from "./stat-card";
import { DollarSign, CreditCard, Banknote, ShoppingBag, LayoutDashboard } from "lucide-react";

interface MetricGridProps {
    totalRevenue: number;
    rentRevenue: number;
    productRevenue: number;
    cashRevenue: number;
    bankRevenue: number;
}

export function MetricGrid({ totalRevenue, rentRevenue, productRevenue, cashRevenue, bankRevenue }: MetricGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
                title="Tổng Doanh Thu"
                value={totalRevenue}
                icon={<DollarSign className="size-5" />}
                className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
            />
            <StatCard
                title="Tiền Sân"
                value={rentRevenue}
                icon={<LayoutDashboard className="size-5" />}
            />
            <StatCard
                title="Bán Hàng"
                value={productRevenue}
                icon={<ShoppingBag className="size-5" />}
            />
            <StatCard
                title="Tiền Mặt"
                value={cashRevenue}
                icon={<Banknote className="size-5" />}
            />
            <StatCard
                title="Chuyển Khoản"
                value={bankRevenue}
                icon={<CreditCard className="size-5" />}
            />
        </div>
    );
}
