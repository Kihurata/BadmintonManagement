---
title: Optimize and unify invoice components
description: Specification for unifying invoice breakdowns, payment selectors, and optimizing product displays.
createdAt: '2026-05-24T09:27:12.898Z'
updatedAt: '2026-05-24T09:30:36.262Z'
tags:
  - spec
  - approved
---

# Đặc tả: Tối ưu hóa và Đồng bộ hóa Hợp phần Hóa đơn (Optimize and Unify Invoice Components)

Tài liệu này đặc tả yêu cầu nghiệp vụ, tiêu chí nghiệm thu và kế hoạch triển khai để tái cấu trúc luồng tính toán, hiển thị hóa đơn và phương thức thanh toán trong hệ thống Quản lý Sân Cầu lông.

## Overview

Hệ thống hiện tại đang gặp tình trạng lặp lại mã nguồn (code duplication) và bất đồng bộ giao diện trong việc hiển thị chi tiết hóa đơn, chọn phương thức thanh toán và tạo mã VietQR trên nhiều màn hình (`CheckoutForm`, `InvoiceDetailDialog`, `QuickSaleForm`). Yêu cầu đặt ra là gom nhóm các khối hiển thị này thành các Component dùng chung để dễ bảo trì, đồng thời tối ưu hóa giao diện chọn sản phẩm trong biểu mẫu bán lẻ để nâng cao trải nghiệm của nhân viên quầy.

## Locked Decisions

Các quyết định đã được thống nhất với người dùng:
- **D1**: Trong màn hình Bán lẻ (`QuickSaleForm`), thẻ tóm tắt hóa đơn chỉ hiển thị Tổng tiền (không hiển thị lại danh sách sản phẩm) để tránh lặp lại thông tin với lưới chọn đồ ở trên. Các màn hình khác vẫn liệt kê đầy đủ.
- **D2**: Các sản phẩm bán chạy nhất gồm nước uống và trái cầu (ví dụ: nước suối, Revive, Sting, quả cầu lông lẻ hoặc ống cầu lông) sẽ được cấu hình bằng danh sách tên/ID cứng ở frontend để hiển thị lên đầu. Các sản phẩm còn lại sẽ bị thu gọn dưới nút mở rộng.
- **D3**: Nút chia sẻ hóa đơn (Share/Copy Bill text) sẽ chỉ xuất hiện ở màn hình Xem chi tiết hóa đơn (`InvoiceDetailDialog`), không tích hợp vào biểu mẫu Trả sân (`CheckoutForm`).

## Requirements

### Functional Requirements

- **FR-1 [Unified Card]**: Xây dựng Component `InvoiceSummaryCard` nhận các tham số đầu vào (tiền sân, phụ phí, tiền cọc, tiền dịch vụ, tổng tiền, danh sách dịch vụ) để vẽ giao diện chi tiết hóa đơn đồng bộ.
- **FR-2 [Payment Selector]**: Xây dựng Component `PaymentSelector` tích hợp chọn Tiền mặt/Chuyển khoản và tự động tạo/hiển thị ảnh QR Code VietQR động.
- **FR-3 [Centralized Helpers]**: Xây dựng file tiện ích `src/lib/invoice-utils.ts` chứa hàm tạo URL VietQR và định dạng nội dung chia sẻ hóa đơn qua Zalo.
- **FR-4 [Collapsed POS List]**: Trong giao diện chọn sản phẩm bán lẻ (`QuickSaleForm` và `BookingDetails`), chia danh sách thành 2 phần: phần ưu tiên hiển thị (nước & cầu) và phần phụ bị thu gọn mặc định. Nhân viên có thể nhấn nút "Xem thêm sản phẩm khác" để hiển thị danh sách đầy đủ.

### Non-Functional Requirements

- **NFR-1 [Performance]**: Không làm thay đổi tốc độ phản hồi hoặc gây trễ khi nhân viên quầy thao tác tăng giảm số lượng sản phẩm.
- **NFR-2 [Responsiveness]**: Giao diện các card hóa đơn và lưới sản phẩm phải hiển thị tốt trên thiết bị di động (mobile-friendly).

## Acceptance Criteria

- [ ] **AC-1**: Giao diện chi tiết hóa đơn (Breakdown Card) ở màn hình Trả Sân (`CheckoutForm`) và Xem Lịch Sử (`InvoiceDetailDialog`) giống nhau 100%.
- [ ] **AC-2**: Chỉ hiển thị Tổng tiền ở màn hình Bán lẻ (`QuickSaleForm`) khi giỏ hàng có đồ, không hiển thị trùng lặp lại danh sách sản phẩm.
- [ ] **AC-3**: Mặc định khi mở màn hình Bán lẻ hoặc POS đặt sân, các sản phẩm ít bán (như vợt thuê, phụ kiện) sẽ bị thu gọn và hiển thị nút "Xem thêm sản phẩm khác". Khi bấm nút này, danh sách mới mở rộng ra đầy đủ.
- [ ] **AC-4**: Tất cả các mã QR thanh toán trên hệ thống đều sinh ra từ hàm tiện ích dùng chung trong `invoice-utils.ts`.
- [ ] **AC-5**: Chạy `knowns validate` không phát hiện lỗi liên kết hay cấu trúc tài liệu.

## Scenarios

### Scenario 1: Thanh toán Trả Sân (Checkout) có Dịch vụ đi kèm
- **Given**: Khách hàng ở sân 1 chơi quá giờ và có gọi 2 chai nước Revive.
- **When**: Nhân viên bấm "Thanh toán & Trả Sân".
- **Then**: Màn hình hiển thị chi tiết hóa đơn gồm: Tiền sân thực tế, Tiền dịch vụ (2 Revive - 30.000đ), Tổng tiền. Mã VietQR hiển thị đúng số tiền tổng khi chọn Chuyển khoản.

### Scenario 2: Thu gọn sản phẩm ít bán trong Quick Sale
- **Given**: Biểu mẫu Bán Nhanh (`QuickSaleForm`) được kích hoạt.
- **When**: Giao diện tải danh sách sản phẩm.
- **Then**: Chỉ các sản phẩm thường dùng (Nước ngọt, Trái cầu) hiện ra ở lưới trên cùng kèm nút chọn số lượng. Các sản phẩm như Dịch vụ thuê vợt ẩn đi và có nút "Xem thêm sản phẩm khác" nằm dưới cùng.
- **When**: Người dùng bấm nút "Xem thêm sản phẩm khác".
- **Then**: Danh sách mở rộng hiển thị toàn bộ sản phẩm đang có trong kho.

## Technical Notes

- Danh sách sản phẩm ưu tiên hiển thị (cấu hình cứng theo tên) bao gồm các từ khóa: `"Nước suối"`, `"Revive"`, `"Sting"`, `"Cầu lông"`, `"Quả cầu"`, `"Ống cầu"`.
- Hàm helper tạo VietQR sẽ gọi API của `img.vietqr.io` với các tham số: số tiền, nội dung thanh toán và thông tin tài khoản được định nghĩa tập trung.

## Open Questions

Không còn câu hỏi mở nào sau khi đã chốt các quyết định D1, D2, D3.
