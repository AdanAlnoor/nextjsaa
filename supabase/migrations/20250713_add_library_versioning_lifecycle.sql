-- =====================================================
-- Phase 2: Library Management Service Database Schema
-- Add versioning, lifecycle management, and audit trail
-- =====================================================

-- Create library item versions table for version control
CREATE TABLE IF NOT EXISTS library_item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  change_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(library_item_id, version_number)
);

-- Add lifecycle and management columns to library_items
ALTER TABLE library_items 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS actual_library_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS quick_add_metadata JSONB,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS library_item_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'restore', 'confirm', 'revert', 'clone'
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  version_before INTEGER,
  version_after INTEGER,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_item_versions_item_id ON library_item_versions(library_item_id);
CREATE INDEX IF NOT EXISTS idx_library_item_versions_version ON library_item_versions(library_item_id, version_number);
CREATE INDEX IF NOT EXISTS idx_library_items_status ON library_items(status);
CREATE INDEX IF NOT EXISTS idx_library_items_deleted_at ON library_items(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_library_items_confirmed_at ON library_items(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_library_items_version ON library_items(version);
CREATE INDEX IF NOT EXISTS idx_library_items_last_modified ON library_items(last_modified);
CREATE INDEX IF NOT EXISTS idx_audit_log_item_id ON library_item_audit_log(library_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON library_item_audit_log(performed_at);

-- Function to automatically increment version number on updates
CREATE OR REPLACE FUNCTION increment_library_item_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment version if actual content changed (not just timestamps)
  IF (OLD.name IS DISTINCT FROM NEW.name OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.unit IS DISTINCT FROM NEW.unit OR
      OLD.specifications IS DISTINCT FROM NEW.specifications OR
      OLD.wastagePercentage IS DISTINCT FROM NEW.wastagePercentage OR
      OLD.productivityNotes IS DISTINCT FROM NEW.productivityNotes OR
      OLD.status IS DISTINCT FROM NEW.status OR
      OLD.assembly_id IS DISTINCT FROM NEW.assembly_id OR
      OLD.isActive IS DISTINCT FROM NEW.isActive) THEN
    
    NEW.version = COALESCE(OLD.version, 0) + 1;
    NEW.last_modified = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic version increment
DROP TRIGGER IF EXISTS library_items_version_increment ON library_items;
CREATE TRIGGER library_items_version_increment
  BEFORE UPDATE ON library_items
  FOR EACH ROW
  EXECUTE FUNCTION increment_library_item_version();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_library_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  old_vals JSONB;
  new_vals JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type = 'create';
    old_vals = NULL;
    new_vals = to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type = 'update';
    old_vals = to_jsonb(OLD);
    new_vals = to_jsonb(NEW);
    
    -- More specific action types for status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN
        action_type = 'confirm';
      ELSIF NEW.status = 'actual' AND OLD.status = 'confirmed' THEN
        action_type = 'mark_actual';
      ELSIF NEW.status = 'draft' AND OLD.status IN ('confirmed', 'actual') THEN
        action_type = 'revert_to_draft';
      END IF;
    END IF;
    
    -- Check for soft delete
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      action_type = 'delete';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      action_type = 'restore';
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    action_type = 'hard_delete';
    old_vals = to_jsonb(OLD);
    new_vals = NULL;
  END IF;

  -- Insert audit log entry
  INSERT INTO library_item_audit_log (
    library_item_id,
    action,
    old_values,
    new_values,
    version_before,
    version_after,
    performed_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    action_type,
    old_vals,
    new_vals,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.version ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.version ELSE NULL END,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit log trigger
DROP TRIGGER IF EXISTS library_items_audit_log ON library_items;
CREATE TRIGGER library_items_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON library_items
  FOR EACH ROW
  EXECUTE FUNCTION create_library_audit_log();

-- Enhanced RLS policies for library_item_versions
ALTER TABLE library_item_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view version history for items they can access
CREATE POLICY "Users can view library item versions" ON library_item_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM library_items li 
      WHERE li.id = library_item_versions.library_item_id
        AND (
          li.status != 'draft' 
          OR li.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'super_admin', 'library_manager')
          )
        )
    )
  );

-- Policy: Only authenticated users can create versions (automatic via triggers)
CREATE POLICY "System can create library item versions" ON library_item_versions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enhanced RLS policies for audit log
ALTER TABLE library_item_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for items they can access
CREATE POLICY "Users can view audit logs" ON library_item_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM library_items li 
      WHERE li.id = library_item_audit_log.library_item_id
        AND (
          li.status != 'draft' 
          OR li.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'super_admin', 'library_manager')
          )
        )
    )
  );

