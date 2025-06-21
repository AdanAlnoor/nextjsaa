-- Migrated from: fix_project_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.703Z

-- SQL script to fix project IDs for purchase orders that belong to PR-003

-- First, get the correct UUID for project PR-003
WITH project_info AS (
  SELECT 
    id AS project_uuid,
    project_number,
    text_id
  FROM 
    projects
  WHERE 
    project_number = '003' 
    OR text_id = 'PR-003'
    OR id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
  LIMIT 1
)

-- Then, update purchase orders with PR-003 in the PO number but incorrect project_id
UPDATE purchase_orders po
SET 
  project_id = (SELECT project_uuid FROM project_info),
  updated_at = NOW()
FROM 
  project_info
WHERE 
  po.po_number LIKE 'PR-003-PO-%'
  AND (po.project_id IS NULL OR po.project_id != project_info.project_uuid);

-- Check the results of the update
WITH project_info AS (
  SELECT 
    id AS project_uuid,
    project_number,
    text_id
  FROM 
    projects
  WHERE 
    project_number = '003' 
    OR text_id = 'PR-003'
    OR id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
  LIMIT 1
)

SELECT 
  po.id,
  po.po_number,
  po.name,
  po.supplier,
  po.total,
  po.project_id,
  pi.project_uuid AS correct_project_id
FROM 
  purchase_orders po,
  project_info pi
WHERE 
  po.po_number LIKE 'PR-003-PO-%'
ORDER BY 
  po.po_number; 