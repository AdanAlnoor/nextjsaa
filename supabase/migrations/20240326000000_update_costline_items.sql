-- Add description column to cost_control_items table
ALTER TABLE cost_control_items
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update the view to show cost control items
CREATE OR REPLACE VIEW cost_control_items_view AS
SELECT 
    ci.*,
    p.name as project_name
FROM cost_control_items ci
LEFT JOIN projects p ON ci.project_id = p.id; 