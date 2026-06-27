---
title: RESTful Products API Documentation
description: API reference and integration guide for the versioned RESTful Products API (v1).
createdAt: '2026-06-27T06:04:50.315Z'
updatedAt: '2026-06-27T06:05:00.000Z'
tags:
  - api
  - products
  - reference
---

# Tài liệu RESTful Products API (v1)

Tài liệu đặc tả chi tiết và hướng dẫn tích hợp các API quản lý sản phẩm thuộc tài nguyên `products` phiên bản v1 (`/api/v1/products/*`).

---

## 1. Cấu trúc Chung & Định dạng Dữ liệu

### Địa chỉ gốc (Base Path)
Tất cả các API được triển khai dưới cấu trúc App Router của Next.js với địa chỉ gốc:
```
/api/v1/products
```

### Định dạng Dữ liệu Phản hồi (Response Format)

#### Phản hồi Thành công (Success Response)
```json
{
  "success": true,
  "data": <Dữ_liệu_trả_về>
}
```

#### Phản hồi Thất bại (Error Response)
Mọi lỗi phát sinh từ hệ thống hoặc lỗi do phía client gửi yêu cầu không hợp lệ đều được định dạng chuẩn hóa:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_SERVER_ERROR",
    "message": "Thông điệp mô tả chi tiết lỗi."
  }
}
```

---

## 2. Bảo mật & Phân quyền (RBAC)

Các quyền hạn tương tác với API được quản lý trực tiếp bằng JWT Token của Supabase và được kiểm duyệt ở tầng Route Handler:
* **GET** (Xem thông tin): Cho phép tất cả các tài khoản (`STAFF`, `MANAGER`, `OWNER`) truy cập.
* **POST / PUT / PATCH / DELETE** (Ghi dữ liệu): Chỉ cho phép vai trò `OWNER` hoặc `MANAGER`.
  * Nếu người dùng có vai trò `STAFF`, API lập tức từ chối và trả về mã **`403 Forbidden`**.
  * Nếu không đính kèm token hợp lệ trong Header, API trả về mã **`401 Unauthorized`**.

---

## 3. Đặc tả Chi tiết các Endpoints

### 3.1. Lấy danh sách sản phẩm
* **Method & URL**: `GET /api/v1/products`
* **Phân quyền**: Tất cả vai trò
* **Query Parameters (Tùy chọn)**:
  * `onlyAvailable` (boolean): Nếu truyền `true`, chỉ trả về các sản phẩm còn hàng (`stock_quantity > 0`).
  * `search` (string): Tìm kiếm sản phẩm theo tên (không phân biệt hoa thường, hỗ trợ tìm kiếm một phần).
* **Quy tắc Sắp xếp**: Mặc định sắp xếp theo tên sản phẩm (`product_name`) tăng dần.

#### Phản hồi mẫu (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "product_name": "Nước suối Aquafina 500ml",
      "unit_price": 10000,
      "stock_quantity": 48,
      "base_unit": "Chai",
      "is_packable": true,
      "pack_unit": "Thùng",
      "units_per_pack": 24,
      "pack_price": 220000,
      "created_at": "2026-06-20T14:42:00.000Z"
    }
  ]
}
```

---

### 3.2. Tạo sản phẩm mới
* **Method & URL**: `POST /api/v1/products`
* **Phân quyền**: Chỉ `OWNER` hoặc `MANAGER`
* **Request Body (JSON)**:
  * Xem quy tắc Zod Schema Validation ở mục 4 bên dưới.

#### Phản hồi mẫu (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "e305d045-8167-4bb9-bdff-83f1df7ef1bf",
    "product_name": "Nước ngọt Coca-Cola 330ml",
    "unit_price": 12000,
    "stock_quantity": 100,
    "base_unit": "Lon",
    "is_packable": true,
    "pack_unit": "Khay",
    "units_per_pack": 24,
    "pack_price": 270000,
    "created_at": "2026-06-24T00:30:00.000Z"
  }
}
```

---

### 3.3. Lấy chi tiết sản phẩm
* **Method & URL**: `GET /api/v1/products/[productId]`
* **Phân quyền**: Tất cả vai trò

#### Phản hồi mẫu (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "product_name": "Nước suối Aquafina 500ml",
    "unit_price": 10000,
    "stock_quantity": 48,
    "base_unit": "Chai",
    "is_packable": true,
    "pack_unit": "Thùng",
    "units_per_pack": 24,
    "pack_price": 220000,
    "created_at": "2026-06-20T14:42:00.000Z"
  }
}
```
* **Lỗi 404 Not Found**: Trả về nếu không tồn tại sản phẩm với ID chỉ định.

---

### 3.4. Cập nhật toàn bộ sản phẩm (PUT)
* **Method & URL**: `PUT /api/v1/products/[productId]`
* **Phân quyền**: Chỉ `OWNER` hoặc `MANAGER`
* **Mô tả**: Dùng để cập nhật **toàn bộ** thông tin sản phẩm. Tất cả các trường bắt buộc của schema phải được gửi đầy đủ trong request body.
* **Lưu ý quan trọng**: Những trường tùy chọn (`optional`) nếu không truyền hoặc truyền `null` sẽ bị cập nhật về `null` trong database.

