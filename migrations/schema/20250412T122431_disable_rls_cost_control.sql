-- Migrated from: disable_rls_cost_control.sql (root directory)
-- Created: 2025-04-12T12:24:31.700Z

-- Temporarily disable RLS on cost_control_items table for troubleshooting
ALTER TABLE cost_control_items DISABLE ROW LEVEL SECURITY;

-- You can re-enable RLS after testing with:
-- ALTER TABLE cost_control_items ENABLE ROW LEVEL SECURITY; 