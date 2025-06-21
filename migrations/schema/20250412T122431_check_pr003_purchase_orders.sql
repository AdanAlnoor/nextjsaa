-- Migrated from: check_pr003_purchase_orders.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Query to check purchase orders related to PR-003

-- 1. Check all purchase orders with project_id containing PR-003
SELECT 
  id, 
  po_number, 
  name, 
  supplier, 
  project_id, 
  status
FROM 
  purchase_orders 
WHERE 
  project_id LIKE '%PR-003%' 
  OR project_id = 'PR-003'
ORDER BY 
  po_number;

-- 2. Check for purchase orders with PO numbers that include PR-003
SELECT 
  id, 
  po_number, 
  name, 
  supplier, 
  project_id, 
  status
FROM 
  purchase_orders 
WHERE 
  po_number LIKE '%PR-003%'
ORDER BY 
  po_number;

-- 3. Get project details for PR-003
SELECT 
  * 
FROM 
  projects 
WHERE 
  project_number = '003' 
  OR text_id = 'PR-003' 
  OR name LIKE '%PR-003%';

-- 4. Check all purchase orders with null project_id
SELECT 
  id, 
  po_number, 
  name, 
  supplier, 
  project_id, 
  status
FROM 
  purchase_orders 
WHERE 
  project_id IS NULL
ORDER BY 
  po_number; 