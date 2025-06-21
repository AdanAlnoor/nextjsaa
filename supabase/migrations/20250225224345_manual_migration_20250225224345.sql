-- Drop old triggers and functions
DROP TRIGGER IF EXISTS update_parent_builder_cost ON public.estimate_items;
DROP FUNCTION IF EXISTS update_parent_builder_cost() CASCADE; 