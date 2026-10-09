'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, User, Check, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ProductSelectorItem } from './product-selector-list';

export interface AttendingMember {
  id: string; // group_member_id
  name: string;
}

interface ItemAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductSelectorItem | null;
  attendees: AttendingMember[];
  onConfirm: (
    allocationType: 'SHARED' | 'INDIVIDUAL',
    assignedMemberId?: string | null
  ) => Promise<void> | void;
}

export function ItemAllocationDialog({
  open,
  onOpenChange,
  product,
  attendees,
  onConfirm,
}: ItemAllocationDialogProps) {
  const [allocationType, setAllocationType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAllocationType('SHARED');
      setSelectedMemberId(attendees.length > 0 ? attendees[0].id : '');
      setSubmitting(false);
    }
  }, [open, attendees]);

  if (!product) return null;

  const handleConfirm = async () => {
    if (allocationType === 'INDIVIDUAL' && !selectedMemberId) {
      alert('Vui lòng chọn một thành viên');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(
        allocationType,
        allocationType === 'INDIVIDUAL' ? selectedMemberId : null
      );
      onOpenChange(false);
    } catch (err) {
      console.error('Error confirming item allocation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600 shrink-0" />
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Phân bổ món hàng này cho ai trong nhóm?
              </DialogDescription>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-bold text-emerald-600 block">
                {formatCurrency(product.price)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                / {product.unit}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-3">
          {/* Option 1: SHARED */}
          <div
            onClick={() => setAllocationType('SHARED')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
              allocationType === 'SHARED'
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                allocationType === 'SHARED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  🏸 Dùng chung cả sân
                </span>
                {allocationType === 'SHARED' && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] h-5">
                    Đã chọn
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tiền món này (ví dụ: cầu lông, nước chung) sẽ chia đều cho tất cả{' '}
                <strong className="text-foreground">{attendees.length}</strong> người chơi.
              </p>
            </div>
          </div>

          {/* Option 2: INDIVIDUAL */}
          <div
            onClick={() => setAllocationType('INDIVIDUAL')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-3 ${
              allocationType === 'INDIVIDUAL'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  allocationType === 'INDIVIDUAL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    👤 Riêng cho thành viên
                  </span>
                  {allocationType === 'INDIVIDUAL' && (
                    <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px] h-5">
                      Đã chọn
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Chỉ tính vào phần tiền của riêng một thành viên cụ thể (ví dụ: nước ngọt riêng).
                </p>
              </div>
            </div>

            {/* Member Picker when INDIVIDUAL is selected */}
            {allocationType === 'INDIVIDUAL' && (
              <div className="pt-2 border-t border-border/60">
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Chọn người sử dụng món này:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {attendees.map((att) => {
                    const isPicked = selectedMemberId === att.id;
                    return (
                      <button
                        key={att.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberId(att.id);
                        }}
                        className={`text-left text-xs p-2 rounded-lg border flex items-center justify-between transition-all ${
                          isPicked
                            ? 'border-blue-600 bg-blue-100/80 dark:bg-blue-900/40 text-blue-950 dark:text-blue-100 font-bold'
                            : 'border-border bg-background hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        <span className="truncate mr-1">{att.name}</span>
                        {isPicked && (
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={
              submitting ||
              (allocationType === 'INDIVIDUAL' && !selectedMemberId)
            }
            className={`font-semibold ${
              allocationType === 'SHARED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            Xác nhận thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
