-- Migration: Create recurring bookings transaction function (RPC)

CREATE OR REPLACE FUNCTION public.create_recurring_bookings(
    p_tenant_id uuid,
    p_customer_id uuid,
    p_court_id uuid,
    p_days_of_week integer[],
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_start_date date,
    p_end_date date,
    p_bookings jsonb,
    p_overwrite_ids uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS uuid AS $$
DECLARE
    v_rule_id uuid;
    v_booking jsonb;
BEGIN
    -- 1. Cancel overwritten bookings (if any)
    IF p_overwrite_ids IS NOT NULL AND cardinality(p_overwrite_ids) > 0 THEN
        UPDATE public.bookings 
        SET status = 'CANCELLED' 
        WHERE id = ANY(p_overwrite_ids) AND tenant_id = p_tenant_id;
    END IF;

    -- 2. Insert the recurring rule
    INSERT INTO public.recurring_rules (
        tenant_id, customer_id, court_id, days_of_week, start_time, end_time, start_date, end_date
    ) VALUES (
        p_tenant_id, p_customer_id, p_court_id, p_days_of_week, p_start_time, p_end_time, p_start_date, p_end_date
    ) RETURNING id INTO v_rule_id;

    -- 3. Insert individual bookings
    IF p_bookings IS NOT NULL AND jsonb_typeof(p_bookings) = 'array' THEN
        FOR v_booking IN SELECT * FROM jsonb_array_elements(p_bookings)
        LOOP
            INSERT INTO public.bookings (
                tenant_id, customer_id, court_id, recurring_rule_id, start_time, end_time, status
            ) VALUES (
                p_tenant_id, p_customer_id, p_court_id, v_rule_id, 
                (v_booking->>'start_time')::timestamp with time zone, 
                (v_booking->>'end_time')::timestamp with time zone, 
                'CONFIRMED'
            );
        END LOOP;
    END IF;

    RETURN v_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
