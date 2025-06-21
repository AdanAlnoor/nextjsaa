-- Migrated from: fix_rls_policies.sql (root directory)
-- Created: 2025-04-12T12:24:31.705Z

-- Check current RLS status for purchase_orders table
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'purchase_orders';

-- Check existing RLS policies for purchase_orders
SELECT * FROM pg_policies 
WHERE tablename = 'purchase_orders';

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

-- Grant permissions to authenticated users and service role
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

-- Check RLS policies after changes
SELECT * FROM pg_policies 
WHERE tablename = 'purchase_orders' OR tablename = 'purchase_order_items';

-- Insert a test purchase order to verify permissions
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
  'RLS Test Purchase Order', 
  'RLS-TEST-001', 
  'RLS Test Supplier', 
  'This is a test purchase order to verify RLS policies', 
  1500.00, 
  'Draft', 
  NOW(), 
  NOW()
);

-- Verify the test purchase order was inserted
SELECT id, name, po_number, supplier, status, total 
FROM public.purchase_orders 
WHERE name = 'RLS Test Purchase Order'; 