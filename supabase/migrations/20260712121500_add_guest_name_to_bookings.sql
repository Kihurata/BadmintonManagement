-- Add guest_name column to bookings table to store custom names for guest customers
ALTER TABLE public.bookings ADD COLUMN guest_name TEXT;
