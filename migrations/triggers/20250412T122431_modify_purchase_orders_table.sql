-- Migrated from: modify_purchase_orders_table.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- Modify purchase_orders table to add parent_id and related functionality
-- This script will alter the existing purchase_orders table to support hierarchical purchase orders

-- First, disable RLS temporarily to allow modifications
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;

-- Add parent_id column to purchase_orders table
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS purchase_orders_project_id_idx ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS purchase_orders_parent_id_idx ON public.purchase_orders(parent_id);

-- Create function to update parent total
CREATE OR REPLACE FUNCTION update_purchase_order_parent_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update immediate parent's total
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE public.purchase_orders
            SET total = (
                SELECT COALESCE(SUM(total), 0)
                FROM public.purchase_orders
                WHERE parent_id = OLD.parent_id
            )
            WHERE id = OLD.parent_id;
            
            -- Update grandparent if it exists
            UPDATE public.purchase_orders
            SET total = (
                SELECT COALESCE(SUM(total), 0)
                FROM public.purchase_orders
                WHERE parent_id = p.id
            )
            FROM public.purchase_orders p
            WHERE p.id = (
                SELECT parent_id 
                FROM public.purchase_orders 
                WHERE id = OLD.parent_id
            );
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.parent_id IS NOT NULL THEN
            -- Update immediate parent's total
            UPDATE public.purchase_orders
            SET total = (
                SELECT COALESCE(SUM(total), 0)
                FROM public.purchase_orders
                WHERE parent_id = NEW.parent_id
            )
            WHERE id = NEW.parent_id;
            
            -- Update grandparent if it exists
            UPDATE public.purchase_orders
            SET total = (
                SELECT COALESCE(SUM(total), 0)
                FROM public.purchase_orders
                WHERE parent_id = p.id
            )
            FROM public.purchase_orders p
            WHERE p.id = (
                SELECT parent_id 
                FROM public.purchase_orders 
                WHERE id = NEW.parent_id
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update parent total
DROP TRIGGER IF EXISTS update_purchase_order_parent_total ON public.purchase_orders;
CREATE TRIGGER update_purchase_order_parent_total
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_parent_total();

-- Ensure the updated_at column is automatically updated
CREATE OR REPLACE FUNCTION update_purchase_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_purchase_order_updated_at ON public.purchase_orders;
CREATE TRIGGER update_purchase_order_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_updated_at();

-- Modify the existing project_id trigger to preserve parent_id relationship
CREATE OR REPLACE FUNCTION public.set_purchase_order_project_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract project number from po_number (format: PR-XXX-PO-YYY)
    IF NEW.po_number ~ '^PR-\d+-PO-\d+$' THEN
        -- Extract the project number part (PR-XXX)
        NEW.project_id = SUBSTRING(NEW.po_number FROM '^(PR-\d+)');
    END IF;
    
    -- If this is a child purchase order, inherit the project_id from parent
    IF NEW.parent_id IS NOT NULL AND (NEW.project_id IS NULL OR NEW.project_id = '') THEN
        SELECT project_id INTO NEW.project_id
        FROM public.purchase_orders
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to get the total purchase order amount for a project
CREATE OR REPLACE FUNCTION get_project_purchase_order_total(project_id_param TEXT)
RETURNS DECIMAL AS $$
DECLARE
    total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(total), 0) INTO total
    FROM public.purchase_orders
    WHERE project_id = project_id_param AND (parent_id IS NULL OR level = 1);
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Re-enable RLS
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Verify that all triggers are properly set up
SELECT 
    tgname AS trigger_name,
    proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'public.purchase_orders'::regclass;

-- Update the transformPurchaseOrders function in TypeScript to handle parent-child relationships
COMMENT ON TABLE public.purchase_orders IS 
'Purchase orders table with hierarchical structure. 
Parent purchase orders have is_parent=true and can contain child purchase orders.
Each purchase order is linked to a project via project_id.
Child purchase orders inherit their project_id from their parent if not explicitly set.'; 