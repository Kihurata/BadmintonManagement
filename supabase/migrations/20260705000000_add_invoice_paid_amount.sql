-- Migration: Add paid_amount to invoices, add syncing trigger, and update check_in_booking RPC

-- 1. Add paid_amount column to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL NOT NULL DEFAULT 0;

-- 2. Backfill existing paid invoices
UPDATE public.invoices SET paid_amount = total_amount WHERE is_paid = TRUE;

-- 3. Create invoice status syncing function and trigger
CREATE OR REPLACE FUNCTION public.sync_invoice_paid_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_paid is being set to true, ensure paid_amount matches total_amount
    IF NEW.is_paid = TRUE AND (OLD IS NULL OR OLD.is_paid = FALSE OR NEW.paid_amount < NEW.total_amount) THEN
        NEW.paid_amount := NEW.total_amount;
    END IF;

    -- Determine is_paid status based on paid_amount vs total_amount
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.is_paid := TRUE;
    ELSE
        NEW.is_paid := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_paid_status ON public.invoices;

CREATE TRIGGER trg_sync_invoice_paid_status
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_paid_status();

-- 4. Update check_in_booking function to support prepaid bookings
CREATE OR REPLACE FUNCTION public.check_in_booking(
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
    v_is_paid BOOLEAN;
    v_result JSONB;
BEGIN
    -- Check if an invoice already exists for this booking
    SELECT id, is_paid INTO v_invoice_id, v_is_paid 
    FROM public.invoices 
    WHERE booking_id = p_booking_id 
    LIMIT 1;

    IF v_invoice_id IS NOT NULL THEN
        IF v_is_paid = TRUE THEN
            -- Booking is prepaid! Update status and succeed.
            UPDATE public.bookings
            SET status = 'CHECKED_IN',
                total_court_fee = p_rental_fee
            WHERE id = p_booking_id AND status IN ('CONFIRMED', 'PENDING');

            RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id);
        ELSE
            -- Booking is already checked in with unpaid invoice
            RETURN jsonb_build_object('success', false, 'error', 'Booking đã được check-in hoặc đã có hóa đơn.');
        END IF;
    END IF;

    -- 1. Đổi trạng thái ca đặt sân thành CHECKED_IN
    UPDATE public.bookings
    SET status = 'CHECKED_IN',
        total_court_fee = p_rental_fee
    WHERE id = p_booking_id AND status IN ('CONFIRMED', 'PENDING');

    -- 2. Tạo Hóa Đơn với tổng tiền = tiền sân dự kiến
    INSERT INTO public.invoices (booking_id, customer_id, total_amount, payment_method, is_paid)
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
