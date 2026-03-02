import { cn } from "@/lib/utils";
import Link from "next/link";

interface QuickActionProps {
    icon: string;
    label: string;
    colorClass: string;
    href?: string;
    onClick?: () => void;
}

function QuickActionItem({ icon, label, colorClass, href, onClick }: QuickActionProps) {
    const content = (
        <button
            onClick={onClick}
            className="flex w-full flex-col items-start gap-3 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-500/50 hover:shadow-md transition-all group"
        >
            <div className={cn("size-10 rounded-full flex items-center justify-center transition-colors", colorClass)}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <span className="text-slate-900 dark:text-white text-sm font-bold">{label}</span>
        </button>
    );

    if (href) {
        return <Link href={href} className="w-full">{content}</Link>;
    }

    return content;
}

interface QuickActionsSectionProps {
    onNewBookingClick?: () => void;
}

export function QuickActionsSection({ onNewBookingClick }: QuickActionsSectionProps) {
    return (
        <div>
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight mb-3">Thao tác Nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
                <QuickActionItem
                    icon="add_circle"
                    label="Đặt sân mới"
                    onClick={onNewBookingClick}
                    colorClass="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white"
                />
                <QuickActionItem
                    icon="point_of_sale"
                    label="Bán nhanh"
                    onClick={() => {
                        // We'll wire up "Bán nhanh" (Quick Sale) later or open a modal
                        console.log("Quick sale clicked");
                    }}
                    colorClass="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white"
                />
                <QuickActionItem
                    icon="inventory_2"
                    label="Kho hàng"
                    href="/products"
                    colorClass="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white"
                />
                <QuickActionItem
                    icon="menu_book"
                    label="Báo cáo ngày"
                    href="/dashboard"
                    colorClass="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white"
                />
            </div>
        </div>
    );
}
