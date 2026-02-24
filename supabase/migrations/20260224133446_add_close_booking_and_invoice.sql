CREATE OR REPLACE FUNCTION close_booking_and_invoice(
    p_booking_id UUID,
    p_customer_id UUID,
    p_total_amount NUMERIC,
    p_rental_fee NUMERIC,
    p_actual_end_time TIMESTAMPTZ
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
    v_result JSONB;
BEGIN
    -- 1. KIỂM TRA ĐỀ PHÒNG: Xem booking đã có hóa đơn hay chưa, nếu có rồi thì huỷ bỏ tránh lặp
    IF EXISTS (SELECT 1 FROM invoices WHERE booking_id = p_booking_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking này đã có hóa đơn.');
    END IF;

    -- 2. TẠO HÓA ĐƠN
    INSERT INTO invoices (booking_id, customer_id, total_amount, payment_method, is_paid)
    VALUES (p_booking_id, p_customer_id, p_total_amount, NULL, FALSE)
    RETURNING id INTO v_invoice_id;

    -- 3. ĐỔI TRẠNG THÁI CA ĐẶT SÂN
    UPDATE bookings
    SET status = 'COMPLETED',
        actual_end_time = p_actual_end_time,
        total_court_fee = p_rental_fee
    WHERE id = p_booking_id;

    -- Báo cáo thành công (Trả về id hóa đơn vừa tạo)
    v_result := jsonb_build_object(
        'success', true, 
        'invoice_id', v_invoice_id
    );
    
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Quá trình lỗi sẽ tự động Rollback
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
