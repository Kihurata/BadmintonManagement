-- Migration: Fix missing multi-tenant coverage for inventory_logs and recurring_rules

-- 1. Add tenant_id column temporarily allowing NULL
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Backfill existing records with the default tenant
UPDATE public.inventory_logs SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
UPDATE public.recurring_rules SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;

-- 3. Now we can safely enforce NOT NULL constraint
ALTER TABLE public.inventory_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.recurring_rules ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Create trigger to auto-assign tenant_id
DROP TRIGGER IF EXISTS trigger_auto_set_tenant_id ON public.inventory_logs;
CREATE TRIGGER trigger_auto_set_tenant_id
BEFORE INSERT ON public.inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_tenant_id();

DROP TRIGGER IF EXISTS trigger_auto_set_tenant_id ON public.recurring_rules;
CREATE TRIGGER trigger_auto_set_tenant_id
BEFORE INSERT ON public.recurring_rules
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_tenant_id();

-- 5. Enable RLS
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for inventory_logs
CREATE POLICY "Users can view inventory_logs of their tenant" ON public.inventory_logs FOR SELECT 
USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert inventory_logs to their tenant" ON public.inventory_logs FOR INSERT 
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update inventory_logs in their tenant" ON public.inventory_logs FOR UPDATE 
USING (tenant_id IN (SELECT get_user_tenant_ids()))
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete inventory_logs from their tenant" ON public.inventory_logs FOR DELETE 
USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- 7. Create RLS Policies for recurring_rules
CREATE POLICY "Users can view recurring_rules of their tenant" ON public.recurring_rules FOR SELECT 
USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can insert recurring_rules to their tenant" ON public.recurring_rules FOR INSERT 
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can update recurring_rules in their tenant" ON public.recurring_rules FOR UPDATE 
USING (tenant_id IN (SELECT get_user_tenant_ids()))
WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Users can delete recurring_rules from their tenant" ON public.recurring_rules FOR DELETE 
USING (tenant_id IN (SELECT get_user_tenant_ids()));
