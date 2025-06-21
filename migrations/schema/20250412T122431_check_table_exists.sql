-- Migrated from: check_table_exists.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Check if the cost_control_items table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'cost_control_items'
);

-- Get column information if the table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cost_control_items'
ORDER BY ordinal_position; 