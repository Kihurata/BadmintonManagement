-- Migration: Update recurring_rules to support multiple days of the week

-- 1. Add days_of_week integer[] allowing NULL initially
ALTER TABLE public.recurring_rules ADD COLUMN IF NOT EXISTS days_of_week integer[];

-- 2. Populate days_of_week using the existing day_of_week
UPDATE public.recurring_rules SET days_of_week = ARRAY[day_of_week] WHERE day_of_week IS NOT NULL AND days_of_week IS NULL;

-- 3. Drop the old day_of_week column
ALTER TABLE public.recurring_rules DROP COLUMN IF EXISTS day_of_week;

-- 4. Alter column days_of_week to be NOT NULL
ALTER TABLE public.recurring_rules ALTER COLUMN days_of_week SET NOT NULL;

-- 5. Drop constraint if exists to ensure idempotency
ALTER TABLE public.recurring_rules DROP CONSTRAINT IF EXISTS recurring_rules_days_of_week_check;

-- 6. Add new check constraint for the days_of_week array
ALTER TABLE public.recurring_rules ADD CONSTRAINT recurring_rules_days_of_week_check CHECK (cardinality(days_of_week) > 0 AND days_of_week <@ ARRAY[0,1,2,3,4,5,6]);
