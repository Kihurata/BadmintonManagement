
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Phone, History } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CustomerForm } from './customer-form';
import { cn } from '@/lib/utils';

export function CustomerList() {
    const [customers, setCustomers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [filter, setFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'LOYAL' | 'GUEST'>('ALL');
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

    const fetchCustomers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (data) {
            setCustomers(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCustomers();
    }, []);



    const handleEdit = (customer: any, e: React.MouseEvent) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        e.stopPropagation();
        setEditingCustomer(customer);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingCustomer(null);
        setIsFormOpen(true);
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) ||
            (c.phone && c.phone.includes(filter));
        const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Color logic for avatar based on index or random is nice, but fixed for now based on sample
    const getAvatarColors = (type: string) => {
        if (type === 'LOYAL') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
            {/* Header section is in page.tsx, here is just the list content usually, 
                BUT the user design has search/filter in header. 
                I will put search/filter here for better component isolation or 
                keep it in page.tsx and pass props. 
                Let's put everything in here for now to match the "screen" request,
                or properly split.
                I will implement the search/filter here.
             */}

            <div className="px-5 pt-4 pb-2 bg-background-light dark:bg-background-dark sticky top-0 z-10">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-gray-400 size-5" />
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-3 rounded-xl border-none ring-1 ring-gray-200/50 dark:ring-gray-800 bg-white dark:bg-gray-800 text-sm placeholder-gray-400 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:outline-none shadow-sm transition-shadow"
                        placeholder="Tìm tên hoặc số điện thoại..."
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setTypeFilter('ALL')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-transform active:scale-95",
                            typeFilter === 'ALL' ? "bg-primary text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300"
                        )}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setTypeFilter('LOYAL')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-transform active:scale-95",
                            typeFilter === 'LOYAL' ? "bg-primary text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300"
                        )}
                    >
                        Thân thiết
                    </button>
                    <button
                        onClick={() => setTypeFilter('GUEST')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-transform active:scale-95",
                            typeFilter === 'GUEST' ? "bg-primary text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300"
                        )}
                    >
                        Vãng lai
                    </button>
                </div>
            </div>

            {/* Main Content: Customer List */}
            <div className="flex-1 overflow-y-auto px-5 pb-24 no-scrollbar space-y-3">
                {filteredCustomers.map((customer) => (
                    <div
                        key={customer.id}
                        onClick={() => handleEdit(customer, {} as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-transparent dark:border-gray-800 hover:border-primary/20 transition-all active:scale-[0.99] cursor-pointer"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex gap-3">
                                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg", getAvatarColors(customer.type))}>
                                    {getInitials(customer.name)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{customer.name}</h3>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{customer.phone || 'Không có SĐT'}</p>
                                    <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border",
                                        customer.type === 'LOYAL'
                                            ? "bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-100 dark:border-purple-800"
                                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800"
                                    )}>
                                        {customer.type === 'LOYAL' ? 'Thân thiết' : 'Vãng lai'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <History className="size-5" />
                                </button>
                                {customer.phone && (
                                    <a href={`tel:${customer.phone}`} onClick={(e) => e.stopPropagation()} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                                        <Phone className="size-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                        {/* 
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <p className="text-xs text-gray-500">Lần cuối: <span className="font-medium">--/--/----</span></p>
                        </div>
                        */}
                    </div>
                ))}

                {filteredCustomers.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                        Không tìm thấy khách hàng.
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-24 right-5 z-20">
                <button
                    onClick={handleAddNew}
                    className="w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-emerald-600 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                    <Plus className="size-8" />
                </button>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
                    <CustomerForm
                        customerToEdit={editingCustomer}
                        onSuccess={() => {
                            setIsFormOpen(false);
                            fetchCustomers();
                        }}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
