'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { Users, Loader2, Calendar, DollarSign } from 'lucide-react';
import { HostGroupRosterDialog } from '@/components/customers/HostGroupRosterDialog';
import { InvoiceSplitDialog } from '@/components/invoices/InvoiceSplitDialog';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface CustomerInvoice {
  id: string;
  created_at: string;
  total_amount: number;
  is_paid: boolean;
  bookings?: {
    courts?: {
      court_name: string;
    };
    start_time: string;
  };
}

export function GroupSplitsLedger() {
  const searchParams = useSearchParams();
  const initialInvoiceId = searchParams.get('invoiceId');
  const initialCustomerId = searchParams.get('customerId');

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);

  // Dialog states
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(Boolean(initialInvoiceId));
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(initialInvoiceId || null);

  const fetchHostCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHostCustomers();
  }, [fetchHostCustomers]);

  const fetchCustomerInvoices = useCallback(async (customerId: string) => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?customerId=${customerId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices for customer:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    fetchCustomerInvoices(customerId);
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Top Banner / Customer Select */}
      <div className="bg-muted/40 p-4 border rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Quản Lý Nhóm Chơi & Chia Tiền Sân</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Chọn trưởng nhóm / khách thuê cố định để quản lý thành viên và theo dõi việc chia tiền theo từng hóa đơn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedCustomerId} onValueChange={handleSelectCustomer}>
            <SelectTrigger className="w-[220px] bg-white dark:bg-gray-900">
              <SelectValue placeholder="Chọn trưởng nhóm / Khách" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCustomerId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterDialogOpen(true)}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Users className="w-4 h-4" /> Danh sách nhóm
            </Button>
          )}
        </div>
      </div>

      {/* Invoices List */}
      {!selectedCustomerId ? (
        <div className="text-center py-16 border border-dashed rounded-xl space-y-2">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-sm">Vui lòng chọn Trưởng nhóm / Khách hàng để xem lịch sử chia tiền</p>
        </div>
      ) : loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 border rounded-xl text-sm text-muted-foreground">
          Chưa có hóa đơn nào cho khách hàng này.
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden bg-white dark:bg-gray-900">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {inv.bookings?.courts?.court_name || 'Hóa đơn đặt sân'}
                  </span>
                  {inv.is_paid ? (
                    <Badge className="bg-emerald-500 text-white text-[10px]">Hóa đơn đã TT</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                      Chưa thanh toán hết
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(inv.created_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Tổng: {formatCurrency(inv.total_amount)}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedInvoiceId(inv.id);
                  setSplitDialogOpen(true);
                }}
                className="gap-1.5"
              >
                <Users className="w-4 h-4" /> Bảng Chia Tiền Nhóm
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <HostGroupRosterDialog
        hostCustomerId={selectedCustomerId || null}
        hostCustomerName={selectedCustomerObj?.name}
        open={rosterDialogOpen}
        onOpenChange={setRosterDialogOpen}
      />

      <InvoiceSplitDialog
        invoiceId={selectedInvoiceId}
        hostCustomerId={selectedCustomerId}
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        onSuccess={() => {
          if (selectedCustomerId) fetchCustomerInvoices(selectedCustomerId);
        }}
      />
    </div>
  );
}
