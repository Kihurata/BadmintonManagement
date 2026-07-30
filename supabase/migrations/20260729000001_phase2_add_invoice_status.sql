-- Migration: Phase 2 - Add status column to invoices and backfill initial statuses
-- Purpose: Add status column of type invoice_status ENUM to public.invoices,
--          create index for status queries, and backfill historical invoice statuses.

-- 1. Add status column to public.invoices
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS status invoice_status NOT NULL DEFAULT 'UNPAID';

-- 2. Create index on status for fast filtering
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON public.invoices (tenant_id, status);

-- 3. Backfill invoice statuses from existing data
-- 3.1 Invoices marked as paid or paid_amount >= total_amount
UPDATE public.invoices
SET status = 'PAID'
WHERE is_paid = TRUE OR paid_amount >= total_amount;

-- 3.2 Invoices partially paid
UPDATE public.invoices
SET status = 'PARTIALLY_PAID'
WHERE (is_paid = FALSE OR is_paid IS NULL)
  AND paid_amount > 0 
  AND paid_amount < total_amount;

-- 3.3 Remaining unpaid invoices
UPDATE public.invoices
SET status = 'UNPAID'
WHERE (is_paid = FALSE OR is_paid IS NULL)
  AND (paid_amount IS NULL OR paid_amount = 0);
