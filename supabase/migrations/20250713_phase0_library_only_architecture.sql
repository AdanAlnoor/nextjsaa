-- Phase 0: Library-Only Items Architecture Migration
-- Creates junction table approach as specified in Phase 0 documentation

-- 1. Create the junction table linking elements to library items
CREATE TABLE estimate_element_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID NOT NULL REFERENCES estimate_elements(id) ON DELETE CASCADE,
    library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE RESTRICT,
    
    -- User inputs
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    
    -- Rate handling (as per Phase 0 spec)
    rate_manual DECIMAL(15,4),          -- User can override by typing a value
    rate_calculated DECIMAL(15,4),      -- Automatically computed from library factors
    rate_override DECIMAL(15,4),        -- Project-specific rate override
    
    -- Display and ordering
    order_index INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure no duplicate items per element
    UNIQUE(element_id, library_item_id)
);

-- 2. Create indexes for performance
CREATE INDEX idx_estimate_element_items_element_id ON estimate_element_items(element_id);
CREATE INDEX idx_estimate_element_items_library_item_id ON estimate_element_items(library_item_id);
CREATE INDEX idx_estimate_element_items_order ON estimate_element_items(element_id, order_index);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_estimate_element_items_updated_at 
    BEFORE UPDATE ON estimate_element_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create display view for estimate items with all required columns (as per Phase 0 spec)
CREATE OR REPLACE VIEW estimate_items_display AS
SELECT 
    eei.id,
    eei.element_id,
    ee.name as element_name,
    es.name as structure_name,
    
    -- Library hierarchy display (4 levels)
    CONCAT(li.code, ' - ', li.name) as description,
    li.code as library_code,
    li.name as library_name,
    
    -- User inputs
    eei.quantity,
    li.unit,
    
    -- Rate columns
    eei.rate_manual,          -- User can manually enter
    eei.rate_calculated,      -- System calculated from factors
    eei.rate_override,        -- Project-specific override
    
    -- Amount columns
    (eei.quantity * COALESCE(eei.rate_manual, 0)) as amount_manual,
    (eei.quantity * COALESCE(eei.rate_calculated, 0)) as amount_calculated,
    (eei.quantity * COALESCE(eei.rate_override, 0)) as amount_override,
    
    -- Effective rate/amount (use manual if provided, then override, then calculated)
    COALESCE(eei.rate_manual, eei.rate_override, eei.rate_calculated) as rate_effective,
    (eei.quantity * COALESCE(eei.rate_manual, eei.rate_override, eei.rate_calculated, 0)) as amount_effective,
    
    -- Metadata
    eei.order_index,
    li.status as library_status,
    li.assembly_id,
    a.section_id,
    s.division_id,
    
    -- Hierarchy paths for display
    d.name as division_name,
    s.name as section_name,
    a.name as assembly_name,
    
    -- Timestamps
    eei.created_at,
    eei.updated_at
    
FROM estimate_element_items eei
JOIN library_items li ON eei.library_item_id = li.id
JOIN estimate_elements ee ON eei.element_id = ee.id
JOIN estimate_structures es ON ee.structure_id = es.id
LEFT JOIN assemblies a ON li.assembly_id = a.id
LEFT JOIN sections s ON a.section_id = s.id
LEFT JOIN divisions d ON s.division_id = d.id
ORDER BY es.order_index, ee.order_index, eei.order_index;

-- 5. Enable RLS
ALTER TABLE estimate_element_items ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (basic - can be enhanced later)
CREATE POLICY "Users can view their project estimate items" ON estimate_element_items
    FOR SELECT USING (
        element_id IN (
            SELECT ee.id FROM estimate_elements ee
            JOIN estimate_structures es ON ee.structure_id = es.id
            WHERE es.project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert estimate items for their projects" ON estimate_element_items
    FOR INSERT WITH CHECK (
        element_id IN (
            SELECT ee.id FROM estimate_elements ee
            JOIN estimate_structures es ON ee.structure_id = es.id
            WHERE es.project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update estimate items for their projects" ON estimate_element_items
    FOR UPDATE USING (
        element_id IN (
            SELECT ee.id FROM estimate_elements ee
            JOIN estimate_structures es ON ee.structure_id = es.id
            WHERE es.project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete estimate items for their projects" ON estimate_element_items
    FOR DELETE USING (
        element_id IN (
            SELECT ee.id FROM estimate_elements ee
            JOIN estimate_structures es ON ee.structure_id = es.id
            WHERE es.project_id IN (
                SELECT project_id FROM project_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- 7. Grant permissions
GRANT ALL ON estimate_element_items TO authenticated;
GRANT SELECT ON estimate_items_display TO authenticated;

-- 8. Comment the table
COMMENT ON TABLE estimate_element_items IS 'Junction table linking estimate elements to library items - Phase 0 architecture';
COMMENT ON COLUMN estimate_element_items.rate_manual IS 'User can override by typing a value';
COMMENT ON COLUMN estimate_element_items.rate_calculated IS 'Automatically computed from library factors + project rates + adjustments';
COMMENT ON COLUMN estimate_element_items.rate_override IS 'Project-specific rate override';