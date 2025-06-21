-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;

-- Create purchase orders table with simplified structure
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT NOT NULL,
    name TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    description TEXT,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
    due_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Draft',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create purchase order items table with simplified structure
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    internal_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS purchase_orders_project_id_idx ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_po_id_idx ON public.purchase_order_items(purchase_order_id);

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

-- Grant permissions
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role; 