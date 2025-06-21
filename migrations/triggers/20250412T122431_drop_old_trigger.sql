-- Migrated from: drop_old_trigger.sql (root directory)
-- Created: 2025-04-12T12:24:31.700Z

-- Drop old triggers and functions
DROP TRIGGER IF EXISTS update_parent_builder_cost ON public.estimate_items;
DROP FUNCTION IF EXISTS update_parent_builder_cost() CASCADE; 