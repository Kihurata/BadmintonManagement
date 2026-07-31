-- Seed Script for BadmintonManagement (Unified Seed Data - Updated for New Ledger Schema)
-- Master Data: Tenants, Customers, Courts, Products
-- Operational Data: Recurring Rules, Bookings, Invoices, Invoice Items, Expenses, Inventory Logs, Transactions Ledger

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

-- 1.1 Seed Local Authentication Users (auth.users & auth.identities)
-- Owner Account: admin@test.com / password123
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@test.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Owner"}'::jsonb,
    FALSE, NOW(), NOW(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@test.com"}'::jsonb,
    'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Staff Account: staff@test.com / password123
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'staff@test.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Staff Member"}'::jsonb,
    FALSE, NOW(), NOW(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"staff@test.com"}'::jsonb,
    'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 1.2 Seed User Roles (public.user_roles)
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'OWNER'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'STAFF')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 2. Master Data: Customers
INSERT INTO public.customers (id, tenant_id, name, phone, type, points, created_at)
VALUES 
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'Nguyễn Văn A (Khách Cố Định)', '0909999999', 'LOYAL', 200, '2026-06-01 00:00:00+07'),
  ('88888888-8888-8888-8888-888888888881', '00000000-0000-0000-0000-000000000000', 'Khách hàng Test 1', '0901234567', 'LOYAL', 150, NOW()),
  ('88888888-8888-8888-8888-888888888882', '00000000-0000-0000-0000-000000000000', 'Khách hàng Test 2', '0987654321', 'GUEST', 0, NOW()),
  ('88888888-8888-8888-8888-888888888883', '00000000-0000-0000-0000-000000000000', 'Nguyễn Văn Khách', '0912345678', 'LOYAL', 50, NOW())
ON CONFLICT (phone) DO NOTHING;

-- 3. Master Data: Courts (Sân 1 & Sân 2)
INSERT INTO public.courts (id, tenant_id, court_name, morning_price_loyal, evening_price_loyal, morning_price_guest, evening_price_guest, is_active)
VALUES 
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'Sân 1', 50000, 70000, 60000, 80000, TRUE),
  ('99999999-9999-9999-9999-999999999998', '00000000-0000-0000-0000-000000000000', 'Sân 2', 50000, 70000, 60000, 80000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Master Data: Products (Lavie, Yonex Aerosensa, Victor Lark 5, Vissan, Cool Air)
INSERT INTO public.products (id, tenant_id, product_name, base_unit, unit_price, stock_quantity, is_packable, units_per_pack, pack_price, pack_unit)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'Nước khoáng Lavie 500ml', 'Chai', 10000, 100, false, 1, 10000, 'Chai'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'Cầu lông Yonex Aerosensa', 'Quả', 40000, 100, true, 12, 450000, 'Ống'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'Cầu lông Victor Lark 5', 'Quả', 35000, 150, true, 12, 400000, 'Ống'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'Xúc xích Vissan', 'Chiếc', 15000, 30, false, 1, 15000, 'Chiếc'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', 'Keo cao su Cool Air', 'Vỉ', 5000, 100, false, 1, 5000, 'Vỉ')
ON CONFLICT (id) DO NOTHING;

-- 5. Mock Recurring Booking Rules for July 2026 (Mon/Wed/Fri, 18:00 - 20:00)
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

-- 6. Mock Unpaid Bookings in July 2026
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

-- 7. Mock Invoices & Invoice Items (New Schema: status, paid_amount)
-- Invoice #1: Unpaid Booking (July 6) + POS Items (2 Lavie + 1 Yonex Aerosensa = 140k + 20k + 40k = 200,000 VNĐ)
INSERT INTO public.invoices (id, tenant_id, booking_id, customer_id, total_amount, paid_amount, is_paid, status, payment_method, created_at)
VALUES (
    '10000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'b0000001-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888',
    200000,
    0,
    FALSE,
    'UNPAID',
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
    40000,
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- Invoice #2: Unpaid Booking (July 8) + 1 Lavie (140k + 10k = 150,000 VNĐ)
INSERT INTO public.invoices (id, tenant_id, booking_id, customer_id, total_amount, paid_amount, is_paid, status, payment_method, created_at)
VALUES (
    '10000002-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'b0000002-0000-0000-0000-000000000002',
    '88888888-8888-8888-8888-888888888888',
    150000,
    0,
    FALSE,
    'UNPAID',
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
INSERT INTO public.invoices (id, tenant_id, booking_id, customer_id, total_amount, paid_amount, is_paid, status, payment_method, created_at)
VALUES (
    '10000003-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'b0000003-0000-0000-0000-000000000003',
    '88888888-8888-8888-8888-888888888888',
    140000,
    140000,
    TRUE,
    'PAID',
    'BANK_TRANSFER',
    '2026-07-10 20:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- 8. Operational Expenses
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

-- 9. Inventory Restock Logs
INSERT INTO public.inventory_logs (id, tenant_id, product_id, type, quantity, purchase_price, payment_method, reason, created_at)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'RESTOCK',
    50,
    450000,
    'BANK_TRANSFER',
    'Nhập 50 ống cầu Yonex Aerosensa',
    '2026-07-02 10:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- 10. Financial Transactions Ledger (public.transactions)
-- Paid Invoice Transaction
INSERT INTO public.transactions (id, tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, transaction_date)
VALUES (
    '3ea9c0c7-7f8f-435f-84c1-35e1ccde8177',
    '00000000-0000-0000-0000-000000000000',
    'INCOME',
    'INVOICE_PAYMENT',
    140000,
    'BANK_TRANSFER',
    'INVOICE',
    '10000003-0000-0000-0000-000000000003',
    'Thanh toán hóa đơn #10000003',
    '2026-07-10 20:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- Fixed Expense Transaction
INSERT INTO public.transactions (id, tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, note, transaction_date)
VALUES (
    '63edc780-aaf5-4155-bcd3-683c1945a809',
    '00000000-0000-0000-0000-000000000000',
    'EXPENSE',
    'FIXED_EXPENSE',
    500000,
    'CASH',
    'EXPENSE',
    '55555555-5555-5555-5555-555555555555',
    'Tiền điện sân tháng 7',
    'Thanh toán tiền điện sân',
    '2026-07-15 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;

-- Variable Expense Transaction
INSERT INTO public.transactions (id, tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, note, transaction_date)
VALUES (
    'c7d2f099-eeda-441f-97bf-f5f3330a1b6c',
    '00000000-0000-0000-0000-000000000000',
    'EXPENSE',
    'VARIABLE_EXPENSE',
    120000,
    'BANK_TRANSFER',
    'EXPENSE',
    '66666666-6666-6666-6666-666666666666',
    'Nước lau sàn & vệ sinh',
    'Chi phí vệ sinh hàng tuần',
    '2026-07-20 00:00:00+07'
) ON CONFLICT (id) DO NOTHING;
