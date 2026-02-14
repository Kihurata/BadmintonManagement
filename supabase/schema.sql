-- 1. ENUMS (Định nghĩa các tập giá trị cố định)
CREATE TYPE customer_type AS ENUM ('LOYAL', 'GUEST');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'BANK_TRANSFER');
CREATE TYPE inventory_log_type AS ENUM ('SALE', 'INTERNAL_USE', 'DAMAGED', 'RESTOCK');

-- 2. BẢNG KHÁCH HÀNG
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    type customer_type DEFAULT 'GUEST',
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG SÂN CẦU LÔNG (Lưu cấu hình giá)
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_name TEXT NOT NULL,
    -- Giá cho khách thân thiết
    morning_price_loyal DECIMAL DEFAULT 50000,
    evening_price_loyal DECIMAL DEFAULT 70000,
    -- Giá cho khách vãng lai
    morning_price_guest DECIMAL DEFAULT 60000,
    evening_price_guest DECIMAL DEFAULT 80000,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. BẢNG QUY TẮC ĐẶT LỊCH CỐ ĐỊNH (Fixed Slots)
CREATE TABLE recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    court_id UUID REFERENCES courts(id),
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Chủ nhật
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL nếu kéo dài vô tận
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG ĐẶT SÂN (Bookings)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    court_id UUID REFERENCES courts(id),
    recurring_rule_id UUID REFERENCES recurring_rules(id), -- Để biết lịch này thuộc slot cố định nào
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    actual_end_time TIMESTAMPTZ, -- Dùng để tính Overtime
    deposit_amount DECIMAL DEFAULT 0,
    overtime_fee DECIMAL DEFAULT 0,
    total_court_fee DECIMAL DEFAULT 0,
    status booking_status DEFAULT 'PENDING',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ràng buộc tránh đặt giờ kết thúc trước giờ bắt đầu
    CONSTRAINT check_booking_time CHECK (end_time > start_time)
);

-- 6. BẢNG SẢN PHẨM (Hàng hóa)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    base_unit TEXT DEFAULT 'Cái',       -- Đơn vị nhỏ nhất (Trái, Chai, Cái)
    pack_unit TEXT DEFAULT 'Ống',       -- Đơn vị đóng gói (Ống, Thùng, Lốc)
    units_per_pack INT DEFAULT 1,       -- Số lượng quy đổi (Mặc định là 1)
    
    unit_price DECIMAL NOT NULL,        -- Giá bán lẻ 1 đơn vị cơ sở
    pack_price DECIMAL,                 -- Giá bán theo gói (Nếu NULL thì tự động dùng unit_price * units_per_pack)
    
    stock_quantity INT DEFAULT 0,       -- Luôn lưu theo đơn vị cơ sở (số trái, số chai)
    is_packable BOOLEAN DEFAULT FALSE   -- Đánh dấu sản phẩm này có bán theo gói hay không
);

-- 7. BẢNG NHẬT KÝ KHO (Nhập/Xuất/Hỏng/Nội bộ)
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    type inventory_log_type NOT NULL,
    quantity INT NOT NULL, -- Số lượng thay đổi (+ hoặc -)
    purchase_price DECIMAL, -- Giá vốn lúc nhập (để tính lãi lỗ)
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG HÓA ĐƠN (Tổng hợp cuối cùng)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    customer_id UUID REFERENCES customers(id),
    total_amount DECIMAL NOT NULL,
    payment_method payment_method DEFAULT 'CASH',
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CHI TIẾT HÓA ĐƠN (Hàng hóa đi kèm)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    product_id UUID REFERENCES products(id),
    quantity INT NOT NULL,
    sale_price DECIMAL NOT NULL -- Lưu giá lúc bán để báo cáo chính xác
);

-- Tăng tốc kiểm tra trùng lịch theo thời gian
CREATE INDEX idx_bookings_time ON bookings (court_id, start_time, end_time);

-- Tăng tốc tìm kiếm khách hàng qua số điện thoại
CREATE INDEX idx_customers_phone ON customers (phone);

-- Tăng tốc lọc hóa đơn theo ngày để làm báo cáo máy tính
CREATE INDEX idx_invoices_created_at ON invoices (created_at);
