-- Migration: Phase 3 - Financial Ledger Triggers & Auto-Syncing
-- Purpose: Implement triggers to sync transactions -> invoices (paid_amount & status),
--          transactions -> tenant_balances (cash & bank balances), and
--          inventory_logs (RESTOCK) -> transactions.

-- 1. Function & Trigger: Sync Transactions to Invoices
CREATE OR REPLACE FUNCTION public.sync_invoice_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_paid NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_ref_type TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_ref_type := OLD.reference_type;
        v_invoice_id := OLD.reference_id;
    ELSE
        v_ref_type := NEW.reference_type;
        v_invoice_id := NEW.reference_id;
    END IF;

    IF v_ref_type IS DISTINCT FROM 'INVOICE' OR v_invoice_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate total paid for this invoice from transactions
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.transactions
    WHERE reference_type = 'INVOICE' 
      AND reference_id = v_invoice_id 
      AND type = 'INCOME';

    -- Fetch invoice total_amount
    SELECT total_amount INTO v_total_amount 
    FROM public.invoices 
    WHERE id = v_invoice_id;

    IF v_total_amount IS NOT NULL THEN
        UPDATE public.invoices
        SET paid_amount = v_total_paid,
            status = CASE
                WHEN v_total_paid >= v_total_amount THEN 'PAID'::invoice_status
                WHEN v_total_paid > 0 THEN 'PARTIALLY_PAID'::invoice_status
                ELSE 'UNPAID'::invoice_status
            END
        WHERE id = v_invoice_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_from_transaction ON public.transactions;
CREATE TRIGGER trg_sync_invoice_from_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_from_transaction();


-- 2. Function & Trigger: Sync Transactions to Tenant Balances (Cash & Bank)
CREATE OR REPLACE FUNCTION public.sync_tenant_balances()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'INCOME' THEN
            IF NEW.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance + NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance + NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            END IF;
        ELSIF NEW.type = 'EXPENSE' THEN
            IF NEW.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance - NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance - NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            END IF;
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.type = 'INCOME' THEN
            IF OLD.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance - OLD.amount, updated_at = NOW() WHERE tenant_id = OLD.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance - OLD.amount, updated_at = NOW() WHERE tenant_id = OLD.tenant_id;
            END IF;
        ELSIF OLD.type = 'EXPENSE' THEN
            IF OLD.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance + OLD.amount, updated_at = NOW() WHERE tenant_id = OLD.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance + OLD.amount, updated_at = NOW() WHERE tenant_id = OLD.tenant_id;
            END IF;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revert OLD impact
        IF OLD.type = 'INCOME' THEN
            IF OLD.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance - OLD.amount WHERE tenant_id = OLD.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance - OLD.amount WHERE tenant_id = OLD.tenant_id;
            END IF;
        ELSIF OLD.type = 'EXPENSE' THEN
            IF OLD.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
            END IF;
        END IF;

        -- Apply NEW impact
        IF NEW.type = 'INCOME' THEN
            IF NEW.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance + NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance + NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            END IF;
        ELSIF NEW.type = 'EXPENSE' THEN
            IF NEW.payment_method = 'CASH' THEN
                UPDATE public.tenant_balances SET cash_balance = cash_balance - NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            ELSE
                UPDATE public.tenant_balances SET bank_balance = bank_balance - NEW.amount, updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_tenant_balances ON public.transactions;
CREATE TRIGGER trg_sync_tenant_balances
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_balances();


-- 3. Function & Trigger: Sync Inventory Restocks to Transactions
CREATE OR REPLACE FUNCTION public.sync_restock_to_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'RESTOCK' AND NEW.purchase_price IS NOT NULL AND NEW.purchase_price > 0 THEN
            INSERT INTO public.transactions (
                tenant_id, type, category, amount, payment_method, reference_type, reference_id, description, transaction_date
            ) VALUES (
                NEW.tenant_id,
                'EXPENSE'::transaction_type,
                'INVENTORY_RESTOCK'::transaction_category,
                NEW.purchase_price,
                COALESCE(NEW.payment_method, 'CASH'),
                'INVENTORY_LOG',
                NEW.id,
                COALESCE(NEW.reason, 'Nhập hàng'),
                NEW.created_at
            ) ON CONFLICT DO NOTHING;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.type = 'RESTOCK' AND NEW.purchase_price IS NOT NULL AND NEW.purchase_price > 0 THEN
            UPDATE public.transactions
            SET amount = NEW.purchase_price,
                payment_method = COALESCE(NEW.payment_method, 'CASH'),
                description = COALESCE(NEW.reason, 'Nhập hàng')
            WHERE reference_type = 'INVENTORY_LOG' AND reference_id = NEW.id;
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.type = 'RESTOCK' THEN
            DELETE FROM public.transactions
            WHERE reference_type = 'INVENTORY_LOG' AND reference_id = OLD.id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restock_to_transaction ON public.inventory_logs;
CREATE TRIGGER trg_restock_to_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_restock_to_transaction();

-- 4. Deployment Safety Catch & Auto-Reconciliation for Production
-- Backfills any un-synced restocks that existed before trigger creation
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
    COALESCE(reason, 'Nhập hàng'),
    created_at
FROM public.inventory_logs
WHERE type = 'RESTOCK' AND purchase_price > 0
ON CONFLICT DO NOTHING;

-- Re-sync tenant_balances to ensure 100% exact values upon deployment
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
