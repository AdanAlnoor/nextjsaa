-- Add library reference columns to estimate tables for library integration
BEGIN;

-- Add library reference columns to estimate_elements
ALTER TABLE estimate_elements 
ADD COLUMN IF NOT EXISTS library_division_id UUID REFERENCES divisions(id),
ADD COLUMN IF NOT EXISTS library_section_id UUID REFERENCES sections(id),
ADD COLUMN IF NOT EXISTS library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER CHECK (hierarchy_level BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS parent_element_id UUID REFERENCES estimate_elements(id),
ADD COLUMN IF NOT EXISTS library_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS library_path TEXT,
ADD COLUMN IF NOT EXISTS is_from_library BOOLEAN DEFAULT false;

-- Add library reference columns to estimate_detail_items
ALTER TABLE estimate_detail_items 
ADD COLUMN IF NOT EXISTS library_item_id UUID REFERENCES library_items(id),
ADD COLUMN IF NOT EXISTS library_division_id UUID REFERENCES divisions(id),
ADD COLUMN IF NOT EXISTS library_section_id UUID REFERENCES sections(id),
ADD COLUMN IF NOT EXISTS library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN IF NOT EXISTS library_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS library_path TEXT,
ADD COLUMN IF NOT EXISTS factor_breakdown JSONB,
ADD COLUMN IF NOT EXISTS is_from_library BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rate_manual DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rate_calculated DECIMAL(10,2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_elements_library_refs 
ON estimate_elements(library_division_id, library_section_id, library_assembly_id);

CREATE INDEX IF NOT EXISTS idx_estimate_detail_items_library_refs 
ON estimate_detail_items(library_item_id);

CREATE INDEX IF NOT EXISTS idx_estimate_hierarchy 
ON estimate_elements(parent_element_id, hierarchy_level);

CREATE INDEX IF NOT EXISTS idx_estimate_elements_library_flag 
ON estimate_elements(is_from_library) WHERE is_from_library = true;

CREATE INDEX IF NOT EXISTS idx_estimate_detail_items_library_flag 
ON estimate_detail_items(is_from_library) WHERE is_from_library = true;

-- Add comments for documentation
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

COMMIT;