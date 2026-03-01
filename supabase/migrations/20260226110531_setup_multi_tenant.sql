-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create user_roles table to link auth.users to tenants
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STAFF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tenant_id)
);

-- 3. Add tenant_id to existing tables and assign default tenant
-- 3.1 Insert a default tenant for existing data
INSERT INTO public.tenants (id, name, address) 
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Sân Horizon Badminton', 'Default Address')
ON CONFLICT DO NOTHING;

-- 3.2 Add tenant_id column temporarily allowing NULL
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY['products', 'customers', 'courts', 'bookings', 'invoices', 'invoice_items'])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;', t_name);
        -- 3.3 Update existing records to the default tenant
        EXECUTE format('UPDATE public.%I SET tenant_id = %L::uuid WHERE tenant_id IS NULL;', t_name, '00000000-0000-0000-0000-000000000000');
        -- 3.4 Now we can safely enforce NOT NULL constraint
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL;', t_name);
    END LOOP;
END $$;

-- 3.5 Assign existing users to the default tenant
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT id, '00000000-0000-0000-0000-000000000000'::uuid, 'OWNER'
FROM auth.users
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 3.6 Create a default admin user explicitly for the existing default data
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@horizonbadminton.com',
    extensions.crypt('***REMOVED***', extensions.gen_salt('bf')),
    current_timestamp,
    '{"provider":"email","providers":["email"]}',
    '{}',
    current_timestamp,
    current_timestamp,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Create the identity mapping so Supabase GoTrue doesn't crash on login
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001', 'admin@horizonbadminton.com')::jsonb,
    'email',
    current_timestamp,
    current_timestamp,
    current_timestamp
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Assign the explicit admin user to the default tenant
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'OWNER')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Helper function to get current user's tenant_id(s)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids() 
RETURNS SETOF UUID AS $$
    -- Explicitly bypass RLS locally for this checking function since it is SECURITY DEFINER
    -- We select directly from public.user_roles where user_id matches the jwt claim
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Tenants table policies
CREATE POLICY "Users can view their own tenants" ON public.tenants
    FOR SELECT USING (id IN (SELECT get_user_tenant_ids()));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Generic policy generator for business tables
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY['products', 'customers', 'courts', 'bookings', 'invoices', 'invoice_items'])
    LOOP
        -- SELECT Policy
        EXECUTE format('
            CREATE POLICY "Users can view %I of their tenant" ON public.%I FOR SELECT 
            USING (tenant_id IN (SELECT get_user_tenant_ids()));
        ', t_name, t_name);
        
        -- INSERT Policy
        EXECUTE format('
            CREATE POLICY "Users can insert %I to their tenant" ON public.%I FOR INSERT 
            WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
        ', t_name, t_name);
        
        -- UPDATE Policy
        EXECUTE format('
            CREATE POLICY "Users can update %I in their tenant" ON public.%I FOR UPDATE 
            USING (tenant_id IN (SELECT get_user_tenant_ids()))
            WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));
        ', t_name, t_name);
        
        -- DELETE Policy
        EXECUTE format('
            CREATE POLICY "Users can delete %I from their tenant" ON public.%I FOR DELETE 
            USING (tenant_id IN (SELECT get_user_tenant_ids()));
        ', t_name, t_name);
    END LOOP;
END $$;
