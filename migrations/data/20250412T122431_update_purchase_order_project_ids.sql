-- Migrated from: update_purchase_order_project_ids.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- Script to update purchase orders with the new UUID project IDs after migration
-- This script should be run after the main migration script (migrate_project_ids_to_uuid.sql)

-- Step 1: Create a temporary table to store purchase orders that need updating
CREATE TEMP TABLE purchase_orders_to_update AS
SELECT 
    po.id AS po_id,
    po.project_id AS old_project_id,
    p.id AS new_project_id
FROM 
    public.purchase_orders po
JOIN 
    public.projects p ON p.text_id = po.project_id
WHERE 
    po.project_id IS NOT NULL
    AND po.project_id NOT LIKE '%-%-%-%-%'; -- Skip UUIDs that are already updated

-- Step 2: Update purchase orders with the new UUID project IDs
UPDATE public.purchase_orders po
SET project_id = potu.new_project_id
FROM purchase_orders_to_update potu
WHERE po.id = potu.po_id;

-- Step 3: Handle purchase orders with NULL project_id but with po_number pattern
UPDATE public.purchase_orders po
SET project_id = p.id
FROM public.projects p
WHERE 
    po.project_id IS NULL
    AND po.po_number ~ ('^' || p.project_number || '-PO-\\d+$');

-- Step 4: Log the results
SELECT 
    'Updated ' || COUNT(*) || ' purchase orders with new UUID project IDs' AS result
FROM 
    purchase_orders_to_update;

-- Step 5: Verify the updates
SELECT 
    COUNT(*) AS total_purchase_orders,
    COUNT(CASE WHEN project_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) AS uuid_project_ids,
    COUNT(CASE WHEN project_id ~ '^PR-\\d+$' THEN 1 END) AS text_project_ids,
    COUNT(CASE WHEN project_id IS NULL THEN 1 END) AS null_project_ids
FROM 
    public.purchase_orders;

-- Drop the temporary table
DROP TABLE IF EXISTS purchase_orders_to_update; 