'use client';

import React from 'react';

interface SegmentedControlProps {
    tabs: { id: string; label: React.ReactNode }[];
    activeTab: string;
    onChange: (id: string) => void;
}

export function SegmentedControl({ tabs, activeTab, onChange }: SegmentedControlProps) {
    return (
        <div className="flex w-full overflow-hidden rounded-xl bg-gray-100/80 dark:bg-gray-800/80 p-1">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
                            flex-1 py-2.5 px-4 text-sm md:text-base font-medium text-center
                            transition-all duration-200 rounded-lg
                            ${isActive
                                ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm'
                                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
