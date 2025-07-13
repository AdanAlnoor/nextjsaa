-- Combined Library Integration Migration
-- This migration adds all necessary columns, views, and tables for library-estimate integration

BEGIN;

-- ============================================
-- PART 1: Add library reference columns
-- ============================================

-- Add library reference columns to estimate_elements (if they don't exist)
DO $$ 
BEGIN
    -- Check and add columns one by one to avoid errors if some already exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'library_division_id') THEN
        ALTER TABLE estimate_elements ADD COLUMN library_division_id UUID REFERENCES divisions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'library_section_id') THEN
        ALTER TABLE estimate_elements ADD COLUMN library_section_id UUID REFERENCES sections(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'library_assembly_id') THEN
        ALTER TABLE estimate_elements ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'hierarchy_level') THEN
        ALTER TABLE estimate_elements ADD COLUMN hierarchy_level INTEGER CHECK (hierarchy_level BETWEEN 0 AND 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'parent_element_id') THEN
        ALTER TABLE estimate_elements ADD COLUMN parent_element_id UUID REFERENCES estimate_elements(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'library_code') THEN
        ALTER TABLE estimate_elements ADD COLUMN library_code VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'library_path') THEN
        ALTER TABLE estimate_elements ADD COLUMN library_path TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_elements' AND column_name = 'is_from_library') THEN
        ALTER TABLE estimate_elements ADD COLUMN is_from_library BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add library reference columns to estimate_detail_items (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'library_item_id') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN library_item_id UUID REFERENCES library_items(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'library_division_id') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN library_division_id UUID REFERENCES divisions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'library_section_id') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN library_section_id UUID REFERENCES sections(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'library_assembly_id') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'library_code') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN library_code VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'library_path') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN library_path TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'factor_breakdown') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN factor_breakdown JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'is_from_library') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN is_from_library BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'rate_manual') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN rate_manual DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_detail_items' AND column_name = 'rate_calculated') THEN
        ALTER TABLE estimate_detail_items ADD COLUMN rate_calculated DECIMAL(10,2);
    END IF;
END $$;

-- ============================================
-- PART 2: Create indexes
-- ============================================

-- Create indexes only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimate_elements_library_refs') THEN
        CREATE INDEX idx_estimate_elements_library_refs ON estimate_elements(library_division_id, library_section_id, library_assembly_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimate_detail_items_library_refs') THEN
        CREATE INDEX idx_estimate_detail_items_library_refs ON estimate_detail_items(library_item_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimate_hierarchy') THEN
        CREATE INDEX idx_estimate_hierarchy ON estimate_elements(parent_element_id, hierarchy_level);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimate_elements_library_flag') THEN
        CREATE INDEX idx_estimate_elements_library_flag ON estimate_elements(is_from_library) WHERE is_from_library = true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_estimate_detail_items_library_flag') THEN
        CREATE INDEX idx_estimate_detail_items_library_flag ON estimate_detail_items(is_from_library) WHERE is_from_library = true;
    END IF;
END $$;

-- ============================================
-- PART 3: Create schedule views
-- ============================================

-- Material Schedule View
CREATE OR REPLACE VIEW estimate_material_schedule AS
WITH material_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    mc.id as material_id,
    mc.code as material_code,
    mc.name as material_name,
    mc.unit as material_unit,
    mc.category as material_category,
    mc.rate as unit_rate_market,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(mf.quantity_per_unit, 0) * 
      (1 + COALESCE(mf.wastage_percentage, 0)/100)
    ) as total_quantity_with_wastage,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(mf.quantity_per_unit, 0)
    ) as base_quantity,
    AVG(COALESCE(mf.wastage_percentage, 0)) as avg_wastage_percentage,
    ARRAY_AGG(DISTINCT 
      CONCAT(
        COALESCE(ed.library_code, ''), 
        ' - ', 
        LEFT(ed.name, 50)
      ) ORDER BY ed.library_code
    ) as source_items,
    COUNT(DISTINCT ed.id) as source_item_count
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN material_factors mf ON mf.library_item_id = li.id
  LEFT JOIN materials_catalogue mc ON mf.material_catalogue_id = mc.id
  WHERE ed.is_from_library = true
    AND mc.id IS NOT NULL
  GROUP BY p.id, p.name, mc.id, mc.code, mc.name, mc.unit, mc.category, mc.rate
)
SELECT 
  project_id,
  project_name,
  material_id,
  material_code,
  material_name,
  material_unit,
  material_category,
  base_quantity,
  1 + (avg_wastage_percentage / 100) as wastage_factor,
  total_quantity_with_wastage,
  unit_rate_market,
  unit_rate_market * total_quantity_with_wastage as total_amount_market,
  source_items,
  source_item_count,
  CURRENT_TIMESTAMP as calculated_at
