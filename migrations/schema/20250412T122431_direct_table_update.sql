-- Migrated from: direct_table_update.sql (root directory)
-- Created: 2025-04-12T12:24:31.700Z

-- Add the imported_from_estimate and import_date columns if they don't exist
DO $$
BEGIN
    -- Check if imported_from_estimate column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'cost_control_items'
        AND column_name = 'imported_from_estimate'
    ) THEN
        ALTER TABLE cost_control_items
        ADD COLUMN imported_from_estimate BOOLEAN DEFAULT false;
    END IF;

    -- Check if import_date column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'cost_control_items'
        AND column_name = 'import_date'
    ) THEN
        ALTER TABLE cost_control_items
        ADD COLUMN import_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$; 