-- Migrated from: count_project_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Count purchase orders for project with ID 70369ddf-31aa-4261-9382-c6fa67ebacaa

-- Count the total number of purchase orders for this project
SELECT 
  COUNT(*) AS total_purchase_orders
FROM 
  public.purchase_orders
WHERE 
  project_id = '70369ddf-31aa-4261-9382-c6fa67ebacaa';

-- Show details of all purchase orders for this project
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.supplier,
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
  po.project_id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
ORDER BY 
  po.po_number;

-- Get the project information
SELECT 
  id,
  name,
  project_code
FROM 
  public.projects
WHERE 
  id = '70369ddf-31aa-4261-9382-c6fa67ebacaa';

-- Check for purchase orders that might belong to this project based on po_number pattern
-- but don't have the correct project_id
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.project_id,
  po.status,
  po.total,
  p.project_code
FROM 
  public.purchase_orders po
LEFT JOIN 
  public.projects p ON p.id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
WHERE 
  po.project_id IS NULL
  AND po.po_number LIKE CONCAT(p.project_code, '-PO-%')
ORDER BY 
  po.po_number; 