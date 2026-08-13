'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RecurringBookingForm } from './recurring-booking-form';
import { Loader2, Plus, Calendar, User, Trash2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { generateVietQrUrl } from '@/lib/invoice-utils';

interface RecurringRule {
  id: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  court_id: string;
  courts: { court_name: string } | null;
  customer_id: string;
  customers: { name: string; phone: string } | null;
}

interface RecurringRuleCostSummary {
  ruleId: string;
  totalSessions: number;
  completedSessions: number;
  checkedInSessions: number;
  cancelledSessions: number;
  pendingSessions: number;
  financials: {
    totalPaid: number;
    totalUnpaid: number;
    estimatedFuture: number;
    totalEstimatedSeries: number;
  };
}

interface UncheckedBookingItem {
  id: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'PENDING';
  court_name: string;
  customer_name: string;
  estimatedFee: number;
  isPrepaid: boolean;
}

interface AutoCheckInPreviewData {
  ruleId: string;
  month: string;
  totalSessions: number;
  alreadyCheckedInCount: number;
  uncheckedSessionsCount: number;
  totalEstimatedFee: number;
  uncheckedBookings: UncheckedBookingItem[];
}

interface RecurringBookingsTabProps {
  courts: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  customers: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function RecurringBookingsTab({ courts, customers }: RecurringBookingsTabProps) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month Filtering State
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RecurringRule | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Prepayment States
  const [costs, setCosts] = useState<Record<string, RecurringRuleCostSummary>>({});
  const [prepayRule, setPrepayRule] = useState<RecurringRule | null>(null);
  const [prepayMethod, setPrepayMethod] = useState<'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [prepayLoading, setPrepayLoading] = useState(false);

  // Auto Check-in Preview States
  const [autoCheckInRule, setAutoCheckInRule] = useState<RecurringRule | null>(null);
  const [autoCheckInMonth, setAutoCheckInMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [previewData, setPreviewData] = useState<AutoCheckInPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [executeLoading, setExecuteLoading] = useState(false);

  // Renewal Form States
  const [renewRule, setRenewRule] = useState<RecurringRule | null>(null);
  const [renewCourtId, setRenewCourtId] = useState<string>('');
  const [renewStartTime, setRenewStartTime] = useState<string>('18:00');
  const [renewEndTime, setRenewEndTime] = useState<string>('20:00');
  const [renewDaysOfWeek, setRenewDaysOfWeek] = useState<number[]>([]);
  const [renewStartDate, setRenewStartDate] = useState<string>('');
  const [renewEndDate, setRenewEndDate] = useState<string>('');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewConflicts, setRenewConflicts] = useState<any[] | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/bookings/recurring');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Không thể tải danh sách lịch cố định');
      }
      const loadedRules: RecurringRule[] = data.data || [];
      setRules(loadedRules);

      // Fetch cost summaries in bulk for all rules
      if (loadedRules.length > 0) {
        const ruleIds = loadedRules.map((r) => r.id).join(',');
        const costsRes = await fetch(`/api/v1/bookings/recurring/costs?ruleIds=${ruleIds}`);
        const costsData = await costsRes.json();
        if (costsRes.ok && costsData.success && Array.isArray(costsData.data)) {
          const costMap: Record<string, RecurringRuleCostSummary> = {};
          costsData.data.forEach((c: RecurringRuleCostSummary) => {
            costMap[c.ruleId] = c;
          });
          setCosts(costMap);
        }
      } else {
        setCosts({});
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Filter rules by Month
  const filteredRules = useMemo(() => {
    if (selectedMonth === 'ALL') return rules;
    const [yearStr, monthNumStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);
    if (isNaN(year) || isNaN(monthNum)) return rules;

    const startOfMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endOfMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return rules.filter((r) => {
      const rStart = r.start_date.substring(0, 10);
      const rEnd = r.end_date ? r.end_date.substring(0, 10) : '9999-12-31';
      return rStart <= endOfMonthStr && rEnd >= startOfMonthStr;
    });
  }, [rules, selectedMonth]);

  // Group filtered rules by Customer
  const groupedRules = useMemo(() => {
    const map: Record<string, { customerId: string; customerName: string; customerPhone: string; rules: RecurringRule[] }> = {};
    filteredRules.forEach((rule) => {
      const cId = rule.customer_id || 'guest';
      if (!map[cId]) {
        map[cId] = {
          customerId: cId,
          customerName: rule.customers?.name || 'Khách vãng lai',
          customerPhone: rule.customers?.phone || '',
          rules: [],
        };
      }
      map[cId].rules.push(rule);
    });
    return Object.values(map);
  }, [filteredRules]);

  const openRenewModal = (rule: RecurringRule) => {
    setRenewRule(rule);
    setRenewCourtId(rule.court_id);
    setRenewStartTime(rule.start_time.substring(0, 5));
    setRenewEndTime(rule.end_time.substring(0, 5));
    setRenewDaysOfWeek(rule.days_of_week || []);

    const rawEndDate = String(rule.end_date).substring(0, 10);
    const srcEndDate = new Date(rawEndDate + 'T00:00:00');
    const nextMonthStart = new Date(srcEndDate.getFullYear(), srcEndDate.getMonth() + 1, 1);
    const nextMonthEnd = new Date(srcEndDate.getFullYear(), srcEndDate.getMonth() + 2, 0);

    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setRenewStartDate(formatYMD(nextMonthStart));
    setRenewEndDate(formatYMD(nextMonthEnd));
    setRenewConflicts(null);
  };

  const handleRenewRuleSubmit = async (skipConflicts = false) => {
    if (!renewRule) return;
    setRenewLoading(true);
    setRenewConflicts(null);
    try {
      const res = await fetch('/api/v1/bookings/recurring/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: renewRule.id,
          courtId: renewCourtId,
          startTime: renewStartTime,
          endTime: renewEndTime,
          daysOfWeek: renewDaysOfWeek,
          targetStartDate: renewStartDate,
          targetEndDate: renewEndDate,
          skipConflicts,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setRenewRule(null);
        setRenewConflicts(null);
        fetchRules();
      } else if (data.error && data.error.code === 'CONFLICT' && data.error.conflicts) {
        setRenewConflicts(data.error.conflicts);
      } else {
        alert('Lỗi gia hạn: ' + (data.error?.message || 'Có lỗi xảy ra'));
      }
    } catch (err) {
      console.error('Error renewing rule:', err);
      alert('Lỗi kết nối khi gia hạn lịch cố định');
    } finally {
      setRenewLoading(false);
    }
  };

  const fetchPreviewData = useCallback(async (ruleId: string, month: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/v1/bookings/recurring/auto-checkin?ruleId=${ruleId}&month=${month}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Không thể tải thông tin ca chưa check-in');
      }
      setPreviewData(data.data);
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleConfirmAutoCheckIn = async () => {
    if (!autoCheckInRule) return;
    setExecuteLoading(true);
    try {
      const res = await fetch('/api/v1/bookings/recurring/auto-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: autoCheckInRule.id,
          month: autoCheckInMonth,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Check-in thất bại');
      }

      setAutoCheckInRule(null);
      setPreviewData(null);
      fetchRules();
      alert(`Thành công check-in ${data.data.checkedInCount} ca! Tổng tiền: ${formatCurrency(data.data.totalAmount)}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExecuteLoading(false);
    }
  };

  const handlePrepaySubmit = async () => {
    if (!prepayRule) return;
    setPrepayLoading(true);
    try {
      const res = await fetch('/api/v1/bookings/recurring/prepay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: prepayRule.id,
          paymentMethod: prepayMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Thanh toán trước thất bại');
      }

      setPrepayRule(null);
      fetchRules();
      alert('Thanh toán trước toàn bộ chuỗi lịch cố định thành công!');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPrepayLoading(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/v1/bookings/recurring?id=${selectedRule.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Xóa lịch cố định thất bại.');
      }
      setIsDeleteOpen(false);
      setSelectedRule(null);
      fetchRules();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getDayNames = (days: number[]) => {
    if (!days || !Array.isArray(days)) return 'N/A';
    const map: Record<number, string> = {
      1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 0: 'CN'
    };
    const sortedDays = [...days].sort((a, b) => {
      const valA = a === 0 ? 7 : a;
      const valB = b === 0 ? 7 : b;
      return valA - valB;
    });
    return sortedDays.map((d) => map[d]).join(', ');
  };

  const formatRuleTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full p-4 md:p-6 space-y-4">
      {/* Tab Header Actions & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0d1b17]/60 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">event_repeat</span>
            Lịch Cố Định Đang Hoạt Động
          </h2>
          <p className="text-xs text-gray-500">Quản lý và gia hạn lịch đặt sân cố định hàng tháng theo từng khách hàng.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Filter Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value={format(new Date(), 'yyyy-MM')}>Tháng hiện tại ({format(new Date(), 'MM/yyyy')})</option>
              <option value={format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'yyyy-MM')}>
                Tháng sau ({format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'MM/yyyy')})
              </option>
              <option value="ALL">Tất cả các tháng</option>
            </select>
          </div>

          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 h-9 px-3 shrink-0 shadow-md shadow-emerald-600/10 active:scale-95 transition-all text-xs font-semibold"
          >
            <Plus className="size-4" />
            <span>Đăng ký mới</span>
          </Button>
        </div>
      </div>

      {/* Rules grouped by Customer */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-950/30 text-sm">
          Lỗi: {error}
        </div>
      ) : groupedRules.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-gray-50/20 dark:bg-white/5">
          <div className="size-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4 text-emerald-600">
            <Calendar className="size-8" />
          </div>
          <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Chưa có lịch cố định trong tháng này</h3>
          <p className="text-gray-500 text-sm max-w-sm mb-6">
            Chọn tháng khác trên bộ lọc hoặc đăng ký mới lịch cố định cho khách hàng.
          </p>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
          >
            <Plus className="size-4" />
            Đăng ký ngay
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-20">
          {groupedRules.map((group) => (
            <div
              key={group.customerId}
              className="bg-white dark:bg-[#0d1b17]/60 rounded-2xl p-4 border border-gray-200 dark:border-white/10 shadow-sm space-y-3"
            >
              {/* Customer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                    <User className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">{group.customerName}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {group.rules.length} khung giờ
                      </span>
                    </div>
                    {group.customerPhone && <p className="text-xs text-gray-500">SĐT: {group.customerPhone}</p>}
                  </div>
                </div>
              </div>

              {/* Nested Rules List for Customer */}
              <div className="space-y-3">
                {group.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-gray-50/70 dark:bg-slate-900/40 rounded-xl p-3.5 border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-lg">sports_tennis</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {rule.courts?.court_name || 'Không xác định'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                            {getDayNames(rule.days_of_week)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>{formatRuleTime(rule.start_time)} - {formatRuleTime(rule.end_time)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            <span>
                              {format(new Date(rule.start_date), 'dd/MM/yyyy')}
                              <ArrowRight className="size-3 inline mx-1" />
                              {rule.end_date ? format(new Date(rule.end_date), 'dd/MM/yyyy') : 'Vô hạn'}
                            </span>
                          </span>
                        </div>

                        {costs[rule.id] && (
                          <div className="flex items-center gap-3 text-xs mt-1 border-t border-gray-100 dark:border-white/5 pt-1">
                            <span className="text-gray-500">Đã trả: <strong className="text-emerald-600 font-bold">{formatCurrency(costs[rule.id].financials.totalPaid)}</strong></span>
                            {costs[rule.id].financials.totalUnpaid + costs[rule.id].financials.estimatedFuture > 0 ? (
                              <span className="text-gray-500">Còn lại: <strong className="text-red-500 font-bold">{formatCurrency(costs[rule.id].financials.totalUnpaid + costs[rule.id].financials.estimatedFuture)}</strong></span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Đã đóng tiền trước</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5">
                      <Button
                        variant="outline"
                        onClick={() => openRenewModal(rule)}
                        className="rounded-xl border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:border-emerald-900/30 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 h-8 px-2.5 shrink-0 shadow-sm active:scale-95 transition-all text-xs gap-1 font-semibold"
                      >
                        <span className="material-symbols-outlined text-sm">autorenew</span>
                        <span>Gia hạn tháng sau</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setAutoCheckInRule(rule);
                          const currentMonthStr = format(new Date(), 'yyyy-MM');
                          setAutoCheckInMonth(currentMonthStr);
                          fetchPreviewData(rule.id, currentMonthStr);
                        }}
                        className="rounded-xl border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-blue-900/30 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 h-8 px-2.5 shrink-0 shadow-sm active:scale-95 transition-all text-xs gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">fact_check</span>
                        <span>Check-in cả tháng</span>
                      </Button>

                      {costs[rule.id] && (costs[rule.id].financials.totalUnpaid + costs[rule.id].financials.estimatedFuture > 0) && (
                        <Button
                          onClick={() => {
                            setPrepayRule(rule);
                            setPrepayMethod('BANK_TRANSFER');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 h-8 px-2.5 shrink-0 shadow-sm active:scale-95 transition-all text-xs"
                        >
                          <Plus className="size-3.5" />
                          <span>Thanh toán trước</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRule(rule);
                          setIsDeleteOpen(true);
                        }}
                        className="rounded-xl border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-950/30 dark:hover:bg-red-950/20 text-red-500 h-8 w-8 p-0 shrink-0 shadow-sm"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Đăng ký lịch cố định mới</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">
              Tạo lịch cố định tự động lặp lại hàng tuần cho khách hàng.
            </DialogDescription>
          </DialogHeader>
          <RecurringBookingForm
            courts={courts}
            customers={customers}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchRules();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Rule Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Xóa lịch cố định</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Hành động này sẽ hủy bỏ cài đặt lịch cố định và các ca đặt sân chưa thanh toán liên quan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Bạn có chắc chắn muốn xóa lịch cố định sân{' '}
              <strong className="text-gray-900 dark:text-white">{selectedRule?.courts?.court_name}</strong> của{' '}
              <strong className="text-gray-900 dark:text-white">{selectedRule?.customers?.name}</strong>?
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t dark:border-white/5 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl h-10 px-4 text-xs">
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRule}
              disabled={deleteLoading}
              className="rounded-xl h-10 px-4 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading && <Loader2 className="animate-spin size-3.5 mr-1" />}
              Xác nhận xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prepayment Dialog */}
      <Dialog open={prepayRule !== null} onOpenChange={(open) => !open && setPrepayRule(null)}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Thanh toán trước lịch cố định</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Thanh toán toàn bộ phí thuê sân cho cả chuỗi lịch cố định.
            </DialogDescription>
          </DialogHeader>

          {prepayRule && costs[prepayRule.id] && (
            <div className="py-4 space-y-4">
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl space-y-2 border border-gray-100 dark:border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{prepayRule.customers?.name || 'Khách vãng lai'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sân đặt:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{prepayRule.courts?.court_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tổng ca đã trả tiền:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(costs[prepayRule.id].financials.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-bold">Cần thanh toán trước:</span>
                  <span className="font-bold text-red-500 text-sm">
                    {formatCurrency(costs[prepayRule.id].financials.totalUnpaid + costs[prepayRule.id].financials.estimatedFuture)}
                  </span>
                </div>
              </div>

              {/* Method Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                  Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrepayMethod('BANK_TRANSFER')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      prepayMethod === 'BANK_TRANSFER'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">qr_code_2</span>
                    Chuyển khoản (VietQR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrepayMethod('CASH')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      prepayMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">payments</span>
                    Tiền mặt
                  </button>
                </div>
              </div>

              {/* VietQR Preview if Bank Transfer */}
              {prepayMethod === 'BANK_TRANSFER' && (
                <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <img
                    src={generateVietQrUrl(
                      costs[prepayRule.id].financials.totalUnpaid + costs[prepayRule.id].financials.estimatedFuture,
                      `Thanh toán trước lịch cố định ${prepayRule.customers?.name || ''}`
                    )}
                    alt="VietQR Payment"
                    className="w-44 h-44 object-contain rounded-lg border"
                  />
                  <p className="text-[11px] text-gray-500 mt-2 text-center">Quét mã VietQR để chuyển khoản trước cho chuỗi lịch này.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPrepayRule(null)} className="rounded-xl h-10 text-xs px-4">
                  Hủy
                </Button>
                <Button
                  onClick={handlePrepaySubmit}
                  disabled={prepayLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-semibold shadow-md active:scale-95 transition-all gap-1.5"
                >
                  {prepayLoading && <Loader2 className="animate-spin size-3.5" />}
                  Xác nhận đã thu tiền
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto Check-in Preview Dialog */}
      <Dialog open={autoCheckInRule !== null} onOpenChange={(open) => !open && setAutoCheckInRule(null)}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">fact_check</span>
              Check-in lịch cố định
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Xem trước và xác nhận check-in hàng loạt cho tất cả các ca trong tháng.
            </DialogDescription>
          </DialogHeader>

          {autoCheckInRule && (
            <div className="py-3 space-y-4">
              {/* Month Selector */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 text-xs">
                <span className="text-gray-600 dark:text-gray-400 font-semibold">Chọn tháng check-in:</span>
                <input
                  type="month"
                  value={autoCheckInMonth}
                  onChange={(e) => {
                    setAutoCheckInMonth(e.target.value);
                    fetchPreviewData(autoCheckInRule.id, e.target.value);
                  }}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 font-bold text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              {previewLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-500 text-xs">
                  <Loader2 className="animate-spin size-6 text-blue-600 mb-2" />
                  Đang tính toán các ca chưa check-in...
                </div>
              ) : previewError ? (
                <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs">{previewError}</div>
              ) : previewData ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                      <p className="text-gray-400 text-[10px]">Tổng số ca</p>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{previewData.totalSessions}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <p className="text-emerald-600 text-[10px]">Đã check-in</p>
                      <p className="font-bold text-sm text-emerald-600">{previewData.alreadyCheckedInCount}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <p className="text-blue-600 text-[10px]">Cần check-in</p>
                      <p className="font-bold text-sm text-blue-600">{previewData.uncheckedSessionsCount}</p>
                    </div>
                  </div>

                  {previewData.uncheckedSessionsCount === 0 ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs text-center font-semibold">
                      Tất cả các ca trong tháng {previewData.month} đã được check-in!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-gray-300">
                        <span>Danh sách {previewData.uncheckedSessionsCount} ca chuẩn bị check-in:</span>
                        <span className="text-blue-600">Tổng tiền: {formatCurrency(previewData.totalEstimatedFee)}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {previewData.uncheckedBookings.map((b) => {
                          const startDate = new Date(b.start_time);
                          const endDate = new Date(b.end_time);
                          const timeFormatted = `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;
                          const dateFormatted = format(startDate, 'dd/MM/yyyy');
                          return (
                            <div
                              key={b.id}
                              className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white mr-2">{dateFormatted}</span>
                                <span className="text-gray-500 font-medium">({timeFormatted})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {b.isPrepaid ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Đã trả trước</span>
                                ) : (
                                  <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(b.estimatedFee)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Dialog Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t dark:border-white/5">
            <Button
              variant="outline"
              onClick={() => {
                setAutoCheckInRule(null);
                setPreviewData(null);
              }}
              className="rounded-xl h-10 px-4 text-xs"
            >
              Đóng
            </Button>
            {previewData && previewData.uncheckedSessionsCount > 0 && (
              <Button
                onClick={handleConfirmAutoCheckIn}
                disabled={executeLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 text-xs font-semibold shadow-md active:scale-95 transition-all gap-1.5"
              >
                {executeLoading && <Loader2 className="animate-spin size-3.5" />}
                Xác nhận Check-in ({previewData.uncheckedSessionsCount} ca)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Pre-filled Renew Rule Dialog */}
      <Dialog
        open={renewRule !== null}
        onOpenChange={(open) => {
          if (!open && !renewLoading) {
            setRenewRule(null);
            setRenewConflicts(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">autorenew</span>
              Gia hạn lịch cố định tháng sau
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Kiểm tra và tùy chỉnh thông số lịch cố định cho tháng tiếp theo.
            </DialogDescription>
          </DialogHeader>

          {renewRule && (
            <div className="py-3 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <User className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{renewRule.customers?.name || 'Khách vãng lai'}</h4>
                  <p className="text-xs text-gray-500">{renewRule.customers?.phone || 'Chưa có SĐT'}</p>
                </div>
              </div>

              {/* Pre-filled Interactive Form Controls */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Sân đặt tháng sau:</label>
                  <select
                    value={renewCourtId}
                    onChange={(e) => setRenewCourtId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 px-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.court_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Giờ bắt đầu:</label>
                    <input
                      type="time"
                      value={renewStartTime}
                      onChange={(e) => setRenewStartTime(e.target.value)}
                      className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 px-3 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Giờ kết thúc:</label>
                    <input
                      type="time"
                      value={renewEndTime}
                      onChange={(e) => setRenewEndTime(e.target.value)}
                      className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 px-3 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Ngày trong tuần:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { day: 1, label: 'T2' },
                      { day: 2, label: 'T3' },
                      { day: 3, label: 'T4' },
                      { day: 4, label: 'T5' },
                      { day: 5, label: 'T6' },
                      { day: 6, label: 'T7' },
                      { day: 0, label: 'CN' },
                    ].map(({ day, label }) => {
                      const isSelected = renewDaysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setRenewDaysOfWeek(renewDaysOfWeek.filter((d) => d !== day));
                            } else {
                              setRenewDaysOfWeek([...renewDaysOfWeek, day]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Từ ngày (Tháng sau):</label>
                    <input
                      type="date"
                      value={renewStartDate}
                      onChange={(e) => setRenewStartDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 px-3 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Đến ngày (Tháng sau):</label>
                    <input
                      type="date"
                      value={renewEndDate}
                      onChange={(e) => setRenewEndDate(e.target.value)}
                      className="w-full h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-800 px-3 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {renewConflicts && renewConflicts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>Phát hiện {renewConflicts.length} ca trùng lịch trong tháng sau:</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-rose-600 dark:text-rose-300">
                    {renewConflicts.map((c, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {new Date(c.start_time).toLocaleDateString('vi-VN')} ({new Date(c.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                        <span className="font-semibold">{c.customerName}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-rose-500 font-medium">Bấm &quot;Bỏ qua ca trùng &amp; Gia hạn&quot; để bỏ qua các ca trên và tự động tạo các ca không bị trùng.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-white/5">
                <Button
                  variant="outline"
                  disabled={renewLoading}
                  onClick={() => {
                    setRenewRule(null);
                    setRenewConflicts(null);
                  }}
                  className="rounded-xl h-10 text-xs px-4"
                >
                  Hủy
                </Button>
                {renewConflicts && renewConflicts.length > 0 ? (
                  <Button
                    disabled={renewLoading}
                    onClick={() => handleRenewRuleSubmit(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 text-xs px-4 font-semibold gap-1.5"
                  >
                    {renewLoading ? <Loader2 className="size-4 animate-spin" /> : <span className="material-symbols-outlined text-base">autorenew</span>}
                    <span>Bỏ qua ca trùng & Gia hạn</span>
                  </Button>
                ) : (
                  <Button
                    disabled={renewLoading}
                    onClick={() => handleRenewRuleSubmit(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs px-4 font-semibold gap-1.5"
                  >
                    {renewLoading ? <Loader2 className="size-4 animate-spin" /> : <span className="material-symbols-outlined text-base">autorenew</span>}
                    <span>Xác nhận Gia hạn</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
