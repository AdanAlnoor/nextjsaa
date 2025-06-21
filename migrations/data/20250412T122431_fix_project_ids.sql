-- Migrated from: fix_project_ids.sql (root directory)
-- Created: 2025-04-12T12:24:31.703Z

-- FIX PROJECT IDS FOR PURCHASE ORDERS
-- This script updates existing purchase orders to associate them with a project

-- First, check if we have any purchase orders with NULL project_id
SELECT COUNT(*) AS purchase_orders_without_project
FROM public.purchase_orders
WHERE project_id IS NULL;

-- Check if we have any projects in the database
SELECT id, name, project_number
FROM public.projects
LIMIT 5;

-- Update purchase orders to associate with a project
-- Replace 'your-project-id-here' with an actual project ID from your database
-- You can get this from the projects table
DO $$
DECLARE
  target_project_id UUID;
  po_count INTEGER;
BEGIN
  -- Get the first project ID from the projects table
  -- If you want to use a specific project, replace this query with a hardcoded UUID
  SELECT id INTO target_project_id FROM public.projects LIMIT 1;
  
  IF target_project_id IS NULL THEN
    RAISE EXCEPTION 'No projects found in the database. Please create a project first.';
  END IF;
  
  -- Count purchase orders without project ID
  SELECT COUNT(*) INTO po_count FROM public.purchase_orders WHERE project_id IS NULL;
  
  -- Update all purchase orders with NULL project_id
  UPDATE public.purchase_orders
  SET project_id = target_project_id
  WHERE project_id IS NULL;
  
  RAISE NOTICE 'Updated % purchase orders to associate with project ID: %', po_count, target_project_id;
END $$;

-- Verify the update
SELECT COUNT(*) AS purchase_orders_with_project
FROM public.purchase_orders
WHERE project_id IS NOT NULL;

-- Show sample purchase orders with their project IDs
SELECT id, name, po_number, supplier, status, project_id
FROM public.purchase_orders
LIMIT 10; 