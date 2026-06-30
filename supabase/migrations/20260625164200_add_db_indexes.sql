-- 1. Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Drop existing indexes that will be replaced by composite tenant indexes
DROP INDEX IF EXISTS idx_bookings_time;
DROP INDEX IF EXISTS idx_invoices_created_at;

-- 3. Composite multi-tenant indexes for RLS performance optimization
CREATE INDEX idx_bookings_tenant_time ON public.bookings (tenant_id, court_id, start_time, end_time);
CREATE INDEX idx_invoices_tenant_created ON public.invoices (tenant_id, created_at DESC);
CREATE INDEX idx_products_tenant ON public.products (tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers (tenant_id);

-- 4. Foreign key indexes to optimize JOIN and lookup queries
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_product_id ON public.invoice_items (product_id);
CREATE INDEX idx_bookings_customer_id ON public.bookings (customer_id);
CREATE INDEX idx_invoices_booking_id ON public.invoices (booking_id);

-- 5. Partial index for fast debt tracking (unpaid invoices lookup)
CREATE INDEX idx_invoices_unpaid_debt ON public.invoices (tenant_id, customer_id) 
WHERE is_paid = FALSE;

-- 6. Trigram GIN index for case-insensitive product search
CREATE INDEX idx_products_name_trgm ON public.products USING gin (product_name gin_trgm_ops);
