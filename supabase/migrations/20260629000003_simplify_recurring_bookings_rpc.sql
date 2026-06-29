-- Migration: Simplify create_recurring_bookings RPC by removing overwrite parameter and logic

DROP FUNCTION IF EXISTS public.create_recurring_bookings(uuid, uuid, uuid, integer[], time without time zone, time without time zone, date, date, jsonb, uuid[]);

CREATE OR REPLACE FUNCTION public.create_recurring_bookings(
    p_tenant_id uuid,
    p_customer_id uuid,
    p_court_id uuid,
    p_days_of_week integer[],
    p_start_time time without time zone,
    p_end_time time without time zone,
    p_start_date date,
    p_end_date date,
    p_bookings jsonb
) RETURNS uuid AS $$
DECLARE
    v_rule_id uuid;
    v_booking jsonb;
BEGIN
    -- 1. Insert the recurring rule
    INSERT INTO public.recurring_rules (
        tenant_id, customer_id, court_id, days_of_week, start_time, end_time, start_date, end_date
    ) VALUES (
        p_tenant_id, p_customer_id, p_court_id, p_days_of_week, p_start_time, p_end_time, p_start_date, p_end_date
    ) RETURNING id INTO v_rule_id;

    -- 2. Insert individual bookings
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
