---
title: Invoices API Documentation
description: Tài liệu đặc tả các endpoints của API hóa đơn (Invoices API) bao gồm tra cứu, thanh toán, quản lý mặt hàng (items) và tự động tạo hóa đơn ngày.
createdAt: '2026-06-30T06:48:06.696Z'
updatedAt: '2026-06-30T06:48:25.949Z'
tags:
  - api
  - invoices
  - finance
---

# Invoices API Documentation

Tài liệu đặc tả các API liên quan đến quản lý Hóa đơn (Invoices), chi tiết mặt hàng (Invoice Items), tự động chốt doanh thu ngày và thanh toán hàng loạt.

---

## 1. Hóa đơn Cơ bản (GET / PATCH `/api/invoices`)

Quản lý tra cứu thông tin hóa đơn và thanh toán hóa đơn đơn lẻ.

### 1.1 Lấy thông tin hóa đơn (GET)
Trả về chi tiết hóa đơn theo bộ lọc (ID, trạng thái chưa thanh toán, hoặc theo khoảng thời gian).

* **Query Parameters**:
  * `invoiceId` (string, optional): ID của hóa đơn cụ thể. Trả về cả danh sách chi tiết mặt hàng.
  * `unpaid` (string, optional): `"true"` để lấy tất cả hóa đơn chưa thanh toán.
  * `startDate` & `endDate` (string, optional): Lọc các hóa đơn trong khoảng ngày (ISO string hoặc format YYYY-MM-DD).

* **Response (200 OK)**:
  * *Trường hợp tìm theo `invoiceId`*:
    ```json
    {
      "success": true,
      "invoice": {
        "id": "inv_123",
        "customer_id": "cust_456",
        "total_amount": 150000,
        "is_paid": false,
        "payment_method": null,
        "created_at": "2026-06-30T00:00:00.000Z"
      },
      "items": [
        {
          "id": "item_789",
          "product_id": "prod_abc",
          "quantity": 2,
          "sale_price": 50000,
          "is_pack_sold": false
        }
      ]
    }
    ```
  * *Trường hợp tìm theo `unpaid` hoặc khoảng thời gian*:
    ```json
    {
      "success": true,
      "data": [
        { "id": "inv_123", "total_amount": 150000, "is_paid": false }
      ]
    }
    ```

* **Error Responses**:
  * `400 Bad Request`: `{ "success": false, "error": "Missing parameters" }`
  * `404 Not Found`: `{ "success": false, "error": "Invoice not found" }`
  * `500 Internal Server Error`: `{ "success": false, "error": "Error message details" }`

---

### 1.2 Cập nhật trạng thái thanh toán (PATCH)
Thực hiện thanh toán cho một hóa đơn cụ thể.

* **Request Body (JSON)**:
  ```json
  {
    "invoiceId": "inv_123",
    "paymentMethod": "CASH", 
    "totalAmount": 150000
  }
  ```
  *(Chú ý: `paymentMethod` hỗ trợ `'CASH'`, `'BANK_TRANSFER'`, `'MOMO'`, v.v. Nếu `totalAmount` bị bỏ qua, hệ thống sẽ sử dụng tổng tiền hiện tại của hóa đơn).*

* **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

---

## 2. Chi tiết Mặt hàng Hóa đơn (POST / PUT / DELETE `/api/invoices/items`)

Thao tác trực tiếp với các dịch vụ/sản phẩm đi kèm trong hóa đơn (POS items). Thay đổi số lượng mặt hàng sẽ tự động cập nhật số lượng tồn kho (qua Trigger DB).

### 2.1 Thêm mặt hàng vào hóa đơn (POST)
Thêm sản phẩm mới hoặc tăng số lượng vào hóa đơn hiện tại.

* **Request Body (JSON)**:
  ```json
  {
    "invoiceId": "inv_123",
    "productId": "prod_abc",
    "quantity": 2,
    "salePrice": 50000,
    "isPackSold": false,
    "invoiceTotalAmount": 150000
  }
  ```

* **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

---

### 2.2 Cập nhật số lượng mặt hàng (PUT)
Thay đổi số lượng của một mặt hàng đã tồn tại trong hóa đơn.

* **Request Body (JSON)**:
  ```json
  {
    "itemId": "item_789",
    "invoiceId": "inv_123",
    "newQty": 3,
    "delta": 1,
    "salePrice": 50000,
    "invoiceTotalAmount": 200000
  }
  ```
  *(Chú ý: `delta` là hiệu số thay đổi số lượng: `newQty - oldQty`).*

* **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

---

### 2.3 Xóa mặt hàng khỏi hóa đơn (DELETE)
Loại bỏ hoàn toàn mặt hàng ra khỏi hóa đơn và khôi phục lại tồn kho.

* **Request Body (JSON)**:
  ```json
  {
    "itemId": "item_789",
    "invoiceId": "inv_123",
    "productId": "prod_abc",
    "quantity": 2,
    "salePrice": 50000,
    "isPackSold": false,
    "deduct": 1,
    "invoiceTotalAmount": 100000
  }
  ```

* **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

---

## 3. Chốt Hóa đơn Tự động (POST `/api/invoices/auto-generate`)

Tự động tạo hóa đơn nháp và chốt giờ chơi cho toàn bộ các lịch đặt sân chưa đóng hóa đơn trong ngày.

* **Request Body (JSON)**:
  ```json
  {
    "date": "2026-06-30"
  }
  ```
  *(Nếu không truyền `date`, mặc định sử dụng ngày hiện tại của máy chủ).*

* **Cơ chế hoạt động**:
  1. Quét toàn bộ các lịch đặt sân (`bookings`) có trạng thái `CONFIRMED` hoặc `CHECKED_IN` trong ngày chỉ định.
  2. Bỏ qua các lượt đặt đã tồn tại hóa đơn.
  3. Tính toán tiền thuê sân dựa trên khung giờ và nhóm khách hàng (`calculateRentalFee`).
  4. Trừ đi tiền đặt cọc (`deposit_amount`).
  5. Gọi hàm cơ sở dữ liệu RPC `close_booking_and_invoice` để tạo hóa đơn chưa thanh toán (`is_paid = false`) và đóng trạng thái booking một cách nguyên tử.

* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "generated": 3,
    "errors": [
      { "id": "book_abc", "error": "Chi tiết thông báo lỗi từ Database RPC" }
    ]
  }
  ```

---

## 4. Thanh toán Hàng loạt (POST `/api/invoices/pay-all`)

Hỗ trợ thanh toán toàn bộ công nợ/hóa đơn chưa thanh toán cho một khách hàng cụ thể hoặc khách vãng lai.

* **Request Body (JSON)**:
  ```json
  {
    "customer_id": "cust_456",
    "payment_method": "BANK_TRANSFER"
  }
  ```
  *(Sử dụng `customer_id: null` hoặc `"guest"` để thanh toán toàn bộ hóa đơn của khách vãng lai).*

* **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
