'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Phone, MessageSquare, Facebook, UserCheck, UserX, Edit2 } from 'lucide-react';
import { HostGroupMember } from '@/server/repositories/group-member-repo';

interface HostGroupRosterDialogProps {
  hostCustomerId: string | null;
  hostCustomerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRosterUpdated?: () => void;
}

export function HostGroupRosterDialog({
  hostCustomerId,
  hostCustomerName = 'Khách hàng',
  open,
  onOpenChange,
  onRosterUpdated,
}: HostGroupRosterDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<HostGroupMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [facebook, setFacebook] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!hostCustomerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/customers/${hostCustomerId}/group-members?includeInactive=true`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error('Error loading group roster:', err);
    } finally {
      setLoading(false);
    }
  }, [hostCustomerId]);

  useEffect(() => {
    if (open && hostCustomerId) {
      fetchMembers();
      resetForm();
    }
  }, [open, hostCustomerId, fetchMembers]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setZalo('');
    setFacebook('');
    setNotes('');
    setShowAddForm(false);
    setEditingMemberId(null);
    setErrorMsg('');
  };

  const handleStartEdit = (member: HostGroupMember) => {
    setEditingMemberId(member.id);
    setName(member.name);
    setPhone(member.phone || '');
    setZalo(member.zalo || '');
    setFacebook(member.facebook || '');
    setNotes(member.notes || '');
    setShowAddForm(true);
    setErrorMsg('');
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên thành viên');
      return;
    }
    if (!hostCustomerId) return;

    setSaving(true);
    setErrorMsg('');

    try {
      if (editingMemberId) {
        // Update existing member
        const res = await fetch(`/api/v1/customers/${hostCustomerId}/group-members`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: editingMemberId,
            name,
            phone,
            zalo,
            facebook,
            notes,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Lỗi cập nhật thành viên');
        }
      } else {
        // Create new member
        const res = await fetch(`/api/v1/customers/${hostCustomerId}/group-members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            zalo,
            facebook,
            notes,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Lỗi tạo thành viên mới');
        }
      }

      resetForm();
      await fetchMembers();
      onRosterUpdated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi lưu thông tin';
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: HostGroupMember) => {
    if (!hostCustomerId) return;
    try {
      const res = await fetch(`/api/v1/customers/${hostCustomerId}/group-members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          is_active: !member.is_active,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMembers();
        onRosterUpdated?.();
      }
    } catch (err) {
      console.error('Error toggling member status:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span>Danh sách nhóm chơi — {hostCustomerName}</span>
          </DialogTitle>
          <DialogDescription>
            Quản lý thành viên cố định trong nhóm để phục vụ điểm danh và chia tiền sân.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Header Action */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-muted-foreground">
                Tổng số thành viên: {members.length} ({members.filter((m) => m.is_active).length} đang hoạt động)
              </span>
              {!showAddForm && (
                <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1">
                  <Plus className="w-4 h-4" /> Thêm thành viên
                </Button>
              )}
            </div>

            {/* Add / Edit Form */}
            {showAddForm && (
              <form onSubmit={handleSaveMember} className="p-4 bg-muted/40 border rounded-lg space-y-4">
                <h4 className="font-semibold text-sm">
                  {editingMemberId ? 'Chỉnh sửa thông tin thành viên' : 'Thêm thành viên mới vào nhóm'}
                </h4>

                {errorMsg && (
                  <div className="p-2 text-xs bg-red-50 text-red-600 border border-red-200 rounded">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Họ và tên *</Label>
                    <Input
                      placeholder="Ví dụ: Nguyễn Văn Hùng"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Số điện thoại</Label>
                    <Input
                      placeholder="09xx xxx xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Zalo (Số điện thoại / Link)</Label>
                    <Input
                      placeholder="Zalo liên hệ"
                      value={zalo}
                      onChange={(e) => setZalo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Facebook (Link / Username)</Label>
                    <Input
                      placeholder="fb.com/username"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                    Hủy
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                    {editingMemberId ? 'Cập nhật' : 'Lưu thành viên'}
                  </Button>
                </div>
              </form>
            )}

            {/* Roster List */}
            {members.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                Chưa có thành viên nào trong nhóm. Bấm &quot;Thêm thành viên&quot; để bắt đầu tạo danh sách.
              </div>
            ) : (
              <div className="divide-y border rounded-lg overflow-hidden">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`p-3 flex items-center justify-between transition-colors ${
                      !member.is_active ? 'bg-gray-50 opacity-60' : 'hover:bg-muted/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{member.name}</span>
                        {!member.is_active && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                            Đã ngừng hoạt động
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {member.phone}
                          </span>
                        )}
                        {member.zalo && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <MessageSquare className="w-3 h-3" /> Zalo: {member.zalo}
                          </span>
                        )}
                        {member.facebook && (
                          <span className="flex items-center gap-1 text-indigo-600">
                            <Facebook className="w-3 h-3" /> FB: {member.facebook}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Chỉnh sửa"
                        onClick={() => handleStartEdit(member)}
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={member.is_active ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                        onClick={() => handleToggleActive(member)}
                      >
                        {member.is_active ? (
                          <UserX className="w-4 h-4 text-amber-600" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
