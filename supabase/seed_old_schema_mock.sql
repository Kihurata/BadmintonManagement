-- Seed Script for Old Schema Edge Cases (Pre-20260729 Migration State)
-- Purpose: Insert historical records into legacy tables to verify backfill logic on `supabase migration up`.

-- 0. Patch fn_auto_sync_inventory trigger function to include tenant_id on inventory_logs insertion
CREATE OR REPLACE FUNCTION public.fn_auto_sync_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    delta_qty INT;
    v_units_per_pack INT;
    v_actual_deduction INT;
BEGIN
    SELECT COALESCE(units_per_pack, 1) INTO v_units_per_pack FROM public.products WHERE id = NEW.product_id;
    IF (TG_OP = 'INSERT') THEN
        delta_qty := NEW.quantity;
    ELSIF (TG_OP = 'UPDATE') THEN
        delta_qty := NEW.quantity - OLD.quantity;
    END IF;

    IF (NEW.is_pack_sold = TRUE) THEN
        v_actual_deduction := delta_qty * v_units_per_pack;
    ELSE
        v_actual_deduction := delta_qty;
    END IF;

    IF v_actual_deduction != 0 THEN
        INSERT INTO inventory_logs (product_id, type, quantity, reason, related_invoice_id, tenant_id)
        VALUES (
            NEW.product_id, 
            'SALE', 
            -v_actual_deduction, 
            CASE WHEN NEW.is_pack_sold THEN 'Bán theo gói/ống' ELSE 'Bán lẻ' END, 
            NEW.invoice_id,
            COALESCE(NEW.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
        );
        UPDATE public.products SET stock_quantity = stock_quantity - v_actual_deduction WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$;

-- 1. Ensure Tenant Record Exists
INSERT INTO public.tenants (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Test Badminton Facility', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Mock Master Data: Customer, Court, Products
INSERT INTO public.customers (id, tenant_id, name, phone, type, created_at)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'Nguyễn Văn A (Khách Cố Định)',
    '0909999999',
    'LOYAL',
    '2026-06-01 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courts (id, tenant_id, court_name, morning_price_loyal, evening_price_loyal, morning_price_guest, evening_price_guest, is_active)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'Sân số 1 (Trung Tâm)',
    50000, 70000, 60000, 80000,
    TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, tenant_id, product_name, base_unit, unit_price, stock_quantity)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'Nước suối Aquafina 500ml',
    'Chai',
    10000,
    100
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, tenant_id, product_name, base_unit, unit_price, stock_quantity)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'Quả cầu lông Yonex AS50',
    'Quả',
    30000,
    50
) ON CONFLICT (id) DO NOTHING;

-- 3. Mock Recurring Booking Rules for July 2026 (Mon/Wed/Fri, 18:00 - 20:00)
INSERT INTO public.recurring_rules (id, tenant_id, customer_id, court_id, days_of_week, start_time, end_time, start_date, end_date, created_at)
VALUES (
    '77777777-0000-0000-0000-777777777777',
    '00000000-0000-0000-0000-000000000000',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    ARRAY[1, 3, 5], -- Monday, Wednesday, Friday
    '18:00:00',
    '20:00:00',
    '2026-07-01',
    '2026-07-31',
    '2026-06-25 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- 4. Mock Unpaid Bookings in July 2026 generated from Recurring Rule
INSERT INTO public.bookings (id, tenant_id, customer_id, court_id, recurring_rule_id, start_time, end_time, total_court_fee, status, created_at)
VALUES (
    'b0000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '77777777-0000-0000-0000-777777777777',
    '2026-07-06 18:00:00+07',
    '2026-07-06 20:00:00+07',
    140000,
    'CONFIRMED',
    '2026-07-01 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookings (id, tenant_id, customer_id, court_id, recurring_rule_id, start_time, end_time, total_court_fee, status, created_at)
VALUES (
    'b0000002-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '77777777-0000-0000-0000-777777777777',
    '2026-07-08 18:00:00+07',
    '2026-07-08 20:00:00+07',
    140000,
    'CONFIRMED',
    '2026-07-01 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookings (id, tenant_id, customer_id, court_id, recurring_rule_id, start_time, end_time, total_court_fee, status, created_at)
VALUES (
    'b0000003-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '77777777-0000-0000-0000-777777777777',
    '2026-07-10 18:00:00+07',
    '2026-07-10 20:00:00+07',
    140000,
    'CONFIRMED',
    '2026-07-01 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- 5. Mock Legacy Invoices with Invoice Items (Invoice Details)
-- Invoice #1: Unpaid Booking (July 6) + POS Items (2 Aquafina + 1 Yonex AS50 = 140k + 20k + 30k = 190,000 VNĐ)
INSERT INTO public.invoices (id, tenant_id, booking_id, customer_id, total_amount, is_paid, payment_method, created_at)
VALUES (
    '10000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'b0000001-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888',
    190000,
    FALSE,
    'CASH',
    '2026-07-06 20:05:00+07'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invoice_items (id, tenant_id, invoice_id, product_id, quantity, sale_price, is_pack_sold)
VALUES (
    '20000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    '10000001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    2,
    10000,
    FALSE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invoice_items (id, tenant_id, invoice_id, product_id, quantity, sale_price, is_pack_sold)
VALUES (
    '20000002-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    '10000001-0000-0000-0000-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    1,
    30000,
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- Invoice #2: Unpaid Booking (July 8) + 1 Aquafina (140k + 10k = 150,000 VNĐ)
INSERT INTO public.invoices (id, tenant_id, booking_id, customer_id, total_amount, is_paid, payment_method, created_at)
VALUES (
    '10000002-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'b0000002-0000-0000-0000-000000000002',
    '88888888-8888-8888-8888-888888888888',
    150000,
    FALSE,
    'CASH',
    '2026-07-08 20:02:00+07'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invoice_items (id, tenant_id, invoice_id, product_id, quantity, sale_price, is_pack_sold)
VALUES (
    '20000003-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    '10000002-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    1,
    10000,
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- Invoice #3: Paid Invoice (July 10) via Bank Transfer (140,000 VNĐ)
INSERT INTO public.invoices (id, tenant_id, booking_id, customer_id, total_amount, is_paid, payment_method, created_at)
VALUES (
    '10000003-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'b0000003-0000-0000-0000-000000000003',
    '88888888-8888-8888-8888-888888888888',
    140000,
    TRUE,
    'BANK_TRANSFER',
    '2026-07-10 20:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- 6. Mock Operational Expenses (Fixed & Variable)
INSERT INTO public.expenses (id, tenant_id, title, amount, type, payment_method, expense_date, note)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'Tiền điện sân tháng 7',
    500000,
    'FIXED',
    'CASH',
    '2026-07-15',
    'Thanh toán tiền điện sân'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.expenses (id, tenant_id, title, amount, type, payment_method, expense_date, note)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'Nước lau sàn & vệ sinh',
    120000,
    'VARIABLE',
    'BANK_TRANSFER',
    '2026-07-20',
    'Chi phí vệ sinh hàng tuần'
) ON CONFLICT (id) DO NOTHING;

-- 7. Mock Inventory Restock Logs
INSERT INTO public.inventory_logs (id, tenant_id, type, quantity, purchase_price, payment_method, reason, created_at)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'RESTOCK',
    50,
    450000,
    'BANK_TRANSFER',
    'Nhập 50 hộp cầu Yonex AS50',
    '2026-07-02 10:00:00+07'
) ON CONFLICT (id) DO NOTHING;
