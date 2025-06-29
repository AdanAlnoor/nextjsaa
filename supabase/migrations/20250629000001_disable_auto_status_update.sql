-- Migration: Disable automatic status updates when factors are added
-- Description: Modify triggers to only update validation fields, not automatically change status from draft to complete
-- Date: 2025-06-29

BEGIN;

-- Update the validation function to NOT automatically change status
CREATE OR REPLACE FUNCTION update_item_validation()
RETURNS TRIGGER AS $$
DECLARE
    item_id UUID;
    mat_count INTEGER;
    lab_count INTEGER;
    eq_count INTEGER;
    total_factors INTEGER;
    missing_factors_array TEXT[];
BEGIN
    -- Get the library item ID based on the trigger table
    IF TG_TABLE_NAME = 'material_factors' THEN
        item_id := COALESCE(NEW.library_item_id, OLD.library_item_id);
    ELSIF TG_TABLE_NAME = 'labor_factors' THEN
        item_id := COALESCE(NEW.library_item_id, OLD.library_item_id);
    ELSIF TG_TABLE_NAME = 'equipment_factors' THEN
        item_id := COALESCE(NEW.library_item_id, OLD.library_item_id);
    END IF;
    
    -- Count factors for this item
    SELECT COUNT(*) INTO mat_count FROM material_factors WHERE library_item_id = item_id;
    SELECT COUNT(*) INTO lab_count FROM labor_factors WHERE library_item_id = item_id;
    SELECT COUNT(*) INTO eq_count FROM equipment_factors WHERE library_item_id = item_id;
    
    total_factors := mat_count + lab_count + eq_count;
    
    -- Determine missing factors (flexible - not all items need all types)
    missing_factors_array := ARRAY[]::TEXT[];
    -- Note: We don't enforce specific factor requirements as items can be valid with any combination
    
    -- Update validation fields ONLY - do NOT automatically change status
    UPDATE library_items SET
        has_materials = (mat_count > 0),
        has_labor = (lab_count > 0),
        has_equipment = (eq_count > 0),
        is_complete = (total_factors > 0),
        missing_factors = missing_factors_array,
        last_validated = NOW(),
        -- REMOVED: Automatic status changes
        -- Users must manually mark items as complete after reviewing factors
        last_modified = NOW()
    WHERE id = item_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add new function to manually mark items as complete
CREATE OR REPLACE FUNCTION mark_library_item_complete(
    p_library_item_id UUID,
    p_marked_by VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    item_status VARCHAR(20);
    factor_count INTEGER;
BEGIN
    -- Check current status and factor count
    SELECT status INTO item_status FROM library_items WHERE id = p_library_item_id;
    
    IF item_status IS NULL THEN
        RAISE EXCEPTION 'Library item not found';
    END IF;
    
    IF item_status != 'draft' THEN
        RAISE EXCEPTION 'Item must be in draft status to mark as complete (current: %)', item_status;
    END IF;
    
    -- Check if item has factors
    SELECT 
        (SELECT COUNT(*) FROM material_factors WHERE library_item_id = p_library_item_id) +
        (SELECT COUNT(*) FROM labor_factors WHERE library_item_id = p_library_item_id) +
        (SELECT COUNT(*) FROM equipment_factors WHERE library_item_id = p_library_item_id)
    INTO factor_count;
    
    IF factor_count = 0 THEN
        RAISE EXCEPTION 'Cannot mark item as complete without any factors';
    END IF;
    
    -- Update item to complete status
    UPDATE library_items SET
        status = 'complete',
        last_modified = NOW()
    WHERE id = p_library_item_id;
    
    -- Track mark as complete usage
    PERFORM track_library_item_usage(
        p_library_item_id,
        p_marked_by,
        NULL,
        'mark_complete',
        jsonb_build_object('marked_complete_at', NOW())
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Manual Factor Confirmation: Migration completed successfully';
  RAISE NOTICE 'Automatic status updates disabled - users must manually mark items as complete';
  RAISE NOTICE 'New function: mark_library_item_complete() added for manual workflow';
END $$;