Implementation Plan - Badminton Management System (BMS)
Goal Description
Xây dựng ứng dụng Web PWA quản lý sân cầu lông cho nội bộ sử dụng. Hỗ trợ đặt lịch, check-in/out, tính tiền giờ (sáng/tối/khách quen), bán hàng kho, và báo cáo doanh thu. Tập trung trải nghiệm Mobile cho nhân viên và Desktop cho quản lý.

User Review Required
IMPORTANT

Supabase Setup: User cần tự chạy script SQL trong Supabase Dashboard hoặc cung cấp thông tin kết nối (URL, Key) để ứng dụng hoạt động.

NOTE

Design System: Màu chủ đạo Midnight Blue (#1E293B) và Emerald Green (#10B981).

Proposed Changes
Project Structure (Next.js App Router)
src/app/: Main application routes (Project uses src directory)
(dashboard)/: Layout cho Desktop (Thống kê, Báo cáo)
(mobile)/: Layout tối ưu cho Mobile PWA (Check-in, POS)
api/: Route Handlers (nếu cần tính toán server-side phức tạp)
src/components/:
ui/: Shadcn UI components (Button, Calendar, Dialog...)
booking/: BookingCalendar, BookingForm, CourtCard
inventory/: ProductList, InventoryLogForm
layout/: Navbar, Sidebar (Desktop), BottomNav (Mobile)
src/lib/:
supabase.ts: Supabase client configuration
utils.ts: Helper functions (tính giá tiền, format currency)
constants.ts: Config giá, giờ mở cửa
Database (Supabase)
Sử dụng schema đã cung cấp:

customers (Loyal/Guest)
courts (Giá sáng/tối)
bookings (Lịch đặt)
products, inventory_logs (Kho)
invoices, invoice_items (Hóa đơn)
UI/UX Implementation
Theme: Dark mode default hoặc hybrid.
Colors:
Primary: Emerald Green (#10B981) - Nút chính, trạng thái thành công.
Background: Midnight Blue (#1E293B) - Nền ứng dụng.
Accent: Slate/Gray cho các thành phần phụ.
Mobile PWA: Sử dụng manifest.json, viewport meta tags, touch-friendly buttons.
Verification Plan
Automated Tests
Kiểm tra render trang chủ và các trang chính.
Kiểm tra luồng đặt sân cơ bản (Form submission).
Manual Verification
Mobile:
Mở trên chế độ giả lập Mobile.
Thử flow: Chọn sân -> Đặt giờ -> Check-in -> Thêm nước -> Check-out.
Desktop:
Xem Dashboard thống kê.
Quản lý danh sách sân và giá.