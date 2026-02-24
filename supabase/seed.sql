-- Insert 3 sample customers
INSERT INTO public.customers (name, phone, type, points)
VALUES 
  ('Khách hàng Test 1', '0901234567', 'LOYAL', 150),
  ('Khách hàng Test 2', '0987654321', 'GUEST', 0),
  ('Nguyễn Văn Khách', '0912345678', 'LOYAL', 50)
ON CONFLICT (phone) DO NOTHING;


INSERT INTO public.courts (court_name)
SELECT 'Sân 1'
WHERE NOT EXISTS (SELECT 1 FROM public.courts WHERE court_name = 'Sân 1');

INSERT INTO public.courts (court_name)
SELECT 'Sân 2'
WHERE NOT EXISTS (SELECT 1 FROM public.courts WHERE court_name = 'Sân 2');

-- Seed 5 sample products and automatically generate initial inventory logs
WITH inserted_products AS (
  INSERT INTO public.products (product_name, base_unit, unit_price, stock_quantity, is_packable, units_per_pack, pack_price, pack_unit)
  VALUES 
    -- Product 1, 2: Packable
    ('Cầu lông Yonex Aerosensa', 'Quả', 40000, 100, true, 12, 450000, 'Ống'),
    ('Cầu lông Victor Lark 5', 'Quả', 35000, 150, true, 12, 400000, 'Ống'),
    -- Product 3, 4, 5: Normal (Not packable)
    ('Nước khoáng Lavie 500ml', 'Chai', 10000, 50, false, 1, 10000, 'Chai'),
    ('Xúc xích Vissan', 'Chiếc', 15000, 30, false, 1, 15000, 'Chiếc'),
    ('Keo cao su Cool Air', 'Vỉ', 5000, 100, false, 1, 5000, 'Vỉ')
  RETURNING id, stock_quantity, product_name
)
-- Create initial RESTOCK logs for these 5 products
INSERT INTO public.inventory_logs (product_id, type, quantity, reason)
SELECT id, 'RESTOCK', stock_quantity, 'Nhập kho ban đầu (Seed Data)'
FROM inserted_products;