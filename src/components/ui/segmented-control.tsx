'use client';

import React from 'react';

interface SegmentedControlProps {
    tabs: { id: string; label: React.ReactNode }[];
    activeTab: string;
    onChange: (id: string) => void;
}

export function SegmentedControl({ tabs, activeTab, onChange }: SegmentedControlProps) {
    return (
        <div className="flex w-full overflow-hidden border-2 border-slate-900 dark:border-white rounded-none bg-white dark:bg-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
                            flex-1 py-3 px-4 text-sm md:text-base font-bold text-center uppercase tracking-wider
                            transition-all duration-200 border-r-2 last:border-r-0 border-slate-900 dark:border-white
                            ${isActive
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
