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
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2,
  Users,
  ShoppingBag,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HostGroupMember } from '@/server/repositories/group-member-repo';
import { InvoiceSplitDetails } from '@/server/repositories/split-repo';

interface InvoiceSplitDialogProps {
  invoiceId: string | null;
  hostCustomerId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InvoiceSplitDialog({
  invoiceId,
  hostCustomerId,
  open,
  onOpenChange,
  onSuccess,
}: InvoiceSplitDialogProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'items' | 'summary'>('attendance');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data
  const [hostMembers, setHostMembers] = useState<HostGroupMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [splitDetails, setSplitDetails] = useState<InvoiceSplitDetails | null>(null);

  const fetchData = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      // 1. Fetch split summary data
      const res = await fetch(`/api/v1/invoices/${invoiceId}/split`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const details: InvoiceSplitDetails = data.data;
        setSplitDetails(details);

        const currentAttendeeIds = details.attendees.map((a) => a.group_member_id);
        setSelectedMemberIds(currentAttendeeIds);

        // Auto-switch to summary tab if attendance is already set
        if (currentAttendeeIds.length > 0 && activeTab === 'attendance') {
          setActiveTab('summary');
        }
      }

      // 2. Fetch host roster members if hostCustomerId is provided or derived
      if (hostCustomerId) {
        const memberRes = await fetch(`/api/v1/customers/${hostCustomerId}/group-members`);
        const memberData = await memberRes.json();
        if (memberRes.ok && memberData.success) {
          setHostMembers(memberData.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching invoice split details:', err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, hostCustomerId, activeTab]);

  useEffect(() => {
    if (open && invoiceId) {
      fetchData();
    }
  }, [open, invoiceId, fetchData]);

  // Toggle member attendance
  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Save attendance selection
  const handleSaveAttendance = async () => {
    if (!invoiceId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupMemberIds: selectedMemberIds }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setSplitDetails(data.data);
        setActiveTab('items');
        onSuccess?.();
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update item allocation (SHARED vs INDIVIDUAL member)
  const handleItemAllocationChange = async (
    invoiceItemId: string,
    allocationType: 'SHARED' | 'INDIVIDUAL',
    assignedMemberId?: string | null
  ) => {
    if (!invoiceId) return;
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/split`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'allocate_item',
          invoiceItemId,
          allocationType,
          assignedMemberId: assignedMemberId || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setSplitDetails(data.data);
        onSuccess?.();
      }
    } catch (err) {
      console.error('Error allocating item:', err);
    }
  };

  // Toggle payment status for an attendee
  const handleTogglePayment = async (attendanceId: string, currentStatus: boolean) => {
    if (!invoiceId) return;
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/split`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_payment',
          attendanceId,
          isPaid: !currentStatus,
          paymentMethod: 'CASH',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setSplitDetails(data.data);
        onSuccess?.();
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
    }
  };

  // Generate Zalo Summary Text
  const handleCopyZaloText = () => {
    if (!splitDetails || splitDetails.attendees.length === 0) return;

    let text = `🏸 TỔNG HỢP CHIA TIỀN SÂN BADMINTON\n`;
    text += `💰 Tiền sân: ${formatCurrency(splitDetails.total_court_fee)}\n`;
    text += `👥 Số người chơi: ${splitDetails.summary.attendee_count} người\n`;
    text += `💵 Tiền chia chung/người: ${formatCurrency(splitDetails.summary.per_person_shared)}\n`;
    text += `----------------------------------------\n`;

    splitDetails.attendees.forEach((a, index) => {
      const statusText = a.is_paid ? '✅ Đã thanh toán' : '❌ Chưa thanh toán';
      text += `${index + 1}. ${a.member_name}: ${formatCurrency(a.total_due)} (${statusText})\n`;
    });

    text += `----------------------------------------\n`;
    text += `📌 Vui lòng kiểm tra và chuyển khoản cho Chủ sân / Trưởng nhóm. Cảm ơn cả nhà!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Chia Tiền Sân & Sản Phẩm</span>
            {splitDetails && (
              <Badge variant="outline" className="text-xs">
                {splitDetails.summary.paid_count}/{splitDetails.summary.attendee_count} Đã thanh toán
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Điểm danh người chơi, chia đều tiền sân/sản phẩm dùng chung và gán đồ uống/phụ kiện cho cá nhân.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Tabs Header */}
            <div className="flex border-b">
              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'attendance'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('attendance')}
              >
                <Users className="w-4 h-4" /> 1. Điểm danh ({selectedMemberIds.length})
              </button>

              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'items'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('items')}
              >
                <ShoppingBag className="w-4 h-4" /> 2. Chia sản phẩm ({splitDetails?.items.length || 0})
              </button>

              <button
                className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'summary'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('summary')}
              >
                <CheckCircle2 className="w-4 h-4" /> 3. Bang giao & Bảng thu
              </button>
            </div>

            {/* TAB 1: ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    Chọn thành viên thực tế tham gia buổi chơi hôm nay:
                  </span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Đã chọn {selectedMemberIds.length} người
                  </Badge>
                </div>

                {hostMembers.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-lg text-sm text-muted-foreground">
                    Chưa có danh sách thành viên nhóm cho khách hàng này. Vui lòng thêm danh sách thành viên ở trang Khách hàng hoặc nhập bổ sung.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto p-1">
                    {hostMembers.map((member) => {
                      const isSelected = selectedMemberIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          onClick={() => handleToggleMember(member.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/5 font-semibold text-primary'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="truncate">
                            <div className="truncate text-sm">{member.name}</div>
                            {member.phone && <div className="text-[11px] text-muted-foreground">{member.phone}</div>}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveAttendance} disabled={saving || selectedMemberIds.length === 0}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    Lưu điểm danh & Chuyển bước chia món
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: ITEMS ALLOCATION */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-sm">Phân bổ chi phí sản phẩm:</p>
                  <p className="text-muted-foreground">
                    • <strong>Chia chung:</strong> Cộng vào tổng quỹ chung và chia đều cho tất cả {splitDetails?.summary.attendee_count} người tham gia.
                  </p>
                  <p className="text-muted-foreground">
                    • <strong>Cá nhân:</strong> Tính riêng tiền sản phẩm vào hóa đơn cá nhân của người được chọn.
                  </p>
                </div>

                <div className="divide-y border rounded-lg overflow-hidden">
                  {/* Fixed Line: Total Court Fee */}
                  <div className="p-3 bg-muted/20 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold">Tiền thuê sân (Cố định)</span>
                      <p className="text-xs text-muted-foreground">Chi phí cố định tiền sân theo thời gian đặt</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">
                        {formatCurrency(splitDetails?.total_court_fee || 0)}
                      </span>
                      <Badge variant="outline" className="ml-2 text-[10px]">Chia chung</Badge>
                    </div>
                  </div>

                  {/* Product items */}
                  {splitDetails?.items.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Không có sản phẩm phụ (nước/cầu) trong hóa đơn này.
                    </div>
                  ) : (
                    splitDetails?.items.map((item) => (
                      <div key={item.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">
                            {item.product_name} x{item.quantity}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Đơn giá: {formatCurrency(item.sale_price)} | Thành tiền: {formatCurrency(item.sale_price * item.quantity)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={item.allocation_type || 'SHARED'}
                            onValueChange={(val: 'SHARED' | 'INDIVIDUAL') => {
                              if (val === 'SHARED') {
                                handleItemAllocationChange(item.id, 'SHARED');
                              } else {
                                const firstAttendee = splitDetails.attendees[0]?.group_member_id;
                                handleItemAllocationChange(item.id, 'INDIVIDUAL', firstAttendee);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SHARED">Chia chung</SelectItem>
                              <SelectItem value="INDIVIDUAL">Gán cá nhân</SelectItem>
                            </SelectContent>
                          </Select>

                          {item.allocation_type === 'INDIVIDUAL' && (
                            <Select
                              value={item.assigned_member_id || ''}
                              onValueChange={(memberId) =>
                                handleItemAllocationChange(item.id, 'INDIVIDUAL', memberId)
                              }
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder="Chọn người dùng" />
                              </SelectTrigger>
                              <SelectContent>
                                {splitDetails?.attendees.map((att) => (
                                  <SelectItem key={att.group_member_id} value={att.group_member_id}>
                                    {att.member_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('attendance')}>
                    Quay lại điểm danh
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('summary')}>
                    Xem bảng tổng hợp thu tiền
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: SUMMARY & PAYMENT TRACKING */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <span className="text-xs text-muted-foreground block">Quỹ chung (Tiền sân + Món chung)</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(splitDetails?.summary.shared_pool_total || 0)}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      = {formatCurrency(splitDetails?.summary.per_person_shared || 0)} / người
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-xs text-emerald-800 block">Đã thanh toán</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {splitDetails?.summary.paid_count} / {splitDetails?.summary.attendee_count} người
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-xs text-amber-800 block">Còn thiếu / Chưa thanh toán</span>
                    <span className="text-lg font-bold text-amber-600">
                      {splitDetails?.summary.unpaid_count} người
                    </span>
                  </div>
                </div>

                {/* Detailed Attendees List */}
                <div className="divide-y border rounded-lg overflow-hidden">
                  {splitDetails?.attendees.map((att) => (
                    <div key={att.attendance_id} className="p-3 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{att.member_name}</span>
                          {att.is_paid ? (
                            <Badge className="bg-emerald-500 text-white text-[10px]">Đã thanh toán</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                              Chưa thanh toán
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Chung: {formatCurrency(att.shared_share)}
                          {att.individual_total > 0 && (
                            <span> + Cá nhân: {formatCurrency(att.individual_total)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base">{formatCurrency(att.total_due)}</span>

                        <Button
                          size="sm"
                          variant={att.is_paid ? 'outline' : 'default'}
                          onClick={() => handleTogglePayment(att.attendance_id, att.is_paid)}
                          className="h-8 text-xs"
                        >
                          {att.is_paid ? 'Đánh dấu chưa TT' : 'Xác nhận đã TT'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Zalo Copy Action */}
                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('items')}>
                    Quay lại sửa chia món
                  </Button>

                  <Button onClick={handleCopyZaloText} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Đã sao chép tin nhắn Zalo!' : 'Sao chép tin nhắn Zalo'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
