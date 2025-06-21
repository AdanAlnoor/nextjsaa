-- Migrated from: fix_purchase_orders_complete.sql (root directory)
-- Created: 2025-04-12T12:24:31.704Z

-- Check if purchase_orders table exists and has the correct structure
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'purchase_orders'
);

-- Check column names in purchase_orders table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_orders';

-- Count existing purchase orders
SELECT COUNT(*) FROM public.purchase_orders;

-- Check for any existing purchase orders (limit to 5)
SELECT id, name, po_number, supplier, status, total, created_at 
FROM public.purchase_orders 
LIMIT 5;

-- Check if there are any RLS policies that might be restricting access
SELECT * FROM pg_policies 
WHERE tablename = 'purchase_orders';

-- Fix: Ensure RLS is enabled but with permissive policies
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Fix: Create or replace policies to allow all authenticated users to access purchase orders
DROP POLICY IF EXISTS "Allow all users to view purchase orders" ON public.purchase_orders;
CREATE POLICY "Allow all users to view purchase orders"
  ON public.purchase_orders
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow all users to insert purchase orders" ON public.purchase_orders;
CREATE POLICY "Allow all users to insert purchase orders"
  ON public.purchase_orders
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all users to update purchase orders" ON public.purchase_orders;
CREATE POLICY "Allow all users to update purchase orders"
  ON public.purchase_orders
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow all users to delete purchase orders" ON public.purchase_orders;
CREATE POLICY "Allow all users to delete purchase orders"
  ON public.purchase_orders
  FOR DELETE
  USING (true);

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
      'Test Purchase Order', 
      'TEST-PO-001', 
      'Test Supplier', 
      'This is a test purchase order created by SQL script', 
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

-- Check if the purchase_order_items table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'purchase_order_items'
);

-- Check column names in purchase_order_items table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_order_items';

-- Fix: Ensure RLS is enabled for purchase_order_items with permissive policies
ALTER TABLE IF EXISTS public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Fix: Create or replace policies for purchase_order_items
DROP POLICY IF EXISTS "Allow all users to view purchase order items" ON public.purchase_order_items;
CREATE POLICY "Allow all users to view purchase order items"
  ON public.purchase_order_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow all users to insert purchase order items" ON public.purchase_order_items;
CREATE POLICY "Allow all users to insert purchase order items"
  ON public.purchase_order_items
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all users to update purchase order items" ON public.purchase_order_items;
CREATE POLICY "Allow all users to update purchase order items"
  ON public.purchase_order_items
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow all users to delete purchase order items" ON public.purchase_order_items;
CREATE POLICY "Allow all users to delete purchase order items"
  ON public.purchase_order_items
  FOR DELETE
  USING (true);

-- Final check: Count purchase orders after fixes
SELECT COUNT(*) AS purchase_order_count FROM public.purchase_orders; 