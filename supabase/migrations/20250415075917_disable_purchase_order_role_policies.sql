-- Migration to disable role-based policies for purchase orders
-- Created: 2025-04-15T07:59:17.000Z

-- Drop all existing role-based policies for purchase orders
DROP POLICY IF EXISTS "Users with roles can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Only purchasers can create purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Purchasers can update draft purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Only approvers can approve/reject purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Only approvers can approve or reject purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Finance can convert purchase orders to bills" ON public.purchase_orders;
DROP POLICY IF EXISTS "Only admin and project managers can delete purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Purchasers can resubmit rejected purchase orders" ON public.purchase_orders;

-- Drop all existing role-based policies for purchase order items
DROP POLICY IF EXISTS "Users with roles can view purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Only purchasers can add purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Only purchasers can update purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Only purchasers can delete purchase order items" ON public.purchase_order_items;

-- Handle permissive policies for purchase orders
DO $$
BEGIN
  -- For purchase orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_orders' AND policyname = 'Allow all users to view purchase orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to view purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_orders' AND policyname = 'Allow all users to insert purchase orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to insert purchase orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_orders' AND policyname = 'Allow all users to update purchase orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to update purchase orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_orders' AND policyname = 'Allow all users to delete purchase orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to delete purchase orders" ON public.purchase_orders FOR DELETE TO authenticated USING (true)';
  END IF;
  
  -- For purchase order items
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_items' AND policyname = 'Allow all users to view purchase order items'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to view purchase order items" ON public.purchase_order_items FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_items' AND policyname = 'Allow all users to insert purchase order items'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to insert purchase order items" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_items' AND policyname = 'Allow all users to update purchase order items'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to update purchase order items" ON public.purchase_order_items FOR UPDATE TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_items' AND policyname = 'Allow all users to delete purchase order items'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all users to delete purchase order items" ON public.purchase_order_items FOR DELETE TO authenticated USING (true)';
  END IF;
END
$$;

-- Comment explaining the purpose of this migration
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders with permissive policies (role-based permissions disabled)';
COMMENT ON TABLE public.purchase_order_items IS 'Purchase order items with permissive policies (role-based permissions disabled)'; 