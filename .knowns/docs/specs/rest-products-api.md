---
title: RESTful Products API Spec
description: Specification for RESTful Products API
createdAt: '2026-06-20T14:42:00.000Z'
tags:
  - spec
  - approved
---

# RESTful Products API Spec

## Overview
Dự án cần nâng cấp cấu trúc API để quản lý kho sản phẩm (products) sang chuẩn RESTful. Tài liệu này đặc tả chi tiết thiết kế RESTful API v1 cho tài nguyên `products`, làm mẫu để đồng bộ hóa cho các tài nguyên khác trong tương lai.

## Locked Decisions
- **D1:** Sử dụng cấu trúc phiên bản dạng `/api/v1/products` cho việc liệt kê/tạo mới sản phẩm, và `/api/v1/products/[productId]` cho việc lấy chi tiết, cập nhật và xóa.
- **D2:** API lấy danh sách `GET /api/v1/products` mặc định trả về tất cả sản phẩm, hỗ trợ tham số lọc còn hàng (`?onlyAvailable=true`) và tìm kiếm theo tên (`?search=...`).
- **D3:** Các phương thức thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`) được bảo vệ trực tiếp ở tầng Route Handler, chỉ cho phép vai trò `OWNER` hoặc `MANAGER` thực hiện. Nhân viên có vai trò `STAFF` hoặc yêu cầu chưa đăng nhập sẽ nhận lỗi `403 Forbidden` / `401 Unauthorized`.

## Requirements

### Functional Requirements
- **FR-1 (GET list):** Cho phép client lấy danh sách sản phẩm. Trả về tất cả sản phẩm theo mặc định, sắp xếp theo tên (`product_name`) tăng dần. Hỗ trợ lọc qua query parameters.
- **FR-2 (GET detail):** Cho phép client lấy chi tiết một sản phẩm theo ID (`productId`). Trả về mã lỗi 404 nếu không tồn tại.
- **FR-3 (POST create):** Cho phép admin (OWNER/MANAGER) tạo sản phẩm mới. Yêu cầu validate dữ liệu đầu vào (`product_name`, `unit_price`, `stock_quantity`).
- **FR-4 (PUT/PATCH update):** Cho phép admin cập nhật thông tin sản phẩm. PUT cập nhật toàn bộ thuộc tính, PATCH cập nhật một vài thuộc tính chỉ định.
- **FR-5 (DELETE delete):** Cho phép admin xóa sản phẩm. Nếu sản phẩm đã được liên kết với hóa đơn hoặc nhật ký kho hàng, API trả về lỗi `409 Conflict` kèm thông điệp giải thích.

### Non-Functional Requirements
- **NFR-1 (Performance):** Thời gian phản hồi cho các yêu cầu GET không vượt quá 200ms.
- **NFR-2 (Security):** Toàn bộ API Route Handlers phiên bản v1 phải kiểm tra quyền hạn của người dùng từ Supabase JWT Token nhận được trong request headers/cookies.

## Acceptance Criteria
- [ ] **AC-1:** Liệt kê sản phẩm: `GET /api/v1/products` trả về 200 OK kèm danh sách sản phẩm.
- [ ] **AC-2:** Liệt kê sản phẩm có lọc: `GET /api/v1/products?onlyAvailable=true` loại bỏ các sản phẩm có `stock_quantity <= 0`.
- [ ] **AC-3:** Tìm kiếm: `GET /api/v1/products?search=Nuoc` trả về danh sách sản phẩm có tên chứa chữ "Nuoc".
- [ ] **AC-4:** Chi tiết sản phẩm: `GET /api/v1/products/[productId]` trả về 200 OK kèm chi tiết sản phẩm nếu tìm thấy, ngược lại trả về 404.
- [ ] **AC-5:** Tạo sản phẩm hợp lệ: `POST /api/v1/products` với tài khoản quản trị trả về 201 Created và dữ liệu sản phẩm vừa tạo.
- [ ] **AC-6:** Phân quyền API: Gửi request `POST`, `PUT`, `PATCH`, hoặc `DELETE` bằng tài khoản `STAFF` trả về lỗi 403 Forbidden kèm JSON mô tả lỗi chuẩn hóa.
- [ ] **AC-7:** Xóa sản phẩm bị ràng buộc ngoại khóa: `DELETE /api/v1/products/[productId]` của một sản phẩm đã bán trả về lỗi 409 Conflict thay vì lỗi DB thô.

## Scenarios

### Scenario 1: Lấy danh sách sản phẩm còn hàng
**Given** Cơ sở dữ liệu có sản phẩm A (10 chai), sản phẩm B (0 chai)
**When** Gửi yêu cầu `GET /api/v1/products?onlyAvailable=true`
**Then** Phản hồi trả về mã 200 OK với danh sách chỉ chứa sản phẩm A

### Scenario 2: Nhân viên STAFF cố gắng tạo sản phẩm mới
**Given** Người dùng đăng nhập có vai trò `STAFF`
**When** Gửi yêu cầu `POST /api/v1/products` với body hợp lệ
**Then** Phản hồi trả về mã 403 Forbidden với thông điệp: "Access denied. Action restricted to OWNER or MANAGER roles."

### Scenario 3: Xóa sản phẩm chưa từng giao dịch thành công
**Given** Sản phẩm C mới tạo và chưa có trong bất kỳ hóa đơn nào
**When** Gửi yêu cầu `DELETE /api/v1/products/[productId]` bởi admin
**Then** Phản hồi trả về mã 200 OK với thông điệp thành công và sản phẩm C bị xóa khỏi cơ sở dữ liệu

## Technical Notes
- Triển khai sử dụng Next.js Route Handlers (`src/app/api/v1/products/route.ts` và `src/app/api/v1/products/[productId]/route.ts`).
- **Tránh Double-Fetching (Loopback HTTP):**
  - Tại **Server Components (RSC)** hoặc **Server Actions**, tuyệt đối KHÔNG sử dụng `fetch('/api/v1/products')` để gọi chính nó. Thay vào đó, gọi trực tiếp các hàm nghiệp vụ từ [product-repo.ts](file:///d:/BadmintonManagement/src/server/repositories/product-repo.ts).
  - API Route Handlers chỉ được sử dụng cho các tương tác động từ **Client Components** ở trình duyệt (ví dụ: tìm kiếm real-time, gửi form, click nút thao tác).
- Tái sử dụng tầng logic từ [product-repo.ts](file:///d:/BadmintonManagement/src/server/repositories/product-repo.ts) để thao tác với Supabase.
- Định nghĩa hàm kiểm tra quyền hạn `verifyUserRole` trong một helper chung của API để tái sử dụng.
- Dữ liệu lỗi trả về phải tuân thủ schema: `{ "success": false, "error": { "code": "...", "message": "..." } }`.

## Open Questions
- [ ] Có nên bổ sung cơ chế Log lịch sử kho hàng (`inventory_logs`) trực tiếp khi gọi API tạo hoặc cập nhật số lượng tồn kho sản phẩm từ Admin không, hay để trigger cơ sở dữ liệu xử lý tự động?
