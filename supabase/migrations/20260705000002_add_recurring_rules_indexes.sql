-- Migration: Add indexes for recurring rules and bookings to optimize RLS and cost calculations

-- 1. Index to optimize listing recurring rules for a tenant ordered by creation time
CREATE INDEX IF NOT EXISTS idx_recurring_rules_tenant_created 
ON public.recurring_rules (tenant_id, created_at DESC);

-- 2. Index to optimize looking up bookings associated with recurring rules (prevents sequential scans on bookings table)
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_rule_id 
ON public.bookings (recurring_rule_id) 
WHERE recurring_rule_id IS NOT NULL;