#### Phản hồi mẫu (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "product_name": "Nước Aquafina 500ml (Cập nhật)",
    "unit_price": 11000,
    "stock_quantity": 48,
    "base_unit": "Chai",
    "is_packable": true,
    "pack_unit": "Thùng",
    "units_per_pack": 24,
    "pack_price": 220000,
    "created_at": "2026-06-20T14:42:00.000Z"
  }
}
```

---

### 3.5. Cập nhật một phần sản phẩm (PATCH)
* **Method & URL**: `PATCH /api/v1/products/[productId]`
* **Phân quyền**: Chỉ `OWNER` hoặc `MANAGER`
* **Mô tả**: Dùng để cập nhật **một số** thuộc tính chỉ định. API chỉ validate các trường được gửi lên trong request body.
* **Lưu ý quan trọng**: Các trường không được gửi lên (omitted/undefined) sẽ được giữ nguyên giá trị hiện có trong database (không bị ghi đè thành giá trị mặc định).

---

### 3.6. Xóa sản phẩm
* **Method & URL**: `DELETE /api/v1/products/[productId]`
* **Phân quyền**: Chỉ `OWNER` hoặc `MANAGER`

#### Lỗi 409 Conflict (Ràng buộc Ngoại khóa)
Nếu sản phẩm đã phát sinh giao dịch (nằm trong bất kỳ hóa đơn nào trong bảng `invoice_items`), hệ thống sẽ bắt lỗi vi phạm ràng buộc ngoại khóa từ Postgres (`23503`) và trả về lỗi chuẩn hóa thay vì lỗi thô:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Không thể xóa sản phẩm này vì đã có hóa đơn liên kết. Hãy ẩn sản phẩm thay vì xóa."
  }
}
```

---

## 4. Quy tắc Validation dữ liệu (Zod Schemas)

API sử dụng Zod để kiểm tra tính hợp lệ của dữ liệu đầu vào. Dưới đây là các ràng buộc chi tiết:

| Trường | Kiểu dữ liệu | Bắt buộc (POST/PUT) | Ràng buộc validation |
| :--- | :--- | :--- | :--- |
| `product_name` | string | **Có** | Không được để trống (sau khi loại bỏ khoảng trắng thừa) |
| `unit_price` | number | **Có** | Phải lớn hơn `0` |
| `stock_quantity` | number (int) | **Có** | Phải là số nguyên không âm (tối thiểu là `0`) |
| `base_unit` | string / null | Không | Mặc định là `null` hoặc tùy chọn chuỗi |
| `is_packable` | boolean | Không | Mặc định là `false`. Nếu là `true`, kích hoạt Ràng buộc đóng gói bên dưới. |
| `pack_unit` | string / null | Không* | Bắt buộc phải có giá trị chuỗi hợp lệ nếu `is_packable` là `true`. |
| `units_per_pack`| number (int) | Không* | Phải là số nguyên dương lớn hơn `0` (Bắt buộc nếu `is_packable` là `true`). |
| `pack_price` | number | Không* | Phải lớn hơn `0` (Bắt buộc nếu `is_packable` là `true`). |

> [!IMPORTANT]
> **Ràng buộc đóng gói có điều kiện (Conditional Validation):**
> Trong các trường hợp `POST`, `PUT` và `PATCH` (khi `is_packable` được cập nhật thành `true`), Zod sẽ thực thi hàm `.refine()` để kiểm duyệt chéo: nếu sản phẩm hỗ trợ đóng gói (`is_packable: true`), ba trường đóng gói (`pack_unit`, `units_per_pack`, và `pack_price`) **bắt buộc** phải khác `null` hoặc `undefined`, ngược lại API sẽ trả về lỗi `400 Bad Request`.

---

## 5. Quy trình xử lý lỗi tại API (Flowchart)

Sơ đồ tuần tự xử lý yêu cầu và kiểm duyệt lỗi tại Route Handler của Next.js:

```mermaid
sequenceDiagram
    autonumber
    Client->>Route Handler: Gửi Yêu cầu (Request)
    Note over Route Handler: 1. Kiểm tra JWT Token & Phân quyền
    alt Token không hợp lệ hoặc thiếu
        Route Handler-->>Client: Trả về 401 Unauthorized
    else Vai trò người dùng là STAFF
        Route Handler-->>Client: Trả về 403 Forbidden
    end
    
    Note over Route Handler: 2. Parse Body JSON
    alt Body trống hoặc JSON lỗi cú pháp
        Route Handler-->>Client: Trả về 400 Bad Request
    end

    Note over Route Handler: 3. Validate Zod Schema
    alt Validation không thành công
        Route Handler-->>Client: Trả về 400 Bad Request (Kèm thông báo lỗi đầu tiên)
    end

    Note over Route Handler: 4. Gọi DB Repository
    alt Thực hiện thành công
        Route Handler-->>Client: Trả về 200/201 kèm dữ liệu
    else Xóa sản phẩm bị ràng buộc ngoại khóa (Code 23503)
        Route Handler-->>Client: Trả về 409 Conflict
    else Lỗi hệ thống khác
        Route Handler-->>Client: Trả về 500 Internal Server Error
    end
```
