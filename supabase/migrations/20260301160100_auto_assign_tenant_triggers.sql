-- Create a trigger function to auto-assign the tenant_id on INSERT based on the authenticated user's active tenant
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only attempt to set the tenant_id if it hasn't been explicitly provided
    IF NEW.tenant_id IS NULL THEN
        -- Safely attempt to fetch the tenant ID from the authenticated user's mapping in user_roles
        -- LIMIT 1 ensures scalar assignment even if a user technically belongs to multiple tenants in the future
        NEW.tenant_id := (SELECT public.get_user_tenant_ids() LIMIT 1);
    END IF;
    
    -- Returning NEW proceeds with the INSERT. 
    -- If tenant_id is STILL null (e.g. system script or unauthenticated request), 
    -- it will correctly hit the NOT NULL constraint of the business tables and reject the insert securely.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the BEFORE INSERT trigger to all relevant business tables
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY['products', 'customers', 'courts', 'bookings', 'invoices', 'invoice_items'])
    LOOP
        -- First verify if a trigger with this name exists, if not, create it dynamically
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_auto_set_tenant_id ON public.%I;
            CREATE TRIGGER trigger_auto_set_tenant_id
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_set_tenant_id();
        ', t_name, t_name);
    END LOOP;
END $$;
