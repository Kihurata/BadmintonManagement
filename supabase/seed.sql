-- 1. Tenant Record
INSERT INTO public.tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Sân Horizon Badminton')
ON CONFLICT (id) DO NOTHING;

-- 2. Local Auth Users (auth.users & auth.identities)
-- Explicitly pass empty strings '' for token fields to prevent GoTrue 500 scanner errors
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

-- 3. Assign User Roles
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'OWNER')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 4. Sample Customers
INSERT INTO public.customers (name, phone, type, points, tenant_id)
VALUES 
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'Nguyễn Văn A (Khách Cố Định)', '0909999999', 'LOYAL', 200, '2026-06-01 00:00:00+07'),
  ('88888888-8888-8888-8888-888888888881', '00000000-0000-0000-0000-000000000000', 'Khách hàng Test 1', '0901234567', 'LOYAL', 150, NOW()),
  ('88888888-8888-8888-8888-888888888882', '00000000-0000-0000-0000-000000000000', 'Khách hàng Test 2', '0987654321', 'GUEST', 0, NOW()),
  ('88888888-8888-8888-8888-888888888883', '00000000-0000-0000-0000-000000000000', 'Nguyễn Văn Khách', '0912345678', 'LOYAL', 50, NOW())
ON CONFLICT (phone) DO NOTHING;

-- 5. Courts
INSERT INTO public.courts (court_name, tenant_id)
SELECT 'Sân 1', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.courts WHERE court_name = 'Sân 1');

INSERT INTO public.courts (court_name, tenant_id)
SELECT 'Sân 2', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.courts WHERE court_name = 'Sân 2');

-- 6. Sample Products and Initial Inventory Logs
WITH inserted_products AS (
  INSERT INTO public.products (product_name, base_unit, unit_price, stock_quantity, is_packable, units_per_pack, pack_price, pack_unit, tenant_id)
  VALUES 
    -- Product 1, 2: Packable
    ('Cầu lông Yonex Aerosensa', 'Quả', 40000, 100, true, 12, 450000, 'Ống', '00000000-0000-0000-0000-000000000000'),
    ('Cầu lông Victor Lark 5', 'Quả', 35000, 150, true, 12, 400000, 'Ống', '00000000-0000-0000-0000-000000000000'),
    -- Product 3, 4, 5: Normal (Not packable)
    ('Nước khoáng Lavie 500ml', 'Chai', 10000, 50, false, 1, 10000, 'Chai', '00000000-0000-0000-0000-000000000000'),
    ('Xúc xích Vissan', 'Chiếc', 15000, 30, false, 1, 15000, 'Chiếc', '00000000-0000-0000-0000-000000000000'),
    ('Keo cao su Cool Air', 'Vỉ', 5000, 100, false, 1, 5000, 'Vỉ', '00000000-0000-0000-0000-000000000000')
  RETURNING id, stock_quantity, product_name
)
INSERT INTO public.inventory_logs (product_id, type, quantity, reason, tenant_id)
SELECT id, 'RESTOCK', stock_quantity, 'Nhập kho ban đầu (Seed Data)', '00000000-0000-0000-0000-000000000000'::uuid
FROM inserted_products;
