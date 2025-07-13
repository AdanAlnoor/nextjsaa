-- Phase 0 Rollback Procedures
-- Emergency rollback procedures for Phase 0 Library-Only Items Architecture

-- =================================================================
-- BACKUP CREATION FUNCTIONS
-- =================================================================

-- Function to create backup of estimate_detail_items before migration
CREATE OR REPLACE FUNCTION create_phase0_backup()
RETURNS BOOLEAN AS $$
DECLARE
    backup_count INTEGER;
BEGIN
    -- Create backup table if it doesn't exist
    CREATE TABLE IF NOT EXISTS estimate_detail_items_phase0_backup AS
    SELECT * FROM estimate_detail_items WHERE 1=0; -- Structure only
    
    -- Copy all data to backup
    INSERT INTO estimate_detail_items_phase0_backup
    SELECT * FROM estimate_detail_items;
    
    GET DIAGNOSTICS backup_count = ROW_COUNT;
    
    RAISE NOTICE 'Phase 0 backup created with % records', backup_count;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create Phase 0 backup: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to create junction table data backup
CREATE OR REPLACE FUNCTION create_junction_backup()
RETURNS BOOLEAN AS $$
DECLARE
    backup_count INTEGER;
BEGIN
    -- Create backup table if it doesn't exist
    CREATE TABLE IF NOT EXISTS estimate_element_items_backup AS
    SELECT * FROM estimate_element_items WHERE 1=0; -- Structure only
    
    -- Copy all data to backup
    DELETE FROM estimate_element_items_backup; -- Clear existing backup
    INSERT INTO estimate_element_items_backup
    SELECT * FROM estimate_element_items;
    
    GET DIAGNOSTICS backup_count = ROW_COUNT;
    
    RAISE NOTICE 'Junction table backup created with % records', backup_count;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create junction backup: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- ROLLBACK FUNCTIONS
-- =================================================================

