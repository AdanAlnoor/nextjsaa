-- Migrated from: fix_purchase_order_project_ids.sql (root directory)
-- Created: 2025-04-12T12:24:31.704Z

-- Script to fix purchase orders with NULL or invalid project_id values
-- This script extracts project codes from po_number and assigns the correct project_id

-- First, check for orphaned purchase orders (NULL project_id but with po_number containing project code)
WITH orphaned_pos AS (
  SELECT 
    po.id,
    po.po_number,
    po.project_id,
    CASE 
      WHEN po.po_number ~ '^PR-\d{3}-PO-\d+$' THEN 
        SUBSTRING(po.po_number FROM '^(PR-\d{3})-PO-\d+$')
      ELSE NULL
    END AS extracted_project_code
  FROM public.purchase_orders po
  WHERE (po.project_id IS NULL OR po.project_id = '')
    AND po.po_number ~ '^PR-\d{3}-PO-\d+$'
)
SELECT 
  o.id AS po_id,
  o.po_number,
  o.extracted_project_code,
  p.id AS matching_project_id,
  p.project_code,
  p.name AS project_name
FROM orphaned_pos o
LEFT JOIN public.projects p ON p.project_code = o.extracted_project_code
ORDER BY o.po_number;

-- Create a backup of purchase orders table before making changes
CREATE TABLE IF NOT EXISTS public.purchase_orders_backup AS 
SELECT * FROM public.purchase_orders;

-- Update orphaned purchase orders with correct project_id
-- This updates purchase orders where project_id is NULL but po_number contains a valid project code
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p
WHERE po.project_id IS NULL
  AND SUBSTRING(po.po_number FROM '^(PR-\d{3})-PO-\d+$') = p.project_code;

-- Update purchase orders with empty string project_id
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p
WHERE po.project_id = ''
  AND SUBSTRING(po.po_number FROM '^(PR-\d{3})-PO-\d+$') = p.project_code;

-- Update purchase orders with text project_id that matches project_code
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p
WHERE po.project_id = p.project_code
  AND po.project_id IS NOT NULL;

-- Handle the case where project_id is a UUID but for the wrong project
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p
WHERE po.project_id IS NOT NULL
  AND SUBSTRING(po.po_number FROM '^(PR-\d{3})-PO-\d+$') = p.project_code
  AND po.project_id != p.id
  AND po.project_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify results after updates
SELECT 
  COUNT(*) AS total_purchase_orders,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) AS pos_with_project_id,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) AS pos_without_project_id
FROM public.purchase_orders;

-- Show purchase orders that still have NULL project_id after fixes
SELECT 
  id,
  po_number,
  name,
  project_id,
  created_at,
  updated_at
FROM public.purchase_orders
WHERE project_id IS NULL
ORDER BY po_number;

-- Create a trigger to automatically set project_id based on po_number for future inserts
CREATE OR REPLACE FUNCTION set_purchase_order_project_id()
RETURNS TRIGGER AS $$
DECLARE
  project_code TEXT;
  project_uuid UUID;
BEGIN
  -- Extract project code from po_number if it matches the pattern
  IF NEW.po_number ~ '^PR-\d{3}-PO-\d+$' THEN
    project_code := SUBSTRING(NEW.po_number FROM '^(PR-\d{3})-PO-\d+$');
    
    -- Look up the project UUID using the project code
    SELECT id INTO project_uuid
    FROM public.projects
    WHERE project_code = project_code;
    
    -- If we found a matching project, set the project_id
    IF project_uuid IS NOT NULL THEN
      NEW.project_id := project_uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS set_project_id_trigger ON public.purchase_orders;
CREATE TRIGGER set_project_id_trigger
BEFORE INSERT OR UPDATE OF po_number ON public.purchase_orders
FOR EACH ROW
WHEN (NEW.project_id IS NULL OR NEW.project_id = '')
EXECUTE FUNCTION set_purchase_order_project_id(); 