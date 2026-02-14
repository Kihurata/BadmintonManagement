
import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';

interface DateSelectorProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {
    const dates = Array.from({ length: 17 }, (_, i) => addDays(new Date(), i - 11));
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex items-center gap-2 pl-4 py-2">
            <div
                ref={scrollRef}
                className="flex flex-1 gap-3 overflow-x-auto no-scrollbar pr-2"
            >
                {dates.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                        <div
                            key={date.toISOString()}
                            onClick={() => onSelectDate(date)}
                            className={cn(
                                "flex flex-col h-14 min-w-[3.5rem] shrink-0 items-center justify-center rounded-xl cursor-pointer transition-colors border border-transparent",
                                isSelected
                                    ? "bg-primary shadow-md shadow-primary/20"
                                    : "bg-white dark:bg-white/5 hover:border-gray-200 dark:hover:border-white/10"
                            )}
                        >
                            <span className={cn(
                                "text-xs font-medium",
                                isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                            )}>
                                {format(date, 'EEE')}
                            </span>
                            <span className={cn(
                                "text-lg font-bold",
                                isSelected ? "text-white" : "text-midnight dark:text-white"
                            )}>
                                {format(date, 'd')}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="pr-4 pl-1">
                <button className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-white/5 text-midnight dark:text-white shadow-sm border border-gray-100 dark:border-white/5">
                    <span className="material-symbols-outlined">calendar_month</span>
                </button>
            </div>
        </div>
    );
}
