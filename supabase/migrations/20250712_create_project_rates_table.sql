-- Create project_rates table for custom project-specific rates
CREATE TABLE IF NOT EXISTS project_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  materials JSONB DEFAULT '{}',
  labour JSONB DEFAULT '{}', 
  equipment JSONB DEFAULT '{}',
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure one active rate set per project
  CONSTRAINT unique_active_project_rate UNIQUE (project_id, effective_date)
);

-- Create indexes for performance
CREATE INDEX idx_project_rates_project_id ON project_rates(project_id);
CREATE INDEX idx_project_rates_effective_date ON project_rates(effective_date);

-- RLS policies
ALTER TABLE project_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view rates for projects they have access to
CREATE POLICY "Users can view project rates"
  ON project_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_rates.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Policy: Only project admins can insert/update rates
CREATE POLICY "Project admins can manage rates"
  ON project_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_rates.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER project_rates_updated_at
  BEFORE UPDATE ON project_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_project_rates_updated_at();

-- Comment on table
COMMENT ON TABLE project_rates IS 'Stores custom material, labour, and equipment rates for specific projects';