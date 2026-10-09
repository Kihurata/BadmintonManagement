import { StickyHeader } from "@/components/home/sticky-header";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";

function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse bg-slate-200/80 dark:bg-slate-700/50 rounded-2xl", className)} />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <SkeletonCard className="h-8 w-64" />
                    <SkeletonCard className="h-4 w-80" />
                </div>
                <SkeletonCard className="h-12 w-48 rounded-2xl" />
            </div>

            <div>
                <SkeletonCard className="h-4 w-40 mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <SkeletonCard className="h-32" />
                    <SkeletonCard className="h-32" />
                    <SkeletonCard className="h-32" />
                    <SkeletonCard className="h-32" />
                </div>
            </div>

            <div>
                <SkeletonCard className="h-4 w-48 mb-3" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <SkeletonCard className="h-52" />
                    <SkeletonCard className="h-52" />
                    <SkeletonCard className="h-52" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <SkeletonCard className="h-72" />
                    <SkeletonCard className="h-64" />
                </div>
                <SkeletonCard className="lg:col-span-1 h-[420px]" />
            </div>
        </div>
    );
}

export default function DashboardLoading() {
    return (
        <div className="bg-background-light dark:bg-background-dark h-screen overflow-hidden flex flex-col text-gray-900 dark:text-gray-100">
            <Sidebar />

            <div className="flex-1 flex flex-col md:pl-64 transition-all overflow-hidden relative">
                <div className="md:hidden">
                    <StickyHeader title="Báo cáo" />
                </div>

                <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-24 md:pb-10 no-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <DashboardSkeleton />
                    </div>
                </main>

                <div className="md:hidden z-50 sticky bottom-0 left-0 right-0 w-full mt-auto">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
}
