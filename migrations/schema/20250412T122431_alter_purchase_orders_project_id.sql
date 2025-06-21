-- Migrated from: alter_purchase_orders_project_id.sql (root directory)
-- Created: 2025-04-12T12:24:31.698Z

-- Alter purchase_orders table to change project_id from UUID to TEXT
ALTER TABLE public.purchase_orders ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT;
