# Kế hoạch: Thiết kế Dashboard Buồng lái Tài chính (Option A)

## Goal
Tái cấu trúc Dashboard để quản lý ngân quỹ lũy kế (Tiền mặt/Ngân hàng) và hiệu suất kinh doanh tháng (P&L: Doanh thu sân/hàng - Chi phí vận hành - Tiền vốn nhập hàng).

## Project Type
WEB

## Success Criteria
- [ ] Bảng `expenses` và `inventory_logs` có cột `payment_method`.
- [ ] UI Nhập chi phí cho phép chọn ví chi tiền.
- [ ] Dashboard hiển thị "Tổng ngân quỹ" (Tiền mặt & Ngân hàng) từ trước tới nay.
- [ ] Dashboard hiển thị Biểu đồ Doanh thu (Sân vs Hàng) của tháng hiện tại.
- [ ] Dashboard hiển thị Lợi nhuận ròng tháng (Doanh thu - Chi phí - Nhập hàng).

## File Structure
- `supabase/migrations/[timestamp]_add_payment_methods.sql` (Migration)
- `src/components/home/expense-form.tsx` (Thêm chọn Payment Method)
- `src/app/dashboard/page.tsx` (Thiết kế lại toàn bộ UI/Logic)
- `src/components/dashboard/treasury-header.tsx` (New: Header ngân quỹ)
- `src/components/dashboard/profit-loss-widget.tsx` (New: Widget P&L)

## Task Breakdown

### Task 1: Database Migration
- **Agent**: `backend-specialist`
- **Output**: File migration add `payment_method` to `expenses` và `inventory_logs`.
- **Verify**: `npx supabase db push` hoặc `db reset` thành công.

### Task 2: Cập nhật UI Nhập liệu
- **Agent**: `frontend-specialist`
- **Output**:
  1. `ExpenseForm` (`expense-form.tsx`) — Thêm Toggle chọn Payment Method (Tiền mặt/Chuyển khoản).
  2. `StockAdjustmentForm` (`stock-adjustment-form.tsx`) — Thêm Toggle Payment Method cho loại nhập kho (`RESTOCK`).
- **Verify**: Nhập chi phí + nhập hàng, kiểm tra DB có lưu đúng `payment_method`.

### Task 3: Phát triển Data Fetching (Dashboard)
- **Agent**: `backend-specialist`
- **Output**: Viết logic tính toán 2 tập dữ liệu:
  1. **Lũy kế (All-time)**: Invoices (In) - Expenses (Out) - Restock (Out) theo từng ví.
  2. **Tháng (Current Month)**: Doanh thu (Sân/Hàng), Chi phí (Cố định/Biến động), Nhập hàng.
- **Verify**: Console log data trả về đúng cấu trúc.

### Task 4: UI Dashboard Redesign (Cockpit Style)
- **Agent**: `frontend-specialist`
- **Output**: 
  - Header: 2 thẻ Ngân quỹ (Cash/Bank) phong cách cao cấp.
  - Body: Grid layout cho P&L Widget (Doanh thu âm/dương), Charts (Revenue Breakdown).
- **Verify**: Responsive tốt trên Mobile.

### Task 5: Polish & UX Audit
- **Agent**: `orchestrator`
- **Output**: Thêm micro-animations (animated counters) cho các con số tiền.
- **Verify**: Chạy `.agent/scripts/ux_audit.py`.

## Phase X: Verification
- [ ] Không sử dụng mã màu tím (Purple Ban).
- [ ] Socratic Gate đã được thực hiện.
- [ ] Build thành công (`npm run build`).
