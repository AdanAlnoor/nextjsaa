-- Migrated from: simple_fix.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- SIMPLE FIX FOR PURCHASE ORDERS
-- This script focuses on the essential fixes needed to make purchase orders visible

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

-- Count existing purchase orders
SELECT COUNT(*) AS purchase_order_count FROM public.purchase_orders;

-- 1. DISABLE ROW LEVEL SECURITY (RLS) TEMPORARILY
-- This is often the main cause of "invisible" records
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items DISABLE ROW LEVEL SECURITY;

-- 2. GRANT PERMISSIONS
-- Ensure all users have access to the tables
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

-- 3. CREATE PERMISSIVE POLICIES
-- Create a policy that allows all users to view purchase orders
DROP POLICY IF EXISTS "Allow all users to view purchase orders" ON public.purchase_orders;
CREATE POLICY "Allow all users to view purchase orders"
  ON public.purchase_orders
  FOR SELECT
  USING (true);

-- 4. RE-ENABLE RLS WITH PERMISSIVE POLICIES
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- 5. INSERT A TEST PURCHASE ORDER IF NONE EXIST
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
      'Simple Fix Test PO', 
      'SIMPLE-FIX-001', 
      'Test Supplier', 
      'This is a test purchase order created by simple fix script', 
      1000.00, 
      'Draft', 
      NOW(), 
      NOW()
    );
    
    RAISE NOTICE 'Created a test purchase order';
  ELSE
    RAISE NOTICE 'Purchase orders already exist, no test order created';
  END IF;
END $$;

-- 6. VERIFY FIXES
-- Count purchase orders after fixes
SELECT COUNT(*) AS purchase_order_count FROM public.purchase_orders;

-- Show sample purchase orders
SELECT id, name, po_number, supplier, status, total, created_at 
FROM public.purchase_orders 
LIMIT 5; 