-- Migrated from: rollback_project_id_migration.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- Rollback script for the project ID migration
-- This script will revert the changes made by migrate_project_ids_to_uuid.sql

-- Step 1: Begin transaction
BEGIN;

-- Step 2: Restore the original projects table from backup
-- First, drop constraints that reference the projects table
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_project_id_fkey;
ALTER TABLE public.cost_control_items DROP CONSTRAINT IF EXISTS cost_control_items_project_id_fkey;
-- Drop any other foreign key constraints referencing projects.id

-- Step 3: Rename the current projects table and restore the backup
ALTER TABLE public.projects RENAME TO projects_new_backup;
ALTER TABLE public.projects_backup RENAME TO projects;
-- If projects_old still exists, use it instead
-- ALTER TABLE public.projects_old RENAME TO projects;

-- Step 4: Update referencing tables to use the text IDs again
-- First, update purchase orders
UPDATE public.purchase_orders po
SET project_id = p.text_id
FROM public.projects p
WHERE po.project_id = p.id::text;

-- Update cost control items
UPDATE public.cost_control_items cci
SET project_id = p.text_id
FROM public.projects p
WHERE cci.project_id = p.id::text;

-- Step 5: Alter the column types back to TEXT if they were changed to UUID
ALTER TABLE public.purchase_orders 
    ALTER COLUMN project_id TYPE TEXT;

ALTER TABLE public.cost_control_items 
    ALTER COLUMN project_id TYPE TEXT;

-- Step 6: Re-establish foreign key constraints
ALTER TABLE public.purchase_orders 
    ADD CONSTRAINT purchase_orders_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.cost_control_items 
    ADD CONSTRAINT cost_control_items_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Step 7: Drop the mapping table if it exists
DROP TABLE IF EXISTS public.project_id_mapping;

-- Step 8: Verify the rollback
SELECT 
    COUNT(*) AS total_projects,
    COUNT(CASE WHEN id ~ '^PR-\\d+$' THEN 1 END) AS text_id_projects
FROM 
    public.projects;

SELECT 
    COUNT(*) AS total_purchase_orders,
    COUNT(CASE WHEN project_id ~ '^PR-\\d+$' THEN 1 END) AS text_project_ids,
    COUNT(CASE WHEN project_id IS NULL THEN 1 END) AS null_project_ids
FROM 
    public.purchase_orders;

-- Step 9: Commit the transaction if everything looks good
COMMIT;

-- If there are issues, you can rollback the transaction
-- ROLLBACK; 