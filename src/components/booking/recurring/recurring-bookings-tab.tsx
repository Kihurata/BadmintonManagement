'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { RecurringBookingForm } from './recurring-booking-form';
import { Loader2, Plus, Calendar, User, Trash2, ArrowRight } from 'lucide-react';

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

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('recurring_rules')
        .select(`
          id,
          start_time,
          end_time,
          start_date,
          end_date,
          days_of_week,
          court_id,
          courts ( court_name ),
          customer_id,
          customers ( name, phone )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRules(data as unknown as RecurringRule[] || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

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
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 border-gray-50 dark:border-white/5 pt-3 sm:pt-0 shrink-0">
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
    </div>
  );
}
