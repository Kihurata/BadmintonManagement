-- Migration: Fix sync_invoice_paid_status trigger to support adding items to paid invoices
-- without incorrectly marking them as fully paid.

CREATE OR REPLACE FUNCTION public.sync_invoice_paid_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_paid is transitioned to true, ensure paid_amount matches total_amount
    IF NEW.is_paid = TRUE AND (OLD IS NULL OR OLD.is_paid = FALSE) THEN
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
