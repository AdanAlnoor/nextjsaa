-- Migrated from: check_project_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Query to check all purchase orders under project ID: 70369ddf-31aa-4261-9382-c6fa67ebacaa

-- 1. Basic query to show purchase orders directly linked to this project ID
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.supplier,
  po.total,
  po.status,
  po.created_at,
  po.updated_at,
  po.project_id
FROM 
  public.purchase_orders po
WHERE 
  po.project_id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
ORDER BY 
  po.po_number;

-- 2. Get project details to understand what we're looking for
SELECT 
  id,
  name,
  project_code,
  project_number
FROM 
  public.projects
WHERE 
  id = '70369ddf-31aa-4261-9382-c6fa67ebacaa';

-- 3. Check for purchase orders that might belong to this project based on po_number pattern
-- but aren't linked by project_id
WITH project_info AS (
  SELECT 
    id,
    project_code,
    project_number
  FROM 
    public.projects
  WHERE 
    id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
)
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.supplier,
  po.total,
  po.status,
  po.created_at,
  po.updated_at,
  po.project_id,
  pi.project_code
FROM 
  public.purchase_orders po,
  project_info pi
WHERE 
  po.project_id IS NULL
  AND (
    po.po_number LIKE CONCAT(pi.project_code, '-PO-%') OR
    po.po_number LIKE CONCAT('PR-', pi.project_number, '-PO-%')
  )
ORDER BY 
  po.po_number;

-- 4. Check for purchase orders with wrong project_id
-- that might belong to this project based on po_number pattern
WITH project_info AS (
  SELECT 
    id,
    project_code,
    project_number
  FROM 
    public.projects
  WHERE 
    id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
)
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.supplier,
  po.total,
  po.status,
  po.created_at,
  po.updated_at,
  po.project_id,
  pi.project_code,
  pi.id AS correct_project_id
FROM 
  public.purchase_orders po,
  project_info pi
WHERE 
  po.project_id IS NOT NULL
  AND po.project_id != pi.id
  AND (
    po.po_number LIKE CONCAT(pi.project_code, '-PO-%') OR
    po.po_number LIKE CONCAT('PR-', pi.project_number, '-PO-%')
  )
ORDER BY 
  po.po_number;

-- 5. Update query to fix purchase orders that should belong to this project
-- IMPORTANT: Review results from query #3 and #4 before running this update!
/*
WITH project_info AS (
  SELECT 
    id,
    project_code,
    project_number
  FROM 
    public.projects
  WHERE 
    id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
)
UPDATE public.purchase_orders po
SET project_id = (SELECT id FROM project_info)
FROM project_info pi
WHERE 
  (po.project_id IS NULL OR po.project_id != pi.id)
  AND (
    po.po_number LIKE CONCAT(pi.project_code, '-PO-%') OR
    po.po_number LIKE CONCAT('PR-', pi.project_number, '-PO-%')
  );
*/ 