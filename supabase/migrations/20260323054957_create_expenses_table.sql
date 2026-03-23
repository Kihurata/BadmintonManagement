-- Migration: Create expense_type ENUM and expenses table
-- Purpose: Track fixed (điện, nước, wifi, mặt bằng) and variable (đá, trà, ...) business costs

-- 1. Enum for expense categories
CREATE TYPE expense_type AS ENUM ('FIXED', 'VARIABLE');

-- 2. Expenses table for operational costs (OPEX)
--    Note: Inventory restock costs (COGS) remain tracked in inventory_logs table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,                                    -- Ví dụ: "Tiền điện tháng 3", "Mua đá"
    type expense_type NOT NULL,                             -- FIXED (cố định) hoặc VARIABLE (biến động)
    amount DECIMAL NOT NULL CHECK (amount > 0),             -- Số tiền đã chi (VNĐ), phải dương
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,        -- Ngày phát sinh chi phí
    note TEXT,                                              -- Ghi chú thêm (Optional)
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index for fast filtering by period in reports/dashboard
CREATE INDEX idx_expenses_date ON public.expenses (tenant_id, expense_date DESC);

-- 4. Auto-assign tenant_id via the existing trigger function
CREATE TRIGGER trigger_auto_set_tenant_id
    BEFORE INSERT ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_tenant_id();

-- 5. Enable Row Level Security (consistent with multi-tenant setup)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses of their tenant" ON public.expenses
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert expenses to their tenant" ON public.expenses
    FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update expenses in their tenant" ON public.expenses
    FOR UPDATE
    USING (tenant_id IN (SELECT get_user_tenant_ids()))
    WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete expenses from their tenant" ON public.expenses
    FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));
