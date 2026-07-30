-- Migration: Phase 1 - Financial Transactions Ledger & Tenant Balances
-- Purpose: Create custom ENUMs, public.transactions table, public.tenant_balances table,
--          RLS policies, performance indexes, and execute historical data backfill.

-- 1. Create custom ENUM types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_category') THEN
        CREATE TYPE transaction_category AS ENUM (
            'INVOICE_PAYMENT',
            'FIXED_EXPENSE',
            'VARIABLE_EXPENSE',
            'INVENTORY_RESTOCK'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM (
            'UNPAID',
            'PARTIALLY_PAID',
            'PAID',
            'CANCELLED'
        );
    END IF;
END $$;

-- 2. Create public.transactions table (Single Source of Truth for Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    category transaction_category NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    
    reference_type TEXT CHECK (reference_type IN ('INVOICE', 'EXPENSE', 'INVENTORY_LOG')),
    reference_id UUID,
    
    description TEXT,
    note TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create public.tenant_balances table (Pre-aggregated Treasury Balances)
CREATE TABLE IF NOT EXISTS public.tenant_balances (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    cash_balance NUMERIC NOT NULL DEFAULT 0,
    bank_balance NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON public.transactions (tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON public.transactions (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment ON public.transactions (tenant_id, payment_method, type);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_balances ENABLE ROW LEVEL SECURITY;

-- 5.1 RLS Policies for public.transactions
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can view transactions of their tenant') THEN
        CREATE POLICY "Users can view transactions of their tenant" ON public.transactions
            FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can insert transactions to their tenant') THEN
        CREATE POLICY "Users can insert transactions to their tenant" ON public.transactions
            FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can update transactions in their tenant') THEN
        CREATE POLICY "Users can update transactions in their tenant" ON public.transactions
            FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()))
            WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can delete transactions from their tenant') THEN
        CREATE POLICY "Users can delete transactions from their tenant" ON public.transactions
            FOR DELETE USING (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;
END $$;

-- 5.2 Auto-assign tenant_id trigger for public.transactions
DROP TRIGGER IF EXISTS trigger_auto_set_tenant_id ON public.transactions;
CREATE TRIGGER trigger_auto_set_tenant_id
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_tenant_id();

-- 5.3 RLS Policies for public.tenant_balances
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_balances' AND policyname = 'Users can view balances of their tenant') THEN
        CREATE POLICY "Users can view balances of their tenant" ON public.tenant_balances
            FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_balances' AND policyname = 'Users can insert balances to their tenant') THEN
        CREATE POLICY "Users can insert balances to their tenant" ON public.tenant_balances
            FOR INSERT WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_balances' AND policyname = 'Users can update balances in their tenant') THEN
        CREATE POLICY "Users can update balances in their tenant" ON public.tenant_balances
            FOR UPDATE USING (tenant_id IN (SELECT get_user_tenant_ids()))
            WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
    END IF;
END $$;

-- 6. Historical Data Backfill Script
-- 6.1 Backfill historical paid invoices
INSERT INTO public.transactions (
    tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, transaction_date
)
SELECT 
    tenant_id,
    'INCOME'::transaction_type,
    'INVOICE_PAYMENT'::transaction_category,
    COALESCE(paid_amount, total_amount),
    COALESCE(payment_method, 'CASH'),
    'INVOICE',
    id,
    'Thanh toán hóa đơn (Backfill)',
    created_at
FROM public.invoices
WHERE (is_paid = TRUE OR paid_amount > 0)
ON CONFLICT DO NOTHING;

-- 6.2 Backfill historical expenses
INSERT INTO public.transactions (
    tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, note, transaction_date
)
SELECT 
    tenant_id,
    'EXPENSE'::transaction_type,
    CASE WHEN type = 'FIXED' THEN 'FIXED_EXPENSE'::transaction_category ELSE 'VARIABLE_EXPENSE'::transaction_category END,
    amount,
    COALESCE(payment_method, 'CASH'),
    'EXPENSE',
    id,
    title,
    note,
    expense_date::timestamptz
FROM public.expenses
ON CONFLICT DO NOTHING;

-- 6.3 Backfill historical restocks
INSERT INTO public.transactions (
    tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, transaction_date
)
SELECT 
    tenant_id,
    'EXPENSE'::transaction_type,
    'INVENTORY_RESTOCK'::transaction_category,
    purchase_price,
    COALESCE(payment_method, 'CASH'),
    'INVENTORY_LOG',
    id,
    COALESCE(reason, 'Nhập hàng (Backfill)'),
    created_at
FROM public.inventory_logs
WHERE type = 'RESTOCK' AND purchase_price > 0
ON CONFLICT DO NOTHING;

-- 6.4 Populate initial tenant_balances
INSERT INTO public.tenant_balances (tenant_id, cash_balance, bank_balance, updated_at)
SELECT 
    t.id AS tenant_id,
    COALESCE(SUM(CASE WHEN tx.payment_method = 'CASH' AND tx.type = 'INCOME' THEN tx.amount WHEN tx.payment_method = 'CASH' AND tx.type = 'EXPENSE' THEN -tx.amount ELSE 0 END), 0) AS cash_balance,
    COALESCE(SUM(CASE WHEN tx.payment_method = 'BANK_TRANSFER' AND tx.type = 'INCOME' THEN tx.amount WHEN tx.payment_method = 'BANK_TRANSFER' AND tx.type = 'EXPENSE' THEN -tx.amount ELSE 0 END), 0) AS bank_balance,
    NOW()
FROM public.tenants t
LEFT JOIN public.transactions tx ON tx.tenant_id = t.id
GROUP BY t.id
ON CONFLICT (tenant_id) DO UPDATE 
SET cash_balance = EXCLUDED.cash_balance, bank_balance = EXCLUDED.bank_balance, updated_at = NOW();
