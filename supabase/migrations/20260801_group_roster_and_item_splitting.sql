-- Migration: Group Roster & Bill Splitting (2-Table Model with Summary View)

-- 1. Create Enum for item allocation
DO $$ BEGIN
    CREATE TYPE item_allocation_type AS ENUM ('SHARED', 'INDIVIDUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Host Group Members Table
CREATE TABLE IF NOT EXISTS public.host_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    host_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    zalo TEXT,
    facebook TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.host_group_members OWNER TO postgres;

-- 3. Invoice Split Attendance Table
CREATE TABLE IF NOT EXISTS public.invoice_split_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES public.host_group_members(id) ON DELETE RESTRICT,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    payment_method public.payment_method,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_invoice_member UNIQUE(invoice_id, group_member_id)
);

ALTER TABLE public.invoice_split_attendance OWNER TO postgres;

-- 4. Alter invoice_items table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoice_items' AND column_name='allocation_type'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN allocation_type item_allocation_type;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='invoice_items' AND column_name='assigned_member_id'
    ) THEN
        ALTER TABLE public.invoice_items 
        ADD COLUMN assigned_member_id UUID REFERENCES public.host_group_members(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name='invoice_items_allocation_check'
    ) THEN
        ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_allocation_check CHECK (
            (allocation_type IS DISTINCT FROM 'INDIVIDUAL' AND assigned_member_id IS NULL)
            OR (allocation_type = 'INDIVIDUAL' AND assigned_member_id IS NOT NULL)
        );
    END IF;
END $$;

-- 5. Dynamic Invoice Split Summary View
CREATE OR REPLACE VIEW public.invoice_split_summary AS
SELECT
  a.id AS attendance_id,
  a.tenant_id,
  a.invoice_id,
  a.group_member_id,
  m.name AS member_name,
  m.phone AS member_phone,
  m.zalo AS member_zalo,
  m.facebook AS member_facebook,
  a.is_paid,
  a.paid_at,
  a.payment_method,
  COALESCE(ROUND((COALESCE(b.total_court_fee, 0) + COALESCE(shared.total, 0)) / NULLIF(att.attendee_count, 0), 2), 0) AS shared_share,
  COALESCE(ROUND(ind.total, 2), 0) AS individual_total,
  COALESCE(ROUND((COALESCE(b.total_court_fee, 0) + COALESCE(shared.total, 0)) / NULLIF(att.attendee_count, 0) + COALESCE(ind.total, 0), 2), 0) AS total_due
FROM public.invoice_split_attendance a
JOIN public.host_group_members m ON m.id = a.group_member_id
JOIN public.invoices i ON i.id = a.invoice_id
LEFT JOIN public.bookings b ON b.id = i.booking_id
JOIN (
  SELECT invoice_id, COUNT(*) AS attendee_count 
  FROM public.invoice_split_attendance 
  GROUP BY invoice_id
) att ON att.invoice_id = a.invoice_id
LEFT JOIN (
  SELECT invoice_id, SUM(sale_price * quantity) AS total 
  FROM public.invoice_items 
  WHERE allocation_type = 'SHARED' 
  GROUP BY invoice_id
) shared ON shared.invoice_id = a.invoice_id
LEFT JOIN (
  SELECT invoice_id, assigned_member_id, SUM(sale_price * quantity) AS total 
  FROM public.invoice_items 
  WHERE allocation_type = 'INDIVIDUAL' 
  GROUP BY invoice_id, assigned_member_id
) ind ON ind.invoice_id = a.invoice_id AND ind.assigned_member_id = a.group_member_id;

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_host_group_members_tenant_host ON public.host_group_members(tenant_id, host_customer_id);
CREATE INDEX IF NOT EXISTS idx_split_attendance_tenant_invoice ON public.invoice_split_attendance(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_assigned_member ON public.invoice_items(assigned_member_id);
