-- Migrated from: add_approval_columns.sql (root directory)
-- Created: 2025-04-12T12:24:31.698Z

-- Add approval and rejection columns to purchase_orders table
ALTER TABLE IF EXISTS public.purchase_orders ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.purchase_orders ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE IF EXISTS public.purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE IF EXISTS public.purchase_orders ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP WITH TIME ZONE;

-- Update the status type to include Rejected status (only needed if using an enum)
-- If you're using a text field for status, this is not necessary
-- COMMENT ON COLUMN public.purchase_orders.status IS 'Can be Draft, Pending, Approved, or Rejected';

-- Output the changes
SELECT 
  column_name, 
  data_type
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'purchase_orders'
ORDER BY 
  ordinal_position; 