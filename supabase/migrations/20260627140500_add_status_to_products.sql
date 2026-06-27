-- Add status column to products table to support soft deactivation
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));
