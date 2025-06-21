-- Function to sync estimate data to cost control items
CREATE OR REPLACE FUNCTION sync_estimate_to_cost_control(project_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  sync_count INTEGER := 0;
  estimate_rec RECORD;
BEGIN
  -- First, mark existing cost control items that aren't in the estimate anymore
  UPDATE cost_control_items 
  SET is_deleted = TRUE
  WHERE project_id = project_id_param
    AND NOT EXISTS (
      SELECT 1 FROM estimate_items 
      WHERE estimate_items.id = cost_control_items.estimate_item_id
    )
    AND estimate_item_id IS NOT NULL;

  -- Process each estimate item
  FOR estimate_rec IN 
    SELECT 
      id, 
      project_id, 
      parent_id, 
      name, 
      total_amount, 
      level, 
      is_completed 
    FROM estimate_items
    WHERE project_id = project_id_param
  LOOP
    -- Check if cost control item exists for this estimate item
    IF EXISTS (
      SELECT 1 FROM cost_control_items 
      WHERE estimate_item_id = estimate_rec.id
    ) THEN
      -- Update existing cost control item
      UPDATE cost_control_items
      SET 
        name = estimate_rec.name,
        bo_amount = estimate_rec.total_amount,
        level = estimate_rec.level,
        parent_id = estimate_rec.parent_id,
        is_completed = estimate_rec.is_completed,
        is_deleted = FALSE,
        updated_at = NOW()
      WHERE estimate_item_id = estimate_rec.id;
    ELSE
      -- Insert new cost control item
      INSERT INTO cost_control_items (
        project_id,
        estimate_item_id,
        name,
        bo_amount,
        level,
        parent_id,
        is_completed,
        is_parent,
        actual_amount,
        paid_bills,
        external_bills,
        pending_bills,
        wages,
        is_deleted,
        created_at,
        updated_at
      ) VALUES (
        estimate_rec.project_id,
        estimate_rec.id,
        estimate_rec.name,
        estimate_rec.total_amount,
        estimate_rec.level,
        estimate_rec.parent_id,
        estimate_rec.is_completed,
        estimate_rec.parent_id IS NULL, -- is_parent is true if it's a top-level item
        0, -- Default actual_amount
        0, -- Default paid_bills
        0, -- Default external_bills
        0, -- Default pending_bills
        0, -- Default wages
        FALSE, -- Not deleted
        NOW(),
        NOW()
      );
    END IF;
    
    sync_count := sync_count + 1;
  END LOOP;
  
  RETURN sync_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically sync when estimate items change
CREATE OR REPLACE FUNCTION trigger_sync_estimate_to_cost_control()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if it's an estimate item
  PERFORM sync_estimate_to_cost_control(NEW.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on estimate_items table
DROP TRIGGER IF EXISTS estimate_items_sync_trigger ON estimate_items;
CREATE TRIGGER estimate_items_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON estimate_items
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_estimate_to_cost_control(); 