'use client';

import { useState, useEffect } from 'react';
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
import { format, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, AlertTriangle } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RecurringBookingFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  courts: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function RecurringBookingForm({ onSuccess, onCancel, courts: propCourts }: RecurringBookingFormProps) {
  const [courts, setCourts] = useState<any[]>(propCourts || []); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [courtId, setCourtId] = useState('');
  
  // Customer combobox
  const [customers, setCustomers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [customerId, setCustomerId] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);

  // Form fields
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]); // 0 = Sunday, 1 = Monday, etc.

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conflict states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

  // We fetch courts and customers
  useEffect(() => {
    const fetchData = async () => {
      if (!propCourts || propCourts.length === 0) {
        const courtsRes = await fetch('/api/courts');
        const courtsData = await courtsRes.json();
        if (courtsRes.ok && courtsData.success) {
          setCourts(courtsData.data);
          if (courtsData.data.length > 0) {
            setCourtId(courtsData.data[0].id);
          }
        }
      } else if (propCourts.length > 0 && !courtId) {
        setCourtId(propCourts[0].id);
      }

      const customersRes = await fetch('/api/customers');
      const customersData = await customersRes.json();
      if (customersRes.ok && customersData.success) {
        setCustomers(customersData.data);
      }
    };
    fetchData();
  }, [propCourts, courtId]);

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    if (!courtId || !startTime || !endTime || !startDate || !endDate || daysOfWeek.length === 0) {
      setError('Vui lòng điền đầy đủ thông tin và chọn ít nhất một ngày trong tuần.');
      setLoading(false);
      return;
    }

    // Limit range to max 3 months
    const maxEnd = addMonths(startDate, 3);
    if (endDate > maxEnd) {
      setError('Thời gian đăng ký lịch cố định không được vượt quá 3 tháng.');
      setLoading(false);
      return;
    }

    const payload = {
      courtId,
      customerId: customerId || null,
      startTime,
      endTime,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      daysOfWeek,
    };

    try {
      const res = await fetch('/api/v1/bookings/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        if (resData.error?.code === 'CONFLICT') {
          setConflicts(resData.error.conflicts || []);
          setShowConflictModal(true);
        } else {
          throw new Error(resData.error?.message || 'Đăng ký lịch cố định thất bại.');
        }
      } else {
        setShowConflictModal(false);
        onSuccess();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const weekdays = [
    { label: 'T2', value: 1 },
    { label: 'T3', value: 2 },
    { label: 'T4', value: 3 },
    { label: 'T5', value: 4 },
    { label: 'T6', value: 5 },
    { label: 'T7', value: 6 },
    { label: 'CN', value: 0 },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-xl overflow-hidden flex flex-col h-full max-h-[90vh] shadow-2xl border border-gray-100 dark:border-white/5">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đặt Lịch Cố Định Mới</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100 dark:border-red-950/30 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Customer Selector */}
        <div className="space-y-2 flex flex-col">
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Khách hàng</Label>
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={customerOpen}
                className="w-full justify-between font-normal rounded-xl h-11 border-gray-200 dark:border-white/10 dark:bg-white/5"
              >
                {customerId
                  ? customers.find((c) => c.id === customerId)?.name
                  : "Chọn khách hàng (Mặc định: Khách vãng lai)"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Tìm tên hoặc SĐT..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy khách hàng.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Khách vãng lai"
                      onSelect={() => {
                        setCustomerId("");
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
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chọn sân</Label>
          <Select value={courtId} onValueChange={setCourtId}>
            <SelectTrigger className="h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5">
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

        {/* Time Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Giờ bắt đầu</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Giờ kết thúc</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5"
              required
            />
          </div>
        </div>

        {/* Dates Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 flex flex-col">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ngày bắt đầu</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 flex flex-col">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ngày kết thúc</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal h-11 rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Days of Week Checkboxes */}
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ngày lặp lại trong tuần</Label>
          <div className="flex justify-between items-center gap-1.5 bg-gray-50 dark:bg-white/5 p-2 rounded-2xl border border-gray-100 dark:border-white/5">
            {weekdays.map((day) => {
              const isSelected = daysOfWeek.includes(day.value);
              return (
                <button
                  type="button"
                  key={day.value}
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={cn(
                    "flex-1 aspect-square rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center justify-center",
                    isSelected
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10"
                      : "bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onCancel}>Hủy</Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11"
          onClick={() => handleCreate()}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
          Đăng ký
        </Button>
      </div>

      {/* Conflict Modal */}
      <Dialog open={showConflictModal} onOpenChange={setShowConflictModal}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl border-none bg-white dark:bg-[#0d1b17] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-500">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
              <span>Phát hiện lịch trùng lặp</span>
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
              Sân bạn chọn đã có các ca đặt lịch trong khung giờ này vào các ngày sau:
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto my-4 border border-gray-100 dark:border-white/10 rounded-xl divide-y divide-gray-100 dark:divide-white/10 bg-gray-50/50 dark:bg-white/5 p-2">
            {conflicts.map((c, i) => (
              <div key={i} className="p-3 text-sm flex flex-col gap-0.5">
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {format(new Date(c.start_time), 'EEEE, dd/MM/yyyy', { locale: vi })}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(c.start_time), 'HH:mm')} - {format(new Date(c.end_time), 'HH:mm')} | Khách: {c.customerName}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 sm:justify-end">
            <Button
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              onClick={() => setShowConflictModal(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