-- Emergency rollback to pre-Phase 0 state
CREATE OR REPLACE FUNCTION rollback_phase0_migration()
RETURNS BOOLEAN AS $$
DECLARE
    restored_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Phase 0 rollback...';
    
    -- 1. Check if backup exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_detail_items_phase0_backup') THEN
        RAISE EXCEPTION 'Backup table estimate_detail_items_phase0_backup does not exist!';
    END IF;
    
    -- 2. Create junction table backup before rollback
    PERFORM create_junction_backup();
    
    -- 3. Clear current estimate_detail_items
    DELETE FROM estimate_detail_items;
    
    -- 4. Restore from backup
    INSERT INTO estimate_detail_items
    SELECT * FROM estimate_detail_items_phase0_backup;
    
    GET DIAGNOSTICS restored_count = ROW_COUNT;
    
    -- 5. Clear junction table (optional - comment out if you want to keep both)
    -- DELETE FROM estimate_element_items;
    
    RAISE NOTICE 'Phase 0 rollback completed. Restored % records to estimate_detail_items', restored_count;
    RAISE NOTICE 'Junction table data backed up to estimate_element_items_backup';
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Phase 0 rollback failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Partial rollback - restore specific element's items
CREATE OR REPLACE FUNCTION rollback_element_items(target_element_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    restored_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting partial rollback for element %', target_element_id;
    
    -- Check if backup exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_detail_items_phase0_backup') THEN
        RAISE EXCEPTION 'Backup table does not exist!';
    END IF;
    
    -- Remove junction table items for this element
    DELETE FROM estimate_element_items WHERE element_id = target_element_id;
    
    -- Restore detail items for this element from backup
    INSERT INTO estimate_detail_items
    SELECT * FROM estimate_detail_items_phase0_backup
    WHERE element_id = target_element_id;
    
    GET DIAGNOSTICS restored_count = ROW_COUNT;
    
    RAISE NOTICE 'Partial rollback completed. Restored % items for element %', restored_count, target_element_id;
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Partial rollback failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- DATA MIGRATION FUNCTIONS
-- =================================================================

-- Migrate specific detail items to junction table
CREATE OR REPLACE FUNCTION migrate_detail_items_to_junction()
RETURNS BOOLEAN AS $$
DECLARE
    migrated_count INTEGER := 0;
    orphan_count INTEGER := 0;
    detail_item RECORD;
    library_item_id UUID;
BEGIN
    RAISE NOTICE 'Starting migration of detail items to junction table...';
    
    -- Loop through all detail items
    FOR detail_item IN 
        SELECT * FROM estimate_detail_items 
        WHERE library_item_id IS NOT NULL 
    LOOP
        -- Insert into junction table
        BEGIN
            INSERT INTO estimate_element_items (
                element_id,
                library_item_id,
                quantity,
                rate_manual,
                rate_calculated,
                order_index
            ) VALUES (
                detail_item.element_id,
                detail_item.library_item_id,
                detail_item.quantity,
                CASE WHEN detail_item.rate_manual IS NOT NULL THEN detail_item.rate_manual ELSE NULL END,
                CASE WHEN detail_item.rate_calculated IS NOT NULL THEN detail_item.rate_calculated ELSE detail_item.rate END,
                detail_item.order_index
            );
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'Skipping duplicate item: element_id=%, library_item_id=%', 
                detail_item.element_id, detail_item.library_item_id;
        END;
    END LOOP;
    
    -- Count orphaned items (those without library_item_id)
    SELECT COUNT(*) INTO orphan_count 
    FROM estimate_detail_items 
    WHERE library_item_id IS NULL;
    
    RAISE NOTICE 'Migration completed: % items migrated, % orphaned items need attention', 
        migrated_count, orphan_count;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE 'Orphaned items should be manually linked to library items or migrated separately';
    END IF;
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create library items for orphaned detail items
CREATE OR REPLACE FUNCTION create_library_items_for_orphans()
RETURNS BOOLEAN AS $$
DECLARE
    orphan_item RECORD;
    new_library_item_id UUID;
    created_count INTEGER := 0;
    default_assembly_id UUID;
BEGIN
    RAISE NOTICE 'Creating library items for orphaned detail items...';
    
    -- Get a default assembly for orphaned items
    SELECT id INTO default_assembly_id 
    FROM assemblies 
    WHERE name ILIKE '%general%' OR name ILIKE '%misc%' 
    LIMIT 1;
    
    IF default_assembly_id IS NULL THEN
        -- Create a default assembly if none exists
        INSERT INTO assemblies (name, code, section_id, description, is_active)
        SELECT 'Migrated Items', '99.99', 
               (SELECT id FROM sections WHERE name ILIKE '%general%' LIMIT 1),
               'Items migrated from manual estimates', TRUE
        RETURNING id INTO default_assembly_id;
    END IF;
    
    -- Loop through orphaned detail items (unique by name and unit)
    FOR orphan_item IN 
        SELECT DISTINCT name, unit, 
               AVG(rate) as avg_rate,
               COUNT(*) as usage_count
        FROM estimate_detail_items 
        WHERE library_item_id IS NULL 
        GROUP BY name, unit
    LOOP
        -- Create library item
        INSERT INTO library_items (
            assembly_id,
            name,
            unit,
            status,
            has_materials,
            has_labor,
            has_equipment,
            is_complete,
            is_active,
            description
        ) VALUES (
            default_assembly_id,
            orphan_item.name,
            orphan_item.unit,
            'draft',
            FALSE,
            FALSE,
            FALSE,
            FALSE,
            TRUE,
            'Migrated from manual estimate items (used ' || orphan_item.usage_count || ' times)'
        ) RETURNING id INTO new_library_item_id;
        
        -- Update detail items to reference new library item
        UPDATE estimate_detail_items 
        SET library_item_id = new_library_item_id
        WHERE name = orphan_item.name 
          AND unit = orphan_item.unit 
          AND library_item_id IS NULL;
        
        created_count := created_count + 1;
        
        RAISE NOTICE 'Created library item "%" (% %) - used % times', 
            orphan_item.name, orphan_item.unit, new_library_item_id, orphan_item.usage_count;
    END LOOP;
    
    RAISE NOTICE 'Created % library items for orphaned detail items', created_count;
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Creating library items for orphans failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- VALIDATION FUNCTIONS
-- =================================================================

-- Validate migration integrity
CREATE OR REPLACE FUNCTION validate_phase0_migration()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT,
    details TEXT
) AS $$
DECLARE
    detail_count INTEGER;
    junction_count INTEGER;
    orphan_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Test 1: Count comparison
    SELECT COUNT(*) INTO detail_count FROM estimate_detail_items;
    SELECT COUNT(*) INTO junction_count FROM estimate_element_items;
    
    RETURN QUERY SELECT 
        'Item Count Comparison'::TEXT,
        CASE WHEN detail_count >= junction_count THEN 'PASS' ELSE 'WARN' END::TEXT,
        ('Detail items: ' || detail_count || ', Junction items: ' || junction_count)::TEXT,
        NULL::TEXT;
    
    -- Test 2: Orphaned items check
    SELECT COUNT(*) INTO orphan_count 
    FROM estimate_detail_items 
    WHERE library_item_id IS NULL;
    
    RETURN QUERY SELECT 
        'Orphaned Items'::TEXT,
        CASE WHEN orphan_count = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
        ('Found ' || orphan_count || ' orphaned items')::TEXT,
        NULL::TEXT;
    
    -- Test 3: Display view test
    BEGIN
        SELECT COUNT(*) INTO view_count FROM estimate_items_display LIMIT 100;
        
        RETURN QUERY SELECT 
            'Display View'::TEXT,
            'PASS'::TEXT,
            ('View accessible, shows ' || view_count || ' items')::TEXT,
            NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'Display View'::TEXT,
            'FAIL'::TEXT,
            'Display view error'::TEXT,
            SQLERRM::TEXT;
    END;
    
    -- Test 4: Foreign key constraints
    BEGIN
        INSERT INTO estimate_element_items (element_id, library_item_id, quantity)
        VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1);
        
        RETURN QUERY SELECT 
            'Foreign Key Constraints'::TEXT,
            'FAIL'::TEXT,
            'Constraints not working'::TEXT,
            'Invalid insert succeeded'::TEXT;
    EXCEPTION WHEN foreign_key_violation THEN
        RETURN QUERY SELECT 
            'Foreign Key Constraints'::TEXT,
            'PASS'::TEXT,
            'Constraints working correctly'::TEXT,
            NULL::TEXT;
    END;
    
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- UTILITY FUNCTIONS
-- =================================================================

