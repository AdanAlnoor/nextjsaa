-- Create usage tracking tables for library-estimate integration
BEGIN;

-- Create estimate_library_usage table for tracking library item usage
CREATE TABLE IF NOT EXISTS estimate_library_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    estimate_structure_id UUID REFERENCES estimate_structures(id) ON DELETE CASCADE,
    estimate_element_id UUID REFERENCES estimate_elements(id) ON DELETE CASCADE,
    estimate_detail_item_id UUID REFERENCES estimate_detail_items(id) ON DELETE CASCADE,
    library_item_id UUID REFERENCES library_items(id),
    -- Selection details
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    selected_by UUID REFERENCES auth.users(id),
    -- Quantity and rate information
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    rate_manual DECIMAL(10,2),
    rate_calculated DECIMAL(10,2),
    rate_used DECIMAL(10,2), -- The actual rate used (manual or calculated)
    -- Factor breakdown at time of selection
    factor_breakdown JSONB,
    material_cost DECIMAL(10,2),
    labour_cost DECIMAL(10,2),
    equipment_cost DECIMAL(10,2),
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create library_item_popularity table for analytics
CREATE TABLE IF NOT EXISTS library_item_popularity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_item_id UUID REFERENCES library_items(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_quantity_used DECIMAL(10,2) DEFAULT 0,
    average_quantity DECIMAL(10,2) DEFAULT 0,
    -- Breakdown by project type
    residential_usage_count INTEGER DEFAULT 0,
    commercial_usage_count INTEGER DEFAULT 0,
    industrial_usage_count INTEGER DEFAULT 0,
    -- Time-based analytics
    usage_this_month INTEGER DEFAULT 0,
    usage_this_quarter INTEGER DEFAULT 0,
    usage_this_year INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create estimate_hierarchy_templates table for saving common hierarchies
CREATE TABLE IF NOT EXISTS estimate_hierarchy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50), -- residential, commercial, industrial
    -- Hierarchy structure as JSON
    hierarchy_structure JSONB NOT NULL,
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_usage_project 
ON estimate_library_usage(project_id);

CREATE INDEX IF NOT EXISTS idx_library_usage_item 
ON estimate_library_usage(library_item_id);

CREATE INDEX IF NOT EXISTS idx_library_usage_date 
ON estimate_library_usage(selected_at);

CREATE INDEX IF NOT EXISTS idx_library_usage_user 
ON estimate_library_usage(selected_by);

CREATE INDEX IF NOT EXISTS idx_library_popularity_item 
ON library_item_popularity(library_item_id);

CREATE INDEX IF NOT EXISTS idx_library_popularity_usage 
ON library_item_popularity(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_hierarchy_templates_type 
ON estimate_hierarchy_templates(project_type);

CREATE INDEX IF NOT EXISTS idx_hierarchy_templates_public 
ON estimate_hierarchy_templates(is_public) WHERE is_public = true;

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_library_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_estimate_library_usage_updated_at
    BEFORE UPDATE ON estimate_library_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_library_usage_timestamp();

CREATE TRIGGER update_library_item_popularity_updated_at
    BEFORE UPDATE ON library_item_popularity
    FOR EACH ROW
    EXECUTE FUNCTION update_library_usage_timestamp();

CREATE TRIGGER update_estimate_hierarchy_templates_updated_at
    BEFORE UPDATE ON estimate_hierarchy_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_library_usage_timestamp();

-- Create function to update popularity stats
CREATE OR REPLACE FUNCTION update_library_item_popularity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert popularity record
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

-- Create trigger to update popularity on usage
CREATE TRIGGER track_library_item_popularity
    AFTER INSERT ON estimate_library_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_library_item_popularity();

-- Row Level Security
ALTER TABLE estimate_library_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_item_popularity ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_hierarchy_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimate_library_usage
CREATE POLICY "Users can view library usage for their projects" ON estimate_library_usage
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM auth.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert library usage for their projects" ON estimate_library_usage
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE company_id IN (
                SELECT company_id FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- RLS Policies for library_item_popularity (read-only for all authenticated users)
CREATE POLICY "All users can view library popularity" ON library_item_popularity
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for estimate_hierarchy_templates
CREATE POLICY "Users can view public templates" ON estimate_hierarchy_templates
    FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can manage their own templates" ON estimate_hierarchy_templates
    FOR ALL USING (created_by = auth.uid());

-- Grant permissions
GRANT SELECT ON estimate_library_usage TO authenticated;
GRANT INSERT ON estimate_library_usage TO authenticated;
GRANT SELECT ON library_item_popularity TO authenticated;
GRANT ALL ON estimate_hierarchy_templates TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE estimate_library_usage IS 'Tracks usage of library items in estimates for analytics and auditing';
COMMENT ON TABLE library_item_popularity IS 'Aggregated popularity statistics for library items';
COMMENT ON TABLE estimate_hierarchy_templates IS 'Reusable hierarchy templates created from library selections';

COMMIT;