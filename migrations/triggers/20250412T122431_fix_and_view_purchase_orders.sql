-- Migrated from: fix_and_view_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.702Z

-- SQL Script to fix purchase orders with incorrect project_id values and create a view
-- Run this in your Supabase SQL Editor

-- PART 1: Create a backup of the purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders_backup AS 
SELECT * FROM public.purchase_orders;

-- Update purchase orders with UUID project_id that needs correction based on po_number
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p
WHERE po.project_id IS NOT NULL
  AND SUBSTRING(po.po_number FROM '^(PR-\d{3})-PO-\d+$') = p.project_code
  AND po.project_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND po.project_id != p.id;

-- PART 2: Create a view to easily see purchase orders related to projects
-- First, let's check the actual columns in the purchase_orders table
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_orders';

-- Now create the view with the correct columns
CREATE OR REPLACE VIEW public.project_purchase_orders AS
SELECT 
  p.id AS project_id,
  p.project_code,
  p.name AS project_name,
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.supplier,
  po.total,
  po.status,
  po.created_at,
  po.updated_at
FROM 
  public.projects p
JOIN 
  public.purchase_orders po ON po.project_id = p.id
ORDER BY 
  p.project_code, po.po_number;

-- PART 3: Create a trigger to automatically set project_id based on po_number for future inserts
CREATE OR REPLACE FUNCTION public.set_purchase_order_project_id()
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
WHEN (NEW.project_id IS NULL)
EXECUTE FUNCTION public.set_purchase_order_project_id();

-- PART 4: Query to find purchase orders without a project
-- Use this to identify purchase orders that need to be deleted
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.project_id,
  po.status,
  po.total,
  SUBSTRING(po.po_number FROM '^(PR-\d{3})') AS extracted_project_code
FROM 
  public.purchase_orders po
LEFT JOIN 
  public.projects p ON po.project_id = p.id
WHERE 
  po.project_id IS NULL
ORDER BY 
  po.po_number;

-- PART 5: Query to view all purchase orders related to a specific project
-- Replace 'your-project-id-here' with the actual project_id (UUID) you want to search for
-- Or replace 'your-project-code-here' with a project code like 'PR-001'

-- Option 1: View purchase orders by project UUID
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.total,
  po.status,
  po.created_at,
  po.updated_at,
  p.name AS project_name,
  p.project_code
FROM 
  public.purchase_orders po
JOIN 
  public.projects p ON po.project_id = p.id
WHERE 
  p.id = 'your-project-id-here'  -- Replace with actual UUID
ORDER BY 
  po.po_number;

-- Option 2: View purchase orders by project code (e.g., PR-001)
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.total,
  po.status,
  po.created_at,
  po.updated_at,
  p.name AS project_name,
  p.id AS project_id
FROM 
  public.purchase_orders po
JOIN 
  public.projects p ON po.project_id = p.id
WHERE 
  p.project_code = 'your-project-code-here'  -- Replace with project code like 'PR-001'
ORDER BY 
  po.po_number;

-- Option 3: View ALL purchase orders with their project information
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.project_id,
  po.total,
  po.status,
  p.project_code,
  p.name AS project_name
FROM 
  public.purchase_orders po
LEFT JOIN 
  public.projects p ON po.project_id = p.id
ORDER BY 
  p.project_code, po.po_number; 