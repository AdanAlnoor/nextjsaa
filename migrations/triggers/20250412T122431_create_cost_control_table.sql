-- Migrated from: create_cost_control_table.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Create cost control tables
CREATE TABLE IF NOT EXISTS cost_control_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cost_control_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bo_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
  external_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pending_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
  wages DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_parent BOOLEAN NOT NULL DEFAULT false,
  level INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  imported_from_estimate BOOLEAN DEFAULT false,
  import_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS cost_control_items_project_id_idx ON cost_control_items(project_id);
CREATE INDEX IF NOT EXISTS cost_control_items_parent_id_idx ON cost_control_items(parent_id);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cost_control_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cost_control_items_updated_at
BEFORE UPDATE ON cost_control_items
FOR EACH ROW
EXECUTE FUNCTION update_cost_control_items_updated_at();

-- Allow read access to authenticated users
ALTER TABLE cost_control_items ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY cost_control_items_select_policy ON cost_control_items 
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert access to authenticated users
CREATE POLICY cost_control_items_insert_policy ON cost_control_items 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow update access to authenticated users
CREATE POLICY cost_control_items_update_policy ON cost_control_items 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow delete access to authenticated users
CREATE POLICY cost_control_items_delete_policy ON cost_control_items 
FOR DELETE USING (auth.role() = 'authenticated'); 