FROM material_aggregation
WHERE total_quantity_with_wastage > 0
ORDER BY material_category, material_name;

-- Labour Schedule View
CREATE OR REPLACE VIEW estimate_labour_schedule AS
WITH labour_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    lc.id as labour_id,
    lc.code as labour_code,
    lc.name as labour_name,
    lc.trade as labour_trade,
    lc.skill_level,
    lc.hourly_rate as rate_standard,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(lf.hours_per_unit, 0)
    ) as total_hours_raw,
    AVG(COALESCE(lf.productivity_factor, 1.0)) as avg_productivity_factor,
    ARRAY_AGG(DISTINCT 
      CONCAT(
        COALESCE(ed.library_code, ''), 
        ' - ', 
        LEFT(ed.name, 50)
      ) ORDER BY ed.library_code
    ) as source_items,
    COUNT(DISTINCT ed.id) as source_item_count
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN labour_factors lf ON lf.library_item_id = li.id
  LEFT JOIN labour_catalogue lc ON lf.labour_catalogue_id = lc.id
  WHERE ed.is_from_library = true
    AND lc.id IS NOT NULL
  GROUP BY p.id, p.name, lc.id, lc.code, lc.name, lc.trade, lc.skill_level, lc.hourly_rate
)
SELECT 
  project_id,
  project_name,
  labour_id,
  labour_code,
  labour_name,
  labour_trade,
  skill_level,
  total_hours_raw,
  avg_productivity_factor as productivity_factor,
  total_hours_raw / NULLIF(avg_productivity_factor, 0) as adjusted_hours,
  rate_standard,
  (total_hours_raw / NULLIF(avg_productivity_factor, 0)) * rate_standard as total_amount_standard,
  CEIL((total_hours_raw / NULLIF(avg_productivity_factor, 0)) / 8) as total_days,
  source_items,
  source_item_count,
  CURRENT_TIMESTAMP as calculated_at
FROM labour_aggregation
WHERE total_hours_raw > 0
ORDER BY labour_trade, skill_level DESC, labour_name;

-- Equipment Schedule View
CREATE OR REPLACE VIEW estimate_equipment_schedule AS
WITH equipment_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    ec.id as equipment_id,
    ec.code as equipment_code,
    ec.name as equipment_name,
    ec.category as equipment_category,
    ec.capacity,
    ec.hourly_rate as rate_rental,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(ef.hours_per_unit, 0)
    ) as total_hours_raw,
    AVG(COALESCE(ef.utilization_factor, 0.75)) as avg_utilization_factor,
    ARRAY_AGG(DISTINCT 
      CONCAT(
        COALESCE(ed.library_code, ''), 
        ' - ', 
        LEFT(ed.name, 50)
      ) ORDER BY ed.library_code
    ) as source_items,
    COUNT(DISTINCT ed.id) as source_item_count
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN equipment_factors ef ON ef.library_item_id = li.id
  LEFT JOIN equipment_catalogue ec ON ef.equipment_catalogue_id = ec.id
  WHERE ed.is_from_library = true
    AND ec.id IS NOT NULL
  GROUP BY p.id, p.name, ec.id, ec.code, ec.name, ec.category, ec.capacity, ec.hourly_rate
)
SELECT 
  project_id,
  project_name,
  equipment_id,
  equipment_code,
  equipment_name,
  equipment_category,
  capacity,
  total_hours_raw as base_hours,
  avg_utilization_factor as utilization_factor,
  total_hours_raw / NULLIF(avg_utilization_factor, 0) as billable_hours,
  rate_rental,
  (total_hours_raw / NULLIF(avg_utilization_factor, 0)) * rate_rental as total_amount_rental,
  CEIL((total_hours_raw / NULLIF(avg_utilization_factor, 0)) / 8) as total_days,
  source_items,
  source_item_count,
  CURRENT_TIMESTAMP as calculated_at
FROM equipment_aggregation
WHERE total_hours_raw > 0
ORDER BY equipment_category, equipment_name;

-- ============================================
-- PART 4: Create usage tracking tables
-- ============================================

