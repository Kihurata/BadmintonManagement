# Kế hoạch: Nâng cấp Dashboard Metrics (Vốn lưu động, Điểm tái đặt hàng, Lợi nhuận ròng)

## Goal
Bổ sung các chỉ số tài chính chuyên sâu vào Dashboard: Vốn lưu động (Working Capital), Báo cáo điểm tái đặt hàng (Reorder Point), Cập nhật công thức tính Lợi nhuận ròng chuẩn xác (Accrual basis thay vì Cash basis), và thêm cột Lãi/Tỉ suất lợi nhuận cho Top Sản phẩm.

## Proposed Changes

### Database
- **Không thay đổi DB:** Mọi tính toán lấy trực tiếp từ bảng hiện có `inventory_logs` (thông qua `purchase_price` của loại giao dịch `RESTOCK`) và bảng `products`. Định mức tồn kho tối thiểu được gán cứng (hard-code) là `<= 10`.

### Backend Logic & Frontend Components
#### [MODIFY] `src/app/dashboard/page.tsx`
- **Data Fetching (Truy xuất Giá vốn - Cost Price):**
  - Query bảng `inventory_logs` (loại `RESTOCK`) để lấy ra `purchase_price` mới nhất của mỗi sản phẩm (`product_id`). 
  - Tạo `Map<productId, latest_purchase_price>` để dùng chung cho mọi công thức bên dưới.

- **Vốn lưu động (Working Capital):** 
  - Tính tổng giá trị hàng tồn: `SUM(product.stock_quantity * latest_purchase_price)`.
  - Hiển thị giá trị này thành một thông số trong nhóm Ngân quỹ (Treasury).

- **Báo cáo Điểm tái đặt hàng (Reorder Point):** 
  - Query danh sách `products` có `stock_quantity <= 10`.
  - Hiển thị một khung cảnh báo đỏ/cam báo hiệu hàng sắp hết, có nút **"Copy"** kịch bản đặt hàng (Ví dụ: *"Cho mình đặt thêm: Revive (Còn 3), Nước suối (Còn 1)..."*).

- **Cập nhật Công thức Lợi nhuận ròng (Net Profit):**
  - **Lãi sân** = Doanh thu sân.
  - **Lãi bán hàng** = Tổng (Doanh thu món đó - (Số lượng bán * latest_purchase_price)).
  - **Lợi nhuận ròng** = (Lãi sân + Lãi bán hàng) - (Chi phí cố định + Chi phí biến động). *(Đã chuyển từ dòng tiền sang Lợi nhuận thực tế - Accrual basis)*.

- **Top Sản phẩm bán chạy:**
  - Cập nhật Widget hiện tại (Top Products) thêm 2 số liệu mới: 
    - **Tổng Lãi** = Doanh thu bán sản phẩm - (Số lượng * latest_purchase_price).
    - **Tỉ suất lợi nhuận** = Tổng Lãi / Doanh thu bán sản phẩm.
  - Căn lề số liệu bằng CSS để người xem dễ so sánh sản phẩm nào mang lại nhiều tiền lời/tỉ suất nhất.

## Verification Plan
### Automated Tests
- Chạy `npx tsc --noEmit` để đảm bảo không lỗi type.

### Manual Verification
1. Kiểm tra Vốn lưu động có khớp logic `Tồn kho x Giá mua mới nhất` ở trang Sản phẩm.
2. Kiểm tra phần Báo cáo Điểm tái đặt hàng xem những món `<10` có hiện đầy đủ không. Bấm thử nút Copy xem nội dung sao chép có chuẩn không.
3. Kiểm tra Lợi nhuận ròng: Test nhanh bằng máy tính tay để so khớp `Lãi sân + Lãi bán hàng - Chi phí` có ra đúng kết quả.
4. Kiểm tra Cột Tỉ suất Lợi nhuận ở Top Products có hiển thị % chính xác.
