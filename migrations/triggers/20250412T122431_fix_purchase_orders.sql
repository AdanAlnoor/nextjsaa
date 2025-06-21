-- Migrated from: fix_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.704Z

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can view items of their purchase orders" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can insert items to their purchase orders" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can update items of their purchase orders" ON public.purchase_order_items;

-- Temporarily disable RLS to allow all operations
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items DISABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.purchase_order_items;
DROP TABLE IF EXISTS public.purchase_orders;

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    po_number VARCHAR(50) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    description TEXT,
    approval_deadline TIMESTAMP WITH TIME ZONE,
    delivery_deadline TIMESTAMP WITH TIME ZONE,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    project_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approval_date TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejection_reason TEXT,
    rejection_date TIMESTAMP WITH TIME ZONE
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    unit_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    internal_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);

-- Enable RLS with permissive policies
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all authenticated users to access purchase orders
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

-- Create function to update purchase order total when items change
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.purchase_orders
    SET total = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.purchase_order_items
        WHERE purchase_order_id = NEW.purchase_order_id
    ),
    updated_at = NOW()
    WHERE id = NEW.purchase_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update purchase order total
DROP TRIGGER IF EXISTS update_po_total_on_item_change ON public.purchase_order_items;
CREATE TRIGGER update_po_total_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

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

-- Final check: Count purchase orders after fixes
SELECT COUNT(*) AS purchase_order_count FROM public.purchase_orders; 