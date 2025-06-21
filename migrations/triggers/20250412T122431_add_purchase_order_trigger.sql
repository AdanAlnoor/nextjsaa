-- Migrated from: add_purchase_order_trigger.sql (root directory)
-- Created: 2025-04-12T12:24:31.698Z

-- Add a trigger to automatically set project_id based on po_number
-- This ensures that purchase orders are always associated with the correct project

-- First, create the trigger function
CREATE OR REPLACE FUNCTION public.set_purchase_order_project_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract project number from po_number (format: PR-XXX-PO-YYY)
    IF NEW.po_number ~ '^PR-\d+-PO-\d+$' THEN
        -- Extract the project number part (PR-XXX)
        NEW.project_id = SUBSTRING(NEW.po_number FROM '^(PR-\d+)');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the purchase_orders table
DROP TRIGGER IF EXISTS set_project_id_trigger ON public.purchase_orders;

CREATE TRIGGER set_project_id_trigger
BEFORE INSERT OR UPDATE OF po_number
ON public.purchase_orders
FOR EACH ROW
WHEN (NEW.project_id IS NULL OR NEW.project_id = '')
EXECUTE FUNCTION public.set_purchase_order_project_id();

-- Test the trigger with a sample insert (commented out for safety)
/*
INSERT INTO public.purchase_orders (
    name, 
    po_number, 
    supplier, 
    total, 
    status, 
    created_at, 
    updated_at
) VALUES (
    'Test Purchase Order', 
    'PR-003-PO-999', 
    'Test Supplier', 
    1000.00, 
    'Draft', 
    NOW(), 
    NOW()
);

-- Verify the insert
SELECT id, po_number, project_id
FROM public.purchase_orders
WHERE po_number = 'PR-003-PO-999';
*/ 