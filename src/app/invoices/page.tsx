
'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { StickyHeader } from '@/components/home/sticky-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TransactionHistory } from '@/components/invoices/transaction-history';
import { ReceivablesLedger } from '@/components/invoices/receivables-ledger';

export default function InvoicesPage() {
    const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'RECEIVABLES'>('RECEIVABLES');
    const [generating, setGenerating] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleCloseDay = async () => {
        if (!confirm('Bạn có chắc chắn muốn kết thúc ngày? Hệ thống sẽ tự động tạo hóa đơn cho các đơn chưa thanh toán.')) return;

        setGenerating(true);
        try {
            const res = await fetch('/api/invoices/auto-generate', {
                method: 'POST',
                body: JSON.stringify({ date: new Date() }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                alert(`Đã tạo thành công ${data.generated} hóa đơn.`);
                setRefreshKey(prev => prev + 1); // Trigger remount/refetch in child components
            } else {
                alert('Có lỗi xảy ra: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#0d1b17] font-sans text-slate-900 dark:text-gray-100 min-h-screen flex flex-col overflow-hidden w-full">
            <Sidebar />
            <div className="flex-1 flex flex-col md:pl-64 transition-all overflow-hidden relative h-screen">
                {/* Mobile Header */}
                <div className="md:hidden">
                    <StickyHeader
                        title="Hóa Đơn & Công Nợ"
                        rightContent={
                            <button
                                onClick={handleCloseDay}
                                disabled={generating}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors disabled:opacity-50 flex items-center gap-1 h-9 border-2 border-slate-900 dark:border-white"
                                title="Kết thúc ngày"
                            >
                                {generating ? '...' : (
                                    <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                                )}
                            </button>
                        }
                    />
                </div>

                {/* Content */}
                <main className="flex-1 px-4 md:px-6 pb-24 top-6 md:pt-10 overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Sổ Thu Chi</h1>
                        <div className="hidden md:block">
                            <button
                                onClick={handleCloseDay}
                                disabled={generating}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] border-2 border-slate-900 dark:border-red-900 transition-transform active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex items-center gap-2"
                            >
                                {generating ? 'Đang xử lý...' : (
                                    <>
                                        <span className="material-symbols-outlined font-bold">lock_clock</span>
                                        Kết thúc ngày
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Brutalist Tab Control */}
                    <div className="mb-8">
                        <SegmentedControl
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as 'TRANSACTIONS' | 'RECEIVABLES')}
                            tabs={[
                                { id: 'RECEIVABLES', label: 'Công Nợ' },
                                { id: 'TRANSACTIONS', label: 'Lịch Sử Giao Dịch' },
                            ]}
                        />
                    </div>

                    {/* Active View */}
                    <div key={refreshKey} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {activeTab === 'RECEIVABLES' ? <ReceivablesLedger /> : <TransactionHistory />}
                    </div>

                </main>

                {/* Bottom Nav */}
                <div className="md:hidden flex-none z-50">
                    <BottomNav />
                </div>

                {/* Safe Area Padding for mobile */}
                <style jsx global>{`
                .pb-safe-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 20px);
                }
            `}</style>
            </div>
        </div>
    );
}
