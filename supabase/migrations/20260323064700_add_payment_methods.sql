-- Migration: Add payment_method to expenses and inventory_logs
-- Purpose: Track which "wallet" (cash or bank) was used for each cost,
--          enabling accurate treasury balance calculation.

-- 1. Add payment_method to expenses (Chi phí vận hành)
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS payment_method payment_method NOT NULL DEFAULT 'CASH';

-- 2. Add payment_method to inventory_logs (Nhập hàng)
--    Only meaningful for type = 'RESTOCK'. Other types don't involve cash outflow.
ALTER TABLE public.inventory_logs
    ADD COLUMN IF NOT EXISTS payment_method payment_method NOT NULL DEFAULT 'CASH';
