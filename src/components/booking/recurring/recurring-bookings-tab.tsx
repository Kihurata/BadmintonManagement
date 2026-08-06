'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
        throw new Error(data.error?.message || 'Tự động check-in thất bại.');
      }
      setAutoCheckInRule(null);
      setPreviewData(null);
      fetchRules();
      window.dispatchEvent(new Event('booking_updated'));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExecuteLoading(false);
    }
  };

  const fetchCosts = useCallback(async (rulesList: RecurringRule[]) => {
    if (rulesList.length === 0) return;
    try {
      const ruleIds = rulesList.map(r => r.id).join(',');
      const res = await fetch(`/api/v1/bookings/recurring/costs?ruleIds=${ruleIds}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const costMap: Record<string, RecurringRuleCostSummary> = {};
        for (const item of data.data) {
          costMap[item.ruleId] = item;
        }
        setCosts(costMap);
      }
    } catch (err) {
      console.error("Error in batch cost fetching:", err);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/bookings/recurring');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Không thể tải danh sách lịch cố định');
      }
      const fetchedRules = data.data || [];
      setRules(fetchedRules);
      fetchCosts(fetchedRules);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchCosts]);

  useEffect(() => {
    fetchRules();

    const handleBookingUpdate = () => {
      fetchRules();
    };

    window.addEventListener('booking_updated', handleBookingUpdate);
    return () => {
      window.removeEventListener('booking_updated', handleBookingUpdate);
    };
  }, [fetchRules]);

  const handleConfirmPrepay = async () => {
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
        throw new Error(data.error?.message || 'Thanh toán trước thất bại.');
      }
      setPrepayRule(null);
      fetchRules();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPrepayLoading(false);
    }
  };

  const handleDeleteSeries = async (scope: 'ALL' | 'FUTURE') => {
    if (!selectedRule) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/v1/bookings/recurring?ruleId=${selectedRule.id}&scope=${scope}`, {
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
    // Sort array so days display in chronological order
    const sortedDays = [...days].sort((a, b) => {
      // Put Sunday (0) last for Vietnam style
      const valA = a === 0 ? 7 : a;
      const valB = b === 0 ? 7 : b;
      return valA - valB;
    });
    return sortedDays.map(d => map[d]).join(', ');
  };

  const formatRuleTime = (timeStr: string) => {
    // timeStr might be "08:00:00" -> convert to "08:00"
    return timeStr.substring(0, 5);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full p-4 md:p-6 space-y-4">
      {/* Tab Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lịch Cố Định Đang Hoạt Động</h2>
          <p className="text-xs text-gray-500">Danh sách các khung giờ đặt sân cố định hàng tuần.</p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 h-10 px-4 shrink-0 shadow-md shadow-emerald-600/10 active:scale-95 transition-all"
        >
          <Plus className="size-4" />
          <span>Đăng ký lịch cố định</span>
        </Button>
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 p-4 rounded-2xl border border-red-100 dark:border-red-950/30 text-sm">
          Lỗi: {error}
        </div>
      ) : rules.length === 0 ? (
        <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-gray-50/20 dark:bg-white/5">
          <div className="size-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4 text-emerald-600">
            <Calendar className="size-8" />
          </div>
          <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Chưa có lịch cố định</h3>
          <p className="text-gray-500 text-sm max-w-sm mb-6">
            Đăng ký lịch cố định để tự động tạo lịch đặt sân hàng tuần cho khách hàng thân thiết.
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
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-20">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white dark:bg-[#0d1b17]/60 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl font-bold">sports_tennis</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {rule.courts?.court_name || 'Không xác định'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      {getDayNames(rule.days_of_week)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="size-3.5" />
                      <span>{rule.customers?.name || 'Khách vãng lai'}</span>
                    </span>
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
                    <div className="flex items-center gap-3 text-xs mt-1 border-t border-gray-50 dark:border-white/5 pt-1">
                      <span className="text-gray-400">Đã trả: <strong className="text-emerald-600 font-bold">{formatCurrency(costs[rule.id].financials.totalPaid)}</strong></span>
                      {costs[rule.id].financials.totalUnpaid + costs[rule.id].financials.estimatedFuture > 0 ? (
                        <span className="text-gray-400">Còn lại: <strong className="text-red-500 font-bold">{formatCurrency(costs[rule.id].financials.totalUnpaid + costs[rule.id].financials.estimatedFuture)}</strong></span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Đã đóng tiền trước</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 border-gray-50 dark:border-white/5 pt-3 sm:pt-0 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAutoCheckInRule(rule);
                    const currentMonthStr = format(new Date(), 'yyyy-MM');
                    setAutoCheckInMonth(currentMonthStr);
                    fetchPreviewData(rule.id, currentMonthStr);
                  }}
                  className="rounded-xl border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-blue-900/30 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 h-9 px-3 shrink-0 shadow-sm active:scale-95 transition-all text-xs gap-1.5"
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 h-9 px-3 shrink-0 shadow-sm active:scale-95 transition-all text-xs"
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
                  className="rounded-xl border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-950/30 dark:hover:bg-red-950/20 text-red-500 h-9 w-9 p-0 shrink-0 shadow-sm"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Đăng ký lịch cố định</DialogTitle>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl border-none bg-white dark:bg-[#0d1b17] shadow-2xl">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Hủy lịch cố định
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Lịch cố định này bao gồm nhiều ca đặt sân. Bạn muốn áp dụng việc hủy này như thế nào?
          </p>
          <div className="flex flex-col gap-2.5 mt-5">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 shadow-md shadow-red-600/10 justify-between px-4 group"
              onClick={() => handleDeleteSeries('FUTURE')}
              disabled={deleteLoading}
            >
              <span>Hủy các ca từ nay về sau (FUTURE)</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              className="w-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 rounded-xl h-11 justify-between px-4 group"
              onClick={() => handleDeleteSeries('ALL')}
              disabled={deleteLoading}
            >
              <span>Hủy toàn bộ chuỗi lịch đặt (ALL)</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-11"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedRule(null);
              }}
              disabled={deleteLoading}
            >
              Quay lại
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prepayment Dialog */}
      <Dialog open={prepayRule !== null} onOpenChange={(open) => {
        if (!open && !prepayLoading) setPrepayRule(null);
      }}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl border-none bg-white dark:bg-[#0d1b17] shadow-2xl">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">payments</span>
            Thanh toán trước lịch cố định
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Thanh toán trước toàn bộ phí sân cho các ca đặt sân chưa thanh toán của lịch này.
          </p>

          {prepayRule && costs[prepayRule.id] && (() => {
            const ruleCosts = costs[prepayRule.id];
            const dueAmount = ruleCosts.financials.totalUnpaid + ruleCosts.financials.estimatedFuture;

            return (
              <div className="py-4 space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Tổng tiền thanh toán</span>
                  <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-500">
                    {formatCurrency(dueAmount)}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Phương thức thanh toán</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${prepayMethod === 'BANK_TRANSFER'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-500 hover:border-emerald-200'
                        }`}
                      onClick={() => setPrepayMethod('BANK_TRANSFER')}
                    >
                      <span className="material-symbols-outlined text-2xl mb-1">account_balance</span>
                      <span className="font-semibold text-xs">Chuyển khoản</span>
                      {prepayMethod === 'BANK_TRANSFER' && (
                        <span className="absolute top-2 right-2 material-symbols-outlined text-emerald-500 text-xs font-bold">check_circle</span>
                      )}
                    </button>
                    <button
                      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${prepayMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-500 hover:border-emerald-200'
                        }`}
                      onClick={() => setPrepayMethod('CASH')}
                    >
                      <span className="material-symbols-outlined text-2xl mb-1">payments</span>
                      <span className="font-semibold text-xs">Tiền mặt</span>
                      {prepayMethod === 'CASH' && (
                        <span className="absolute top-2 right-2 material-symbols-outlined text-emerald-500 text-xs font-bold">check_circle</span>
                      )}
                    </button>
                  </div>
                </div>

                {prepayMethod === 'BANK_TRANSFER' && (
                  <div className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-gray-100 dark:border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generateVietQrUrl(dueAmount, `Prepay san ${prepayRule.courts?.court_name || ''}`)}
                      alt="VietQR code"
                      className="size-48 object-contain rounded-lg"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Quét mã QR bằng ứng dụng ngân hàng của bạn</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl h-11"
                    onClick={() => setPrepayRule(null)}
                    disabled={prepayLoading}
                  >
                    Quay lại
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-md shadow-emerald-600/10"
                    onClick={handleConfirmPrepay}
                    disabled={prepayLoading}
                  >
                    {prepayLoading ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
                    Xác nhận
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Auto Check-in Preview Dialog (Step 1) */}
      <Dialog open={autoCheckInRule !== null} onOpenChange={(open) => {
        if (!open) {
          setAutoCheckInRule(null);
          setPreviewData(null);
          setPreviewError(null);
        }
      }}>
        <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl border-none bg-white dark:bg-[#0d1b17] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-between border-b dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">fact_check</span>
              <div>
                <span>Xem trước ca chưa Check-in</span>
                <p className="text-xs font-normal text-gray-500">Thống kê các ca đặt sân chưa check-in trong tháng</p>
              </div>
            </div>
          </DialogTitle>

          {autoCheckInRule && (
            <div className="flex-1 overflow-y-auto space-y-4 py-3">
              {/* Month Selector */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Chọn tháng cần kiểm tra:</span>
                <select
                  value={autoCheckInMonth}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    setAutoCheckInMonth(newMonth);
                    fetchPreviewData(autoCheckInRule.id, newMonth);
                  }}
                  className="text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  {[-1, 0, 1, 2].map((offset) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + offset);
                    const mStr = format(d, 'yyyy-MM');
                    const label = `Tháng ${format(d, 'MM/yyyy')}${offset === 0 ? ' (Hiện tại)' : ''}`;
                    return <option key={mStr} value={mStr}>{label}</option>;
                  })}
                </select>
              </div>

              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="animate-spin text-blue-600 size-8 mb-2" />
                  <span className="text-xs">Đang nạp danh sách ca đặt sân...</span>
                </div>
              ) : previewError ? (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-500 p-4 rounded-xl text-xs border border-red-100 dark:border-red-900/30">
                  Lỗi: {previewError}
                </div>
              ) : previewData ? (
                <>
                  {/* Stats Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-gray-400 font-semibold block">Tổng số ca</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{previewData.totalSessions}</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Đã check-in</span>
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{previewData.alreadyCheckedInCount}</span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl text-center border border-amber-100 dark:border-amber-900/30">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">Chưa check-in</span>
                      <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{previewData.uncheckedSessionsCount}</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">Phí sân ước tính</span>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{formatCurrency(previewData.totalEstimatedFee)}</span>
                    </div>
                  </div>

                  {/* Session List Table */}
                  {previewData.uncheckedSessionsCount === 0 ? (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 text-center space-y-2">
                      <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-2xl font-bold">check_circle</span>
                      </div>
                      <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Hoàn thành!</h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Tất cả các ca đặt sân của lịch cố định này trong {previewData.month} đã được check-in đầy đủ.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        Danh sách {previewData.uncheckedSessionsCount} ca cần Check-in:
                      </span>
                      <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-white/5 rounded-xl divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-black/20">
                        {previewData.uncheckedBookings.map((item: UncheckedBookingItem) => {
                          const startDate = new Date(item.start_time);
                          const endDate = new Date(item.end_time);
                          const dateFormatted = format(startDate, 'dd/MM/yyyy');
                          const dayFormatted = getDayNames([startDate.getDay()]);
                          const timeFormatted = `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`;

                          return (
                            <div key={item.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-white/5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{dateFormatted} ({dayFormatted})</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-600 dark:text-gray-300">{timeFormatted}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.isPrepaid && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    Đã TT trước
                                  </span>
                                )}
                                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.estimatedFee)}</span>
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
    </div>
  );
}
