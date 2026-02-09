Kế hoạch phát triển Hệ Thống Quản Lý Sân Cầu Lông (BMS)
Giai đoạn 0: Khởi tạo dự án & Cơ sở dữ liệu
 Khởi tạo Next.js App (TypeScript, Tailwind CSS)
 Cài đặt các thư viện UI (Shadcn UI, Lucide React, Date libraries)
 Thiết lập kết nối Supabase (Client & Server components)
 Tạo file migration/schema.sql từ script SQL đã cung cấp
 Thiết lập Design System (Theme Midnight Blue & Emerald Green)
Giai đoạn 1: Đặt sân & Trả sân cơ bản (Ngày 1-2)
 Xây dựng giao diện Danh sách sân (Court List)
 Xây dựng giao diện Lịch sân (Calendar/Timeline View)
 Form Đặt sân mới (Booking Form) - Validation cơ bản, chống trùng lịch
 Tính năng Check-in (Chuyển trạng thái Pending -> Checked_in)
 Tính năng Check-out cơ bản (Chuyển trạng thái -> Completed, chưa tính tiền phức tạp)
Giai đoạn 2: Quản lý kho & Bán lẻ (Ngày 3-4)
 Quản lý Sản phẩm (Danh sách, Thêm/Sửa/Xóa đơn giản)
 Quản lý Nhập/Xuất kho (Inventory Logs)
 Tích hợp bán hàng vào Check-out (Thêm nước/cầu vào hóa đơn)
 Form Bán lẻ riêng (POS cho khách vãng lai mua nước)
Giai đoạn 3: Logic phức tạp & Báo cáo (Ngày 5-7)
 Logic tính giá nâng cao (Sáng/Tối, Khách quen/Vãng lai, Split pricing)
 Xử lý Overtime tự động khi Check-out muộn
 Quản lý Lịch cố định (Fixed Slots - Recurring Bookings)
 Dashboard Thống kê & Báo cáo doanh thu (PC View)
 Tối ưu PWA cho Mobile (Manifest, Viewport settings)