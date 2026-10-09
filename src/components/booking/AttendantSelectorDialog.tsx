'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, UserPlus, Users, Check, Phone } from 'lucide-react';
import type { Member } from '@/server/repositories/member-repo';
import type { InvoiceSplitDetails } from '@/server/repositories/split-repo';

interface AttendantSelectorDialogProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttendanceSaved?: (attendeeCount: number) => void;
}

export function AttendantSelectorDialog({
  invoiceId,
  open,
  onOpenChange,
  onAttendanceSaved,
}: AttendantSelectorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');

  const loadData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      // 1. Fetch facility members
      const membersRes = await fetch('/api/v1/members');
      const membersData = await membersRes.json();
      const allMembers: Member[] = membersData.success ? membersData.data : [];
      setMembers(allMembers);

      // 2. Fetch current invoice attendance if invoiceId is provided
      if (invoiceId) {
        const splitRes = await fetch(`/api/v1/invoices/${invoiceId}/split`);
        const splitData = await splitRes.json();
        if (splitRes.ok && splitData.success && splitData.data) {
          const details: InvoiceSplitDetails = splitData.data;
          const currentIds = new Set<string>(details.attendees.map((a) => a.group_member_id));
          setSelectedMemberIds(currentIds);
        }
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [open, invoiceId]);

  useEffect(() => {
    if (open) {
      loadData();
      setSearchQuery('');
      setShowQuickAdd(false);
      setNewName('');
      setNewPhone('');
      setQuickAddError('');
    }
  }, [open, loadData]);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setQuickAddError('Vui lòng nhập tên thành viên');
      return;
    }
    setAddingMember(true);
    setQuickAddError('');

    try {
      const res = await fetch('/api/v1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || 'N/A',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setQuickAddError(data.error || 'Không thể tạo thành viên mới');
        return;
      }

      const created: Member = data.data;
      setMembers((prev) => [created, ...prev]);
      setSelectedMemberIds((prev) => new Set(prev).add(created.id));
      setNewName('');
      setNewPhone('');
      setShowQuickAdd(false);
    } catch (err) {
      setQuickAddError((err as Error).message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!invoiceId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupMemberIds: Array.from(selectedMemberIds),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert('Lỗi lưu danh sách người chơi: ' + (data.error || 'Unknown error'));
        return;
      }

      onAttendanceSaved?.(selectedMemberIds.size);
      onOpenChange(false);
    } catch (err) {
      alert('Lỗi lưu danh sách người chơi: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q))
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Users className="w-5 h-5 text-emerald-600" />
              Điểm danh người chơi trong ca
            </DialogTitle>
            <Badge variant="secondary" className="font-semibold text-xs">
              Đã chọn: {selectedMemberIds.size}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Chọn thành viên tham gia để chia tiền sân và phân bổ đồ uống/phụ kiện.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {/* Search bar & quick-add trigger */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="h-10 px-3 flex items-center gap-1.5 border-dashed"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Thêm mới</span>
            </Button>
          </div>

          {/* Inline quick-add form */}
          {showQuickAdd && (
            <form
              onSubmit={handleQuickAdd}
              className="p-3 bg-muted/40 border border-emerald-200 dark:border-emerald-900 rounded-lg space-y-3 animate-in fade-in-50"
            >
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Thêm nhanh thành viên mới
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Họ và tên *</Label>
                  <Input
                    placeholder="VD: Nguyễn Văn A"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-sm mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Số điện thoại</Label>
                  <Input
                    placeholder="09..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
              {quickAddError && (
                <p className="text-xs text-red-500 font-medium">{quickAddError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowQuickAdd(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={addingMember}
                >
                  {addingMember && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Thêm & Chọn
                </Button>
              </div>
            </form>
          )}

          {/* Member List */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Đang tải danh sách thành viên...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground space-y-2">
              <p className="text-sm">Không tìm thấy thành viên nào</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuickAdd(true)}
                className="text-xs"
              >
                + Thêm &quot;{searchQuery}&quot; vào danh sách
              </Button>
            </div>
          ) : (
            <div className="space-y-1 divide-y divide-border/50">
              {filteredMembers.map((member) => {
                const isSelected = selectedMemberIds.has(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(member.id)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {member.name}
                        </div>
                        {member.phone && member.phone !== 'N/A' && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mr-1" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-between items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {selectedMemberIds.size > 0
              ? `Đã chọn ${selectedMemberIds.size} người chơi`
              : 'Chưa chọn ai'}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Đóng
            </Button>
            <Button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving || !invoiceId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Lưu danh sách ({selectedMemberIds.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
