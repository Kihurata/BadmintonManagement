CREATE OR REPLACE FUNCTION check_in_booking(
    p_booking_id UUID,
    p_customer_id UUID,
    p_rental_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Đổi trạng thái ca đặt sân thành CHECKED_IN
    UPDATE bookings
    SET status = 'CHECKED_IN',
        total_court_fee = p_rental_fee
    WHERE id = p_booking_id AND status IN ('CONFIRMED', 'PENDING');

    -- 2. Đề phòng: Xem đã có hóa đơn chưa
    IF EXISTS (SELECT 1 FROM invoices WHERE booking_id = p_booking_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking đã được check-in hoặc đã có hóa đơn.');
    END IF;

    -- 3. Tạo Hóa Đơn với tổng tiền = tiền sân dự kiến (tính từ frontend)
    INSERT INTO invoices (booking_id, customer_id, total_amount, payment_method, is_paid)
    VALUES (p_booking_id, p_customer_id, p_rental_fee, NULL, FALSE)
    RETURNING id INTO v_invoice_id;

    v_result := jsonb_build_object(
        'success', true, 
        'invoice_id', v_invoice_id
    );
    
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
