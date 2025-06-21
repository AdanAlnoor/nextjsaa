-- Create costlines table
CREATE TABLE IF NOT EXISTS costlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS costlines_project_id_idx ON costlines(project_id);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_costlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_costlines_updated_at
BEFORE UPDATE ON costlines
FOR EACH ROW
EXECUTE FUNCTION update_costlines_updated_at(); 