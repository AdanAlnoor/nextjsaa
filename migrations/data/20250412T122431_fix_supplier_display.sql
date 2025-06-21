-- Migrated from: fix_supplier_display.sql (root directory)
-- Created: 2025-04-12T12:24:31.705Z

-- Fix supplier display in purchase_orders table
-- This script updates the supplier field with the proper supplier name from the suppliers table

-- First, let's check how many records need to be fixed
SELECT COUNT(*) AS records_to_fix
FROM public.purchase_orders po
WHERE po.supplier_id IS NOT NULL
AND (
  -- Records where supplier looks like a UUID
  po.supplier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR
  -- Records where supplier is empty but supplier_id exists
  po.supplier IS NULL OR po.supplier = ''
);

-- Update the supplier field with the proper supplier name
UPDATE public.purchase_orders po
SET supplier = s.name
FROM public.suppliers s
WHERE po.supplier_id = s.id
AND (
  -- Records where supplier looks like a UUID
  po.supplier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR
  -- Records where supplier is empty but supplier_id exists
  po.supplier IS NULL OR po.supplier = ''
);

-- Verify the update
SELECT 
  po.id,
  po.po_number,
  po.supplier_id,
  po.supplier AS updated_supplier_name,
  s.name AS actual_supplier_name
FROM public.purchase_orders po
JOIN public.suppliers s ON po.supplier_id = s.id
LIMIT 10;

-- Check if any records still have issues
SELECT COUNT(*) AS remaining_issues
FROM public.purchase_orders po
LEFT JOIN public.suppliers s ON po.supplier_id = s.id
WHERE po.supplier_id IS NOT NULL
AND po.supplier != s.name; 