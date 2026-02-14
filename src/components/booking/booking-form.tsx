
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

interface BookingFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    selectedDate?: Date;
    selectedCourtId?: string | null;
    courts?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function BookingForm({ onSuccess, onCancel, selectedDate, selectedCourtId, courts: propCourts }: BookingFormProps) {
    const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
    const [courtId, setCourtId] = useState(selectedCourtId || '');
    const [courts, setCourts] = useState<any[]>(propCourts || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('1');

    // Customer Selection State
    const [customers, setCustomers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [customerId, setCustomerId] = useState('');
    const [customerOpen, setCustomerOpen] = useState(false);
    // If selecting "Guest" manually or not selecting anyone (default), we handle logic on submit

    // Fallback for manual entry if needed (removed as per requirement to use selector, but effectively "Guest" covers it)
    // We can add a "New Customer" button later inside the combobox if needed.

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Courts
            const { data: courtsData } = await supabase.from('courts').select('*').eq('is_active', true);
            if (courtsData) setCourts(courtsData);

            // Fetch Customers
            const { data: customersData } = await supabase.from('customers').select('*').order('name');
            if (customersData) setCustomers(customersData);
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!date || !startTime || !duration || !courtId) {
            setError('Vui lòng điền đầy đủ thông tin');
            setLoading(false);
            return;
        }

        // Calculate End Time
        const [hours, minutes] = startTime.split(':').map(Number);
        const start = new Date(date);
        start.setHours(hours, minutes, 0, 0);

        const end = new Date(start);
        // Fix: setHours truncates decimals, so 1.5 becomes 1. We need to add milliseconds.
        end.setTime(start.getTime() + parseFloat(duration) * 60 * 60 * 1000);

        // Check conflicts (Simple check)
        const { data: conflicts } = await supabase
            .from('bookings')
            .select('id')
            .eq('court_id', courtId)
            .neq('status', 'CANCELLED')
            .or(`and(start_time.lte.${start.toISOString()},end_time.gt.${start.toISOString()}),and(start_time.lt.${end.toISOString()},end_time.gte.${end.toISOString()})`);

        if (conflicts && conflicts.length > 0) {
            setError('Giờ này đã có người đặt');
            setLoading(false);
            return;
        }

        // Handle Customer ID
        let finalCustomerId = customerId;
        if (!finalCustomerId) {
            // Find or Create "Khách vãng lai"
            const { data: guest } = await supabase
                .from('customers')
                .select('id')
                .eq('name', 'Khách vãng lai')
                .single();

            if (guest) {
                finalCustomerId = guest.id;
            } else {
                // Creates guest if not exists
                const { data: newGuest, error: createError } = await supabase
                    .from('customers')
                    .insert([{ name: 'Khách vãng lai', type: 'GUEST' }])
                    .select()
                    .single();

                if (createError || !newGuest) {
                    setError('Không thể tạo khách vãng lai mặc định');
                    setLoading(false);
                    return;
                }
                finalCustomerId = newGuest.id;
            }
        }

        const { error: submitError } = await supabase
            .from('bookings')
            .insert([{
                court_id: courtId,
                customer_id: finalCustomerId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'CONFIRMED' // Default confirmed for now
            }]);

        setLoading(false);

        if (submitError) {
            setError(submitError.message);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h2 className="text-xl font-bold text-center">Đặt Sân Mới</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {/* Customer Selector */}
                <div className="space-y-2 flex flex-col">
                    <Label>Khách hàng</Label>
                    <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={customerOpen}
                                className="w-full justify-between font-normal"
                            >
                                {customerId
                                    ? customers.find((c) => c.id === customerId)?.name
                                    : "Chọn khách hàng (Mặc định: Vãng lai)"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Tìm tên hoặc SĐT..." />
                                <CommandList>
                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="Khách vãng lai"
                                            onSelect={() => {
                                                setCustomerId(""); // Clear to trigger default logic or find ID if mapped
                                                setCustomerOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    customerId === "" ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            Khách vãng lai (Mặc định)
                                        </CommandItem>
                                        {customers.map((customer) => (
                                            <CommandItem
                                                key={customer.id}
                                                value={customer.name}
                                                onSelect={() => {
                                                    setCustomerId(customer.id === customerId ? "" : customer.id);
                                                    setCustomerOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        customerId === customer.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Court */}
                <div className="space-y-2">
                    <Label htmlFor="court">Chọn sân</Label>
                    <Select value={courtId} onValueChange={setCourtId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn sân" />
                        </SelectTrigger>
                        <SelectContent>
                            {courts.map((court) => (
                                <SelectItem key={court.id} value={court.id}>
                                    {court.court_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Date */}
                <div className="space-y-2 flex flex-col">
                    <Label>Ngày đặt</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP", { locale: vi }) : <span>Chọn ngày</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Start Time */}
                    <div className="space-y-2">
                        <Label htmlFor="startTime">Giờ bắt đầu</Label>
                        <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="duration">Thời lượng (h)</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger>
                                <SelectValue placeholder="1 giờ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.5">30 phút</SelectItem>
                                <SelectItem value="1">1 giờ</SelectItem>
                                <SelectItem value="1.5">1.5 giờ</SelectItem>
                                <SelectItem value="2">2 giờ</SelectItem>
                                <SelectItem value="2.5">2.5 giờ</SelectItem>
                                <SelectItem value="3">3 giờ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

            </form>

            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Hủy</Button>
                <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Đặt sân
                </Button>
            </div>
        </div>
    );
}
