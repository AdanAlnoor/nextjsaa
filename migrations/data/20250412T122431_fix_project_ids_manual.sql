-- Migrated from: fix_project_ids_manual.sql (root directory)
-- Created: 2025-04-12T12:24:31.703Z

-- MANUAL FIX FOR PROJECT IDS
-- This script updates existing purchase orders to associate with a specific project ID

-- First, check if we have any purchase orders with NULL project_id
SELECT COUNT(*) AS purchase_orders_without_project
FROM public.purchase_orders
WHERE project_id IS NULL;

-- Update purchase orders to associate with a specific project
-- Replace the UUID below with the project ID you want to use
DO $$
DECLARE
  -- Replace this UUID with your target project ID
  target_project_id UUID := '310367fb-6193-40fd-ad87-3e2d0e5826dc'; -- REPLACE THIS WITH YOUR PROJECT ID
  po_count INTEGER;
BEGIN
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