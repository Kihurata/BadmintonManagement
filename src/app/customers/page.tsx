
'use client';

import { BottomNav } from '@/components/layout/bottom-nav';
import { CustomerList } from '@/components/customers/customer-list';

export default function CustomersPage() {
    return (
        <div className="bg-background-light dark:bg-background-dark font-sans text-midnight dark:text-gray-100 min-h-screen flex flex-col w-full">
            {/* Header is handled inside CustomerList for this specific design (filters etc) OR we wrap here.
          The user design has header integral to the page. 
          CustomerList component includes the sticky header with Search/Filter.
      */}

            <header className="px-5 pt-12 pb-2 bg-background-light dark:bg-background-dark sticky top-0 z-10 bg-white/0">
                {/* We can put the top user/avatar bar here if we want global reuse, but for now specific to this page as per design */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center text-white font-bold">
                                AD
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-gray-800"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Hôm nay</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">Xin chào, Admin</span>
                        </div>
                    </div>
                    <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-500 dark:text-gray-300">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></span>
                    </button>
                </div>
                <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white mb-2">Khách Hàng</h1>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto w-full flex flex-col">
                <CustomerList />
            </main>

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
