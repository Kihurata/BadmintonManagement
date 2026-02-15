CREATE OR REPLACE FUNCTION fn_auto_sync_inventory_v2()
RETURNS TRIGGER AS $$
DECLARE
    delta_qty INT;
BEGIN
    -- Trường hợp 1: Thêm mới món hàng vào hóa đơn
    IF (TG_OP = 'INSERT') THEN
        delta_qty := NEW.quantity;
    
    -- Trường hợp 2: Khách lấy thêm (hoặc bớt) món hàng đã có
    ELSIF (TG_OP = 'UPDATE') THEN
        delta_qty := NEW.quantity - OLD.quantity;
    END IF;

    -- Chỉ ghi log và trừ kho nếu có sự thay đổi về số lượng
    IF delta_qty != 0 THEN
        -- 1. Tạo log biến động (Số lượng dương là nhập, số âm là xuất)
        INSERT INTO inventory_logs (product_id, type, quantity, reason, related_invoice_id)
        VALUES (NEW.product_id, 'SALE', -delta_qty, 'Cập nhật hóa đơn', NEW.invoice_id);
        
        -- 2. Cập nhật trực tiếp vào bảng tồn kho
        UPDATE products 
        SET stock_quantity = stock_quantity - delta_qty
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gán Trigger cho cả INSERT và UPDATE
DROP TRIGGER IF EXISTS trg_sync_inv ON invoice_items;
CREATE TRIGGER trg_sync_inv
AFTER INSERT OR UPDATE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION fn_auto_sync_inventory_v2();


CREATE OR REPLACE FUNCTION fn_update_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_items_total DECIMAL;
    v_court_fee DECIMAL;
    v_overtime_fee DECIMAL;
    v_deposit DECIMAL;
BEGIN
    -- 1. Xác định ID hóa đơn đang được thao tác
    IF (TG_OP = 'DELETE') THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- 2. Tính tổng tiền tất cả hàng hóa trong hóa đơn này
    SELECT COALESCE(SUM(quantity * sale_price), 0)
    INTO v_items_total
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;

    -- 3. Lấy tiền sân, phí quá giờ và tiền cọc từ bảng bookings liên quan
    SELECT 
        COALESCE(b.total_court_fee, 0), 
        COALESCE(b.overtime_fee, 0),
        COALESCE(b.deposit_amount, 0)
    INTO v_court_fee, v_overtime_fee, v_deposit
    FROM invoices i
    JOIN bookings b ON i.booking_id = b.id
    WHERE i.id = v_invoice_id;

    -- 4. Cập nhật lại tổng tiền cuối cùng vào bảng invoices
    -- Công thức: (Tiền sân + Phí quá giờ + Tiền hàng) - Tiền cọc
    UPDATE invoices
    SET total_amount = (v_court_fee + v_overtime_fee + v_items_total) - v_deposit
    WHERE id = v_invoice_id;

    RETURN NULL; -- Đối với AFTER trigger, giá trị trả về không quan trọng
END;
$$ LANGUAGE plpgsql;

-- Kích hoạt Trigger sau khi INSERT, UPDATE hoặc DELETE trên bảng invoice_items
DROP TRIGGER IF EXISTS trg_update_invoice_total ON invoice_items;
CREATE TRIGGER trg_update_invoice_total
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION fn_update_invoice_total();

-- Thêm cột để lưu ID hóa đơn trong log kho (nếu chưa có)
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS related_invoice_id UUID;