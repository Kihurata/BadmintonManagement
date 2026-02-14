
'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ProductList } from '@/components/products/product-list';
import { InventoryHistory } from '@/components/inventory/inventory-history';
import { StockAdjustmentForm } from '@/components/inventory/stock-adjustment-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils'; // Assuming you have this util, or clean classes

export default function ProductsPage() {
    const [activeTab, setActiveTab] = useState<'products' | 'inventory'>('products');
    const [isStockFormOpen, setIsStockFormOpen] = useState(false);

    return (
        <div className="bg-background-light dark:bg-background-dark font-sans text-midnight dark:text-gray-100 min-h-screen flex flex-col w-full">
            {/* Header */}
            <header className="flex-none bg-background-light dark:bg-background-dark pt-safe-top z-10 shadow-sm dark:shadow-none sticky top-0">
                <div className="flex items-center justify-between px-4 py-3">
                    <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-midnight dark:text-white" onClick={() => window.history.back()}>
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <div className="flex-1 flex justify-center">
                        {/* Tabs in Header */}
                        <div className="flex p-1 bg-gray-100 dark:bg-white/10 rounded-lg">
                            <button
                                onClick={() => setActiveTab('products')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                    activeTab === 'products'
                                        ? "bg-white dark:bg-primary text-black dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                Sản phẩm
                            </button>
                            <button
                                onClick={() => setActiveTab('inventory')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                    activeTab === 'inventory'
                                        ? "bg-white dark:bg-primary text-black dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            >
                                Lịch sử kho
                            </button>
                        </div>
                    </div>

                    {/* Adjustment Button */}
                    <button
                        onClick={() => setIsStockFormOpen(true)}
                        className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-emerald-600 dark:text-emerald-400"
                    >
                        <span className="material-symbols-outlined">swap_vert</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto w-full">
                {activeTab === 'products' ? <ProductList /> : <InventoryHistory />}
            </main>

            {/* Stock Adjustment Dialog */}
            <Dialog open={isStockFormOpen} onOpenChange={setIsStockFormOpen}>
                <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
                    <StockAdjustmentForm
                        onSuccess={() => {
                            setIsStockFormOpen(false);
                            // Ideally trigger refresh of history/products, 
                            // but since they are separate components, they fetch on mount.
                            // Simple page reload or context would handle this better.
                            // For MVP, just reload or rely on re-mount if user switches tabs.
                            if (activeTab === 'inventory') {
                                // Force re-render of inventory?
                                window.location.reload(); // Simple brute force for now to ensure consistency
                            } else {
                                window.location.reload();
                            }
                        }}
                        onCancel={() => setIsStockFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Bottom Navigation */}
            <BottomNav />

            {/* Styles */}
            <style jsx global>{`
        .pt-safe-top {
            padding-top: env(safe-area-inset-top, 0px);
        }
      `}</style>
        </div>
    );
}
