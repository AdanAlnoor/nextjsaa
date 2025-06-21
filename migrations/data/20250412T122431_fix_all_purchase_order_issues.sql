-- Migrated from: fix_all_purchase_order_issues.sql (root directory)
-- Created: 2025-04-12T12:24:31.702Z

-- COMPREHENSIVE FIX FOR PURCHASE ORDERS
-- This script addresses all potential issues that might prevent purchase orders from appearing

-- PART 1: DIAGNOSE CURRENT STATE
-- Check if purchase_orders table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'purchase_orders'
) AS purchase_orders_table_exists;

-- Check column names in purchase_orders table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- Check if there's a vendor/supplier column mismatch
SELECT 
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'vendor'
  ) AS has_vendor_column,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) AS has_supplier_column;

-- Check current RLS status
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'purchase_orders';

-- Check existing RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'purchase_orders';

-- Count existing purchase orders
SELECT COUNT(*) AS purchase_order_count FROM public.purchase_orders;

-- PART 2: FIX COLUMN NAMES AND ADD MISSING COLUMNS
-- Fix vendor/supplier column mismatch
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'vendor'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) THEN
    ALTER TABLE public.purchase_orders RENAME COLUMN vendor TO supplier;
    RAISE NOTICE 'Renamed vendor column to supplier';
  ELSE
    RAISE NOTICE 'No column rename needed';
  END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add approval_date if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'approval_date'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added approval_date column';
  END IF;
  
  -- Add approval_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN approval_notes TEXT;
    RAISE NOTICE 'Added approval_notes column';
  END IF;
  
  -- Add rejection_reason if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE 'Added rejection_reason column';
  END IF;
  
  -- Add rejection_date if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'rejection_date'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN rejection_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added rejection_date column';
  END IF;
  
  -- Add approval_deadline if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'approval_deadline'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN approval_deadline TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added approval_deadline column';
  END IF;
  
  -- Add delivery_deadline if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'delivery_deadline'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN delivery_deadline TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added delivery_deadline column';
  END IF;
END $$;

-- Add a comment to the supplier column
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) THEN
    COMMENT ON COLUMN public.purchase_orders.supplier IS 'The supplier or subcontractor for this purchase order';
    RAISE NOTICE 'Added comment to supplier column';
  END IF;
END $$;

-- PART 3: FIX ROW LEVEL SECURITY
-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can delete their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to insert purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to delete purchase orders" ON public.purchase_orders;

-- Temporarily disable RLS to allow all operations
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items DISABLE ROW LEVEL SECURITY;

-- Create new permissive policies
CREATE POLICY "Allow all users to view purchase orders"
  ON public.purchase_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all users to insert purchase orders"
  ON public.purchase_orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all users to update purchase orders"
  ON public.purchase_orders
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow all users to delete purchase orders"
  ON public.purchase_orders
  FOR DELETE
  USING (true);

-- Create policies for purchase order items
DROP POLICY IF EXISTS "Users can view items of their purchase orders" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can insert items to their purchase orders" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can update items of their purchase orders" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can delete items of their purchase orders" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to view purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to insert purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to update purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to delete purchase order items" ON public.purchase_order_items;

CREATE POLICY "Allow all users to view purchase order items"
  ON public.purchase_order_items
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all users to insert purchase order items"
  ON public.purchase_order_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all users to update purchase order items"
  ON public.purchase_order_items
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow all users to delete purchase order items"
  ON public.purchase_order_items
  FOR DELETE
  USING (true);

-- Re-enable RLS with the new permissive policies
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- PART 4: CREATE BACKWARD COMPATIBILITY VIEW
-- Create a view for backward compatibility
DROP VIEW IF EXISTS public.purchase_orders_with_vendor;

-- Create a dynamic SQL to build the view based on existing columns
DO $$
DECLARE
  view_sql TEXT;
BEGIN
  view_sql := 'CREATE OR REPLACE VIEW public.purchase_orders_with_vendor AS SELECT id, name, po_number, supplier AS vendor';
  
  -- Add other columns if they exist
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'description') THEN
    view_sql := view_sql || ', description';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'approval_deadline') THEN
    view_sql := view_sql || ', approval_deadline';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'delivery_deadline') THEN
    view_sql := view_sql || ', delivery_deadline';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'total') THEN
    view_sql := view_sql || ', total';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'status') THEN
    view_sql := view_sql || ', status';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'project_id') THEN
    view_sql := view_sql || ', project_id';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'created_by') THEN
    view_sql := view_sql || ', created_by';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'created_at') THEN
    view_sql := view_sql || ', created_at';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'updated_at') THEN
    view_sql := view_sql || ', updated_at';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'approval_date') THEN
    view_sql := view_sql || ', approval_date';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'approval_notes') THEN
    view_sql := view_sql || ', approval_notes';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'rejection_reason') THEN
    view_sql := view_sql || ', rejection_reason';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'rejection_date') THEN
    view_sql := view_sql || ', rejection_date';
  END IF;
  
  -- Complete the view SQL
  view_sql := view_sql || ' FROM public.purchase_orders';
  
  -- Execute the dynamic SQL
  EXECUTE view_sql;
  RAISE NOTICE 'Created view with SQL: %', view_sql;
END $$;

-- Grant permissions on the view
GRANT SELECT ON public.purchase_orders_with_vendor TO authenticated;
GRANT SELECT ON public.purchase_orders_with_vendor TO service_role;

-- PART 5: GRANT PERMISSIONS
-- Grant permissions to authenticated users and service role
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

-- PART 6: INSERT TEST DATA IF NEEDED
-- Insert a test purchase order if none exist
DO $$
DECLARE
  po_count integer;
BEGIN
  SELECT COUNT(*) INTO po_count FROM public.purchase_orders;
  
  IF po_count = 0 THEN
    INSERT INTO public.purchase_orders (
      name, 
      po_number, 
      supplier, 
      description, 
      total, 
      status, 
      created_at, 
      updated_at
    ) VALUES (
      'Comprehensive Fix Test PO', 
      'FIX-TEST-001', 
      'Fix Test Supplier', 
      'This is a test purchase order created after comprehensive fixes', 
      2500.00, 
      'Draft', 
      NOW(), 
      NOW()
    );
    
    RAISE NOTICE 'Created a test purchase order';
  ELSE
    RAISE NOTICE 'Purchase orders already exist, no test order created';
  END IF;
END $$;

-- PART 7: VERIFY FIXES
-- Check column names after fixes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_orders'
AND column_name = 'supplier';

-- Check RLS policies after fixes
SELECT * FROM pg_policies 
WHERE tablename = 'purchase_orders' OR tablename = 'purchase_order_items';

-- Count purchase orders after fixes
SELECT COUNT(*) AS purchase_order_count FROM public.purchase_orders;

-- Show sample purchase orders
SELECT id, name, po_number, supplier, status, total, created_at 
FROM public.purchase_orders 
LIMIT 5;

-- Verify the view works
SELECT id, name, po_number, vendor, status
FROM public.purchase_orders_with_vendor
LIMIT 5; 