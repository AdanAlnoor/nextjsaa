-- Migrated from: get_purchase_order_project_ids.sql (root directory)
-- Created: 2025-04-12T12:24:31.705Z

-- SQL Query to get all project IDs associated with purchase orders in Supabase

-- 1. Count of purchase orders by project ID
SELECT 
  project_id,
  COUNT(*) AS purchase_order_count
FROM 
  public.purchase_orders
WHERE 
  project_id IS NOT NULL
GROUP BY 
  project_id
ORDER BY 
  COUNT(*) DESC;

-- 2. Project IDs with project details and purchase order count
SELECT 
  p.id AS project_id,
  p.project_code,
  p.name AS project_name,
  COUNT(po.id) AS purchase_order_count
FROM 
  public.projects p
LEFT JOIN 
  public.purchase_orders po ON p.id = po.project_id
GROUP BY 
  p.id, p.project_code, p.name
ORDER BY 
  COUNT(po.id) DESC, p.project_code;

-- 3. Purchase orders with their project IDs
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.project_id,
  p.project_code,
  p.name AS project_name
FROM 
  public.purchase_orders po
LEFT JOIN 
  public.projects p ON po.project_id = p.id
ORDER BY 
  p.project_code, po.po_number;

-- 4. Purchase orders without project IDs
SELECT 
  po.id AS purchase_order_id,
  po.po_number,
  po.name AS purchase_order_name,
  po.project_id
FROM 
  public.purchase_orders po
WHERE 
  po.project_id IS NULL
ORDER BY 
  po.po_number; 