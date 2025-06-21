-- Migrated from: create_supplier_trigger.sql (root directory)
-- Created: 2025-04-12T12:24:31.700Z

-- Create a function to update the supplier field when supplier_id changes
CREATE OR REPLACE FUNCTION public.update_supplier_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if supplier_id is not null
  IF NEW.supplier_id IS NOT NULL THEN
    -- Get the supplier name from the suppliers table
    SELECT name INTO NEW.supplier
    FROM public.suppliers
    WHERE id = NEW.supplier_id;
    
    -- Log the update (optional, can be removed in production)
    RAISE NOTICE 'Updated supplier name to "%" for purchase order %', NEW.supplier, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if the trigger already exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'ensure_supplier_name_consistency'
  ) THEN
    DROP TRIGGER ensure_supplier_name_consistency ON public.purchase_orders;
  END IF;
END $$;

-- Create the trigger
CREATE TRIGGER ensure_supplier_name_consistency
BEFORE INSERT OR UPDATE OF supplier_id
ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_name();

-- Test the trigger with a sample update
DO $$
DECLARE
  test_po_id UUID;
  test_supplier_id UUID;
  old_supplier TEXT;
  new_supplier TEXT;
BEGIN
  -- Get a sample purchase order and supplier
  SELECT po.id, po.supplier, s.id INTO test_po_id, old_supplier, test_supplier_id
  FROM public.purchase_orders po
  CROSS JOIN public.suppliers s
  WHERE po.supplier_id IS NULL OR po.supplier_id != s.id
  LIMIT 1;
  
  IF test_po_id IS NOT NULL AND test_supplier_id IS NOT NULL THEN
    -- Update the purchase order with the new supplier_id
    UPDATE public.purchase_orders
    SET supplier_id = test_supplier_id
    WHERE id = test_po_id;
    
    -- Check the result
    SELECT supplier INTO new_supplier
    FROM public.purchase_orders
    WHERE id = test_po_id;
    
    RAISE NOTICE 'Test result: PO % supplier changed from "%" to "%"', 
      test_po_id, old_supplier, new_supplier;
  ELSE
    RAISE NOTICE 'No suitable test data found. Trigger created but not tested.';
  END IF;
END $$; 