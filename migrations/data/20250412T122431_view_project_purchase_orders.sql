-- Migrated from: view_project_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.707Z

-- Script to view all purchase orders grouped by projects
-- This script helps troubleshoot project-purchase order relationships

-- First, get a count of purchase orders by project
WITH po_counts AS (
  SELECT 
    p.id AS project_id,
    p.project_code,
    p.name AS project_name,
    COUNT(po.id) AS po_count
  FROM public.projects p
  LEFT JOIN public.purchase_orders po ON po.project_id = p.id
  GROUP BY p.id, p.project_code, p.name
),

-- Identify purchase orders with null project_id but with po_number that follows project pattern
orphaned_pos AS (
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
  WHERE po.project_id IS NULL
    AND po.po_number ~ '^PR-\d{3}-PO-\d+$'
)

-- Main query to show all projects and their purchase orders
SELECT 
  p.id AS project_id,
  p.project_code,
  p.name AS project_name,
  pc.po_count AS total_pos,
  po.id AS po_id,
  po.po_number,
  po.name AS po_name,
  po.total,
  po.status,
  po.created_at AS po_created_at
FROM public.projects p
LEFT JOIN po_counts pc ON p.id = pc.project_id
LEFT JOIN public.purchase_orders po ON p.id = po.project_id
WHERE pc.po_count > 0
ORDER BY p.project_code, po.po_number;

-- Show orphaned purchase orders (those with NULL project_id)
SELECT 
  o.id AS po_id,
  o.po_number,
  o.project_id,
  o.extracted_project_code,
  p.id AS matching_project_id,
  p.project_code AS matching_project_code,
  p.name AS matching_project_name,
  po.name AS po_name,
  po.total,
  po.status
FROM orphaned_pos o
LEFT JOIN public.projects p ON p.project_code = o.extracted_project_code
LEFT JOIN public.purchase_orders po ON po.id = o.id
ORDER BY o.po_number;

-- Show all purchase orders with project information
SELECT 
  po.id AS po_id,
  po.po_number,
  po.name AS po_name,
  po.project_id,
  p.id AS actual_project_id,
  p.project_code,
  p.name AS project_name,
  po.total,
  po.status,
  po.created_at
FROM public.purchase_orders po
LEFT JOIN public.projects p ON po.project_id = p.id
ORDER BY po.po_number;

-- Fix script: Update orphaned purchase orders with correct project_id
-- Uncomment and run to fix orphaned purchase orders
/*
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p, 
     (SELECT id, SUBSTRING(po_number FROM '^(PR-\d{3})-PO-\d+$') AS project_code 
      FROM public.purchase_orders 
      WHERE project_id IS NULL AND po_number ~ '^PR-\d{3}-PO-\d+$') o
WHERE po.id = o.id
  AND p.project_code = o.project_code;

-- Verify the fix
SELECT COUNT(*) AS updated_records FROM public.purchase_orders WHERE project_id IS NOT NULL;
*/ 