# PLAN: Cập nhật logic Bán Nhanh (Quick Sale)

## Phase -1: Context Check
- **File đích**: `src/components/home/quick-actions.tsx` và `src/app/page.tsx`
- **File tạo mới**: `src/components/booking/quick-sale-form.tsx`
- **Yêu cầu cụ thể từ User**: 
  1. Sử dụng lại dạng Popup/Dialog.
  2. Tái sử dụng thiết kế hiển thị danh sách sản phẩm và nút [+] / [-] (Tương tự như trong màn hình `BookingDetails`).
  3. Bổ sung Component chọn Khách Hàng (Tương tự như lúc đặt sân trong `BookingForm`).

---

## Phase 1: Kiến trúc (Architecture)

Quy trình Bán Nhanh sẽ khác quy trình mua thêm khi đang chơi (`BookingDetails`) ở một điểm cốt lõi: **Không có Invoice ID từ trước**. Lúc này người dùng sẽ chọn đồ vào "Giỏ hàng" (Local State Cart) và chỉ khi bấm "Thanh toán", ứng dụng mới gọi API tạo hóa đơn.

### 1. Database & Tồn kho
- Hóa đơn (Invoice) tạo ra cho Quick Sale sẽ có `booking_id = null`.
- Các mặt hàng (Invoice Items) sẽ ghi nhận giá bán lẻ và số lượng.
- Sẽ tận dụng Trigger của cơ sở dữ liệu `trg_sync_inv_v2` (hoặc trigger hiện tại xử lý `invoice_items` insert) để quản lý việc trừ kho tự động.

### 2. Giao diện (UI Components)
Tạo tệp mới `src/components/booking/quick-sale-form.tsx`:
- **Phân đoạn 1**: Combobox chọn khách hàng (Tái sử dụng mã từ `booking-form.tsx`).
- **Phân đoạn 2**: Danh sách sản phẩm dạng lưới (Tái sử dụng mã hiển thị từ `booking-details.tsx` + thêm state quản lý giỏ hàng nội bộ `cartItems`).
- **Phân đoạn 3**: Tuỳ chọn phương thức tính tiền (Tiền mặt / Chuyển khoản) và nút Thanh toán (tương tự mã từ `checkout-form.tsx`).

### 3. Tích hợp Trang chủ (Home)
Tại `src/app/page.tsx`:
- Tạo `isQuickSaleOpen` state.
- Khai báo `<Dialog open={isQuickSaleOpen}> <QuickSaleForm /> ...`
- Truyền callback `setIsQuickSaleOpen(true)` vào thẻ **Bán nhanh** ở `quick-actions.tsx`.

---

## Phase 2: Breakdown Công việc (Task Breakdown)
1. **Bước 1**: Ráp mã Khung UI (Dựng Dialog, Header, và Footer).
2. **Bước 2**: Đưa khối chọn Customer, và xử lý logic Guest fallback. Định nghĩa State tổng `totalAmount`.
3. **Bước 3**: Cắm truy vấn Supabase lấy bảng `products` > 0 tồn. Xây dựng logic nút tăng/giảm số lượng vào state Memory (`[ { productId, qty, ... }, ... ]`).
4. **Bước 4**: Bọc khối Submit: Chèn (Insert) lên `invoices`. Sau đó lấy ra `invoice.id` để `insert` mảng array lên `invoice_items`.
5. **Bước 5**: Gọi webhook trang Home / reload dữ liệu doanh thu ngay lập tức (Trigger `onSuccess`).

---

## Phase 3: Verification (Tiêu chí Hoàn thành)
- Tính năng chọn khách hàng hoạt động (Search, Dropdown).
- Có thể thêm/bớt lon cầu, chai nước, và tổng số tiền chạy real-time ở Footer.
- Sau khi bấm mua, thông báo hiện "Bán hàng thành công", modal tự tắt, doanh thu trong ngày (Metrics) tăng lên tự động. 
- Log hệ thống Supabase chứng minh kho hàng giảm đúng định mức.