-- Clean up backup tables (use with caution!)
CREATE OR REPLACE FUNCTION cleanup_phase0_backups()
RETURNS BOOLEAN AS $$
BEGIN
    DROP TABLE IF EXISTS estimate_detail_items_phase0_backup;
    DROP TABLE IF EXISTS estimate_element_items_backup;
    
    RAISE NOTICE 'Phase 0 backup tables cleaned up';
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Get migration status
CREATE OR REPLACE FUNCTION get_phase0_status()
RETURNS TABLE(
    metric TEXT,
    value TEXT
) AS $$
BEGIN
    RETURN QUERY SELECT 'Junction Table Items'::TEXT, COUNT(*)::TEXT FROM estimate_element_items;
    RETURN QUERY SELECT 'Detail Table Items'::TEXT, COUNT(*)::TEXT FROM estimate_detail_items;
    RETURN QUERY SELECT 'Orphaned Items'::TEXT, COUNT(*)::TEXT FROM estimate_detail_items WHERE library_item_id IS NULL;
    RETURN QUERY SELECT 'Library Items (Draft)'::TEXT, COUNT(*)::TEXT FROM library_items WHERE status = 'draft';
    RETURN QUERY SELECT 'Backup Exists'::TEXT, CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_detail_items_phase0_backup') THEN 'YES' ELSE 'NO' END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- USAGE EXAMPLES (COMMENTS)
-- =================================================================

/*
-- Create backup before migration:
SELECT create_phase0_backup();

-- Migrate orphaned items to library:
SELECT create_library_items_for_orphans();

-- Migrate detail items to junction table:
SELECT migrate_detail_items_to_junction();

-- Validate migration:
SELECT * FROM validate_phase0_migration();

-- Check status:
SELECT * FROM get_phase0_status();

-- Emergency rollback (USE WITH CAUTION):
SELECT rollback_phase0_migration();

-- Partial rollback for specific element:
SELECT rollback_element_items('your-element-id-here');

-- Clean up backups when confident:
SELECT cleanup_phase0_backups();
*/

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_phase0_backup() TO authenticated;
GRANT EXECUTE ON FUNCTION create_junction_backup() TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_phase0_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_element_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_detail_items_to_junction() TO authenticated;
GRANT EXECUTE ON FUNCTION create_library_items_for_orphans() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_phase0_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_phase0_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION get_phase0_status() TO authenticated;