-- Policy: System can create audit logs
CREATE POLICY "System can create audit logs" ON library_item_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enhanced library_items RLS policies for management
DROP POLICY IF EXISTS "Users can view library items" ON library_items;
CREATE POLICY "Users can view library items" ON library_items
  FOR SELECT
  USING (
    -- Show non-draft items to everyone
    status != 'draft'
    -- Show draft items to creator
    OR created_by = auth.uid()
    -- Show all items to library managers and admins
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'library_manager')
    )
    -- Show active items (hide soft-deleted unless admin)
    AND (
      deleted_at IS NULL
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'super_admin')
      )
    )
  );

-- Policy: Users can create draft items
DROP POLICY IF EXISTS "Users can create library items" ON library_items;
CREATE POLICY "Users can create library items" ON library_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'draft'
    AND created_by = auth.uid()
  );

-- Policy: Users can update items they created or have permission
DROP POLICY IF EXISTS "Users can update library items" ON library_items;
CREATE POLICY "Users can update library items" ON library_items
  FOR UPDATE
  USING (
    -- Can update own draft items
    (status = 'draft' AND created_by = auth.uid())
    -- Library managers can update confirmed items
    OR (
      status IN ('confirmed', 'actual') 
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('library_manager', 'admin', 'super_admin')
      )
    )
    -- Admins can update any item
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Only admins can hard delete items
DROP POLICY IF EXISTS "Only admins can delete library items" ON library_items;
CREATE POLICY "Only admins can delete library items" ON library_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Function to get enhanced item statistics (using junction table from Phase 0)
CREATE OR REPLACE FUNCTION get_library_item_statistics(p_item_id UUID)
RETURNS TABLE (
  usage_count BIGINT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  projects_used_in BIGINT,
  average_quantity NUMERIC,
  total_estimates BIGINT,
  last_modified_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(eei.*)::BIGINT as usage_count,
    MAX(eei.created_at) as last_used_at,
    COUNT(DISTINCT es.project_id)::BIGINT as projects_used_in,
    AVG(eei.quantity)::NUMERIC as average_quantity,
    COUNT(DISTINCT ee.estimate_id)::BIGINT as total_estimates,
    (SELECT li.last_modified FROM library_items li WHERE li.id = p_item_id) as last_modified_at
  FROM estimate_element_items eei
  JOIN estimate_elements ee ON eei.element_id = ee.id
  JOIN estimate_structures es ON ee.structure_id = es.id
  WHERE eei.library_item_id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old versions (keep last N versions)
CREATE OR REPLACE FUNCTION cleanup_old_library_versions(keep_versions INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  item_record RECORD;
BEGIN
  -- For each library item, keep only the latest N versions
  FOR item_record IN 
    SELECT library_item_id 
    FROM library_item_versions 
    GROUP BY library_item_id 
    HAVING COUNT(*) > keep_versions
  LOOP
    -- Delete older versions, keeping the latest ones
    DELETE FROM library_item_versions 
    WHERE library_item_id = item_record.library_item_id
      AND id NOT IN (
        SELECT id 
        FROM library_item_versions 
        WHERE library_item_id = item_record.library_item_id
        ORDER BY version_number DESC 
        LIMIT keep_versions
      );
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get item validation status
CREATE OR REPLACE FUNCTION get_library_item_validation(p_item_id UUID)
RETURNS TABLE (
  has_materials BOOLEAN,
  has_labor BOOLEAN,
  has_equipment BOOLEAN,
  is_complete BOOLEAN,
  missing_factors TEXT[],
  validation_errors TEXT[]
) AS $$
DECLARE
  item_record RECORD;
  errors TEXT[] := '{}';
  missing TEXT[] := '{}';
BEGIN
  -- Get the library item
  SELECT * INTO item_record FROM library_items WHERE id = p_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Library item not found';
  END IF;
  
  -- Check basic validations
  IF item_record.code IS NULL OR trim(item_record.code) = '' THEN
    errors := array_append(errors, 'Item code is required');
  END IF;
  
  IF item_record.name IS NULL OR trim(item_record.name) = '' THEN
    errors := array_append(errors, 'Item name is required');
  END IF;
  
  IF item_record.unit IS NULL OR trim(item_record.unit) = '' THEN
    errors := array_append(errors, 'Item unit is required');
  END IF;
  
  IF item_record.assembly_id IS NULL THEN
    errors := array_append(errors, 'Assembly assignment is required');
  END IF;
  
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM material_factors WHERE library_item_id = p_item_id) as has_materials,
    EXISTS(SELECT 1 FROM labor_factors WHERE library_item_id = p_item_id) as has_labor,
    EXISTS(SELECT 1 FROM equipment_factors WHERE library_item_id = p_item_id) as has_equipment,
    (
      EXISTS(SELECT 1 FROM material_factors WHERE library_item_id = p_item_id) OR
      EXISTS(SELECT 1 FROM labor_factors WHERE library_item_id = p_item_id) OR
      EXISTS(SELECT 1 FROM equipment_factors WHERE library_item_id = p_item_id)
    ) AND array_length(errors, 1) IS NULL as is_complete,
    CASE 
      WHEN NOT (
        EXISTS(SELECT 1 FROM material_factors WHERE library_item_id = p_item_id) OR
        EXISTS(SELECT 1 FROM labor_factors WHERE library_item_id = p_item_id) OR
        EXISTS(SELECT 1 FROM equipment_factors WHERE library_item_id = p_item_id)
      ) THEN ARRAY['At least one factor type required']
      ELSE '{}'::TEXT[]
    END as missing_factors,
    COALESCE(errors, '{}'::TEXT[]) as validation_errors;
END;
$$ LANGUAGE plpgsql;

-- Function to handle quick add from estimate
CREATE OR REPLACE FUNCTION quick_add_library_item(
  item_data JSONB,
  element_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_item_id UUID;
  assembly_id UUID;
BEGIN
  -- Determine assembly_id from hierarchy if not provided
  assembly_id := (item_data->>'assembly_id')::UUID;
  
  IF assembly_id IS NULL AND item_data->>'division_id' IS NOT NULL THEN
    -- Find first assembly in division
    SELECT a.id INTO assembly_id
    FROM assemblies a
    JOIN sections s ON a.section_id = s.id
    WHERE s.division_id = (item_data->>'division_id')::UUID
    LIMIT 1;
  END IF;
  
  IF assembly_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine assembly for quick add item';
  END IF;
  
  -- Create draft item
  INSERT INTO library_items (
    name, 
    unit, 
    assembly_id,
    description,
    productivityNotes,
    status,
    version,
    isActive,
    created_by,
    quick_add_metadata
  ) VALUES (
    item_data->>'name',
    item_data->>'unit',
    assembly_id,
    COALESCE(item_data->>'description', 'Quick-added from estimate'),
    'Created via quick-add from estimate. Requires review and factor assignment.',
    'draft',
    1,
    false,
    auth.uid(),
    item_data->'quick_add_context'
  ) RETURNING id INTO new_item_id;
  
  -- Auto-link to element if provided
  IF element_id IS NOT NULL THEN
    INSERT INTO estimate_element_items (
      element_id, 
      library_item_id, 
      quantity,
      quick_add
    ) VALUES (
      element_id, 
      new_item_id, 
      1,
      true
    );
  END IF;
  
  RETURN new_item_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for junction table relationships (Phase 0 integration)
CREATE INDEX IF NOT EXISTS idx_estimate_element_items_library_item ON estimate_element_items(library_item_id);
CREATE INDEX IF NOT EXISTS idx_estimate_element_items_element ON estimate_element_items(element_id);
CREATE INDEX IF NOT EXISTS idx_estimate_element_items_quick_add ON estimate_element_items(quick_add) WHERE quick_add = true;

-- Add quick_add column to estimate_element_items if it doesn't exist
ALTER TABLE estimate_element_items 
ADD COLUMN IF NOT EXISTS quick_add BOOLEAN DEFAULT false;

-- Update existing library_items to have proper version numbers if they don't
UPDATE library_items 
SET version = 1, last_modified = COALESCE(last_modified, createdAt, NOW())
WHERE version IS NULL;

-- Cleanup function for audit logs (keep last 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM library_item_audit_log
  WHERE performed_at < NOW() - INTERVAL '6 months';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to cleanup old data (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-library-versions', '0 2 * * 0', 'SELECT cleanup_old_library_versions(10);');
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * 0', 'SELECT cleanup_old_audit_logs();');

-- Refresh the updated_at timestamp for all existing items
UPDATE library_items 
SET last_modified = COALESCE(last_modified, updatedAt, createdAt, NOW())
WHERE last_modified IS NULL;

COMMENT ON TABLE library_item_versions IS 'Version control for library items - tracks all changes';
COMMENT ON TABLE library_item_audit_log IS 'Audit trail for all library item operations';
COMMENT ON FUNCTION get_library_item_statistics(UUID) IS 'Get usage statistics for a library item from junction table';
COMMENT ON FUNCTION cleanup_old_library_versions(INTEGER) IS 'Cleanup old versions keeping only latest N versions per item';
COMMENT ON FUNCTION get_library_item_validation(UUID) IS 'Validate library item readiness for status transitions';
COMMENT ON FUNCTION quick_add_library_item(JSONB, UUID) IS 'Quick add library item from estimate with auto-linking';