-- Create estimate_library_usage table
CREATE TABLE IF NOT EXISTS estimate_library_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    estimate_structure_id UUID REFERENCES estimate_structures(id) ON DELETE CASCADE,
    estimate_element_id UUID REFERENCES estimate_elements(id) ON DELETE CASCADE,
    estimate_detail_item_id UUID REFERENCES estimate_detail_items(id) ON DELETE CASCADE,
    library_item_id UUID REFERENCES library_items(id),
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    selected_by UUID REFERENCES auth.users(id),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    rate_manual DECIMAL(10,2),
    rate_calculated DECIMAL(10,2),
    rate_used DECIMAL(10,2),
    factor_breakdown JSONB,
    material_cost DECIMAL(10,2),
    labour_cost DECIMAL(10,2),
    equipment_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create library_item_popularity table
CREATE TABLE IF NOT EXISTS library_item_popularity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_item_id UUID REFERENCES library_items(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_quantity_used DECIMAL(10,2) DEFAULT 0,
    average_quantity DECIMAL(10,2) DEFAULT 0,
    residential_usage_count INTEGER DEFAULT 0,
    commercial_usage_count INTEGER DEFAULT 0,
    industrial_usage_count INTEGER DEFAULT 0,
    usage_this_month INTEGER DEFAULT 0,
    usage_this_quarter INTEGER DEFAULT 0,
    usage_this_year INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create estimate_hierarchy_templates table
CREATE TABLE IF NOT EXISTS estimate_hierarchy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50),
    hierarchy_structure JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create additional indexes for usage tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_library_usage_project') THEN
        CREATE INDEX idx_library_usage_project ON estimate_library_usage(project_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_library_usage_item') THEN
        CREATE INDEX idx_library_usage_item ON estimate_library_usage(library_item_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_library_usage_date') THEN
        CREATE INDEX idx_library_usage_date ON estimate_library_usage(selected_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_library_usage_user') THEN
        CREATE INDEX idx_library_usage_user ON estimate_library_usage(selected_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_library_popularity_item') THEN
        CREATE INDEX idx_library_popularity_item ON library_item_popularity(library_item_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_library_popularity_usage') THEN
        CREATE INDEX idx_library_popularity_usage ON library_item_popularity(usage_count DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hierarchy_templates_type') THEN
        CREATE INDEX idx_hierarchy_templates_type ON estimate_hierarchy_templates(project_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_hierarchy_templates_public') THEN
        CREATE INDEX idx_hierarchy_templates_public ON estimate_hierarchy_templates(is_public) WHERE is_public = true;
    END IF;
END $$;

-- ============================================
-- PART 5: Create triggers and functions
-- ============================================

-- Create or replace update timestamp function
CREATE OR REPLACE FUNCTION update_library_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_estimate_library_usage_updated_at') THEN
        CREATE TRIGGER update_estimate_library_usage_updated_at
            BEFORE UPDATE ON estimate_library_usage
            FOR EACH ROW
            EXECUTE FUNCTION update_library_usage_timestamp();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_library_item_popularity_updated_at') THEN
        CREATE TRIGGER update_library_item_popularity_updated_at
            BEFORE UPDATE ON library_item_popularity
            FOR EACH ROW
            EXECUTE FUNCTION update_library_usage_timestamp();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_estimate_hierarchy_templates_updated_at') THEN
        CREATE TRIGGER update_estimate_hierarchy_templates_updated_at
            BEFORE UPDATE ON estimate_hierarchy_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_library_usage_timestamp();
    END IF;
END $$;

-- Create popularity tracking function
CREATE OR REPLACE FUNCTION update_library_item_popularity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO library_item_popularity (
        library_item_id,
        usage_count,
        last_used_at,
        total_quantity_used,
        usage_this_month,
        usage_this_quarter,
        usage_this_year
    )
    VALUES (
        NEW.library_item_id,
        1,
        NEW.selected_at,
        NEW.quantity,
        1,
        1,
        1
    )
    ON CONFLICT (library_item_id) DO UPDATE SET
        usage_count = library_item_popularity.usage_count + 1,
        last_used_at = NEW.selected_at,
        total_quantity_used = library_item_popularity.total_quantity_used + NEW.quantity,
        average_quantity = (library_item_popularity.total_quantity_used + NEW.quantity) / (library_item_popularity.usage_count + 1),
        usage_this_month = CASE 
            WHEN DATE_TRUNC('month', library_item_popularity.updated_at) = DATE_TRUNC('month', CURRENT_DATE) 
            THEN library_item_popularity.usage_this_month + 1 
            ELSE 1 
        END,
        usage_this_quarter = CASE 
            WHEN DATE_TRUNC('quarter', library_item_popularity.updated_at) = DATE_TRUNC('quarter', CURRENT_DATE) 
            THEN library_item_popularity.usage_this_quarter + 1 
            ELSE 1 
        END,
        usage_this_year = CASE 
            WHEN DATE_TRUNC('year', library_item_popularity.updated_at) = DATE_TRUNC('year', CURRENT_DATE) 
            THEN library_item_popularity.usage_this_year + 1 
            ELSE 1 
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for popularity tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'track_library_item_popularity') THEN
        CREATE TRIGGER track_library_item_popularity
            AFTER INSERT ON estimate_library_usage
            FOR EACH ROW
            EXECUTE FUNCTION update_library_item_popularity();
    END IF;
END $$;

-- ============================================
-- PART 6: Set up RLS policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE estimate_library_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_item_popularity ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_hierarchy_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view library usage for their projects" ON estimate_library_usage;
CREATE POLICY "Users can view library usage for their projects" ON estimate_library_usage
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM auth.users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert library usage for their projects" ON estimate_library_usage;
CREATE POLICY "Users can insert library usage for their projects" ON estimate_library_usage
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM auth.users WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "All users can view library popularity" ON library_item_popularity;
CREATE POLICY "All users can view library popularity" ON library_item_popularity
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view public templates" ON estimate_hierarchy_templates;
CREATE POLICY "Users can view public templates" ON estimate_hierarchy_templates
    FOR SELECT USING (is_public = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own templates" ON estimate_hierarchy_templates;
CREATE POLICY "Users can manage their own templates" ON estimate_hierarchy_templates
    FOR ALL USING (created_by = auth.uid());

-- ============================================
-- PART 7: Grant permissions
-- ============================================

-- Grant permissions on views
GRANT SELECT ON estimate_material_schedule TO authenticated;
GRANT SELECT ON estimate_labour_schedule TO authenticated;
GRANT SELECT ON estimate_equipment_schedule TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT ON estimate_library_usage TO authenticated;
GRANT SELECT ON library_item_popularity TO authenticated;
GRANT ALL ON estimate_hierarchy_templates TO authenticated;

-- ============================================
-- PART 8: Add comments for documentation
-- ============================================

-- Comments on columns
COMMENT ON COLUMN estimate_elements.library_division_id IS 'Reference to library division (Level 1)';
COMMENT ON COLUMN estimate_elements.library_section_id IS 'Reference to library section (Level 2)';
COMMENT ON COLUMN estimate_elements.library_assembly_id IS 'Reference to library assembly (Level 3)';
COMMENT ON COLUMN estimate_elements.hierarchy_level IS 'Hierarchy level in estimate structure (0-5)';
COMMENT ON COLUMN estimate_elements.library_code IS 'Library code for quick reference';
COMMENT ON COLUMN estimate_elements.library_path IS 'Full library path (e.g., 03.10.10)';
COMMENT ON COLUMN estimate_elements.is_from_library IS 'Flag indicating if element was created from library';

COMMENT ON COLUMN estimate_detail_items.library_item_id IS 'Reference to library item (Level 4)';
COMMENT ON COLUMN estimate_detail_items.factor_breakdown IS 'JSON breakdown of material, labour, and equipment factors';
COMMENT ON COLUMN estimate_detail_items.rate_manual IS 'Manually entered rate';
COMMENT ON COLUMN estimate_detail_items.rate_calculated IS 'Rate calculated from library factors';

-- Comments on views
COMMENT ON VIEW estimate_material_schedule IS 'Aggregated material requirements from all library-based estimate items';
COMMENT ON VIEW estimate_labour_schedule IS 'Aggregated labour requirements from all library-based estimate items';
COMMENT ON VIEW estimate_equipment_schedule IS 'Aggregated equipment requirements from all library-based estimate items';

-- Comments on tables
COMMENT ON TABLE estimate_library_usage IS 'Tracks usage of library items in estimates for analytics and auditing';
COMMENT ON TABLE library_item_popularity IS 'Aggregated popularity statistics for library items';
COMMENT ON TABLE estimate_hierarchy_templates IS 'Reusable hierarchy templates created from library selections';

COMMIT;