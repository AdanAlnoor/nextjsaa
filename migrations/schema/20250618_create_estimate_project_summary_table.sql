-- First check if bills table exists, if not create a basic structure
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bill_number VARCHAR(50) NOT NULL,
  supplier_id UUID,
  purchase_order_id UUID,
  name VARCHAR(255),
  bill_reference VARCHAR(100),
  description TEXT,
  notes TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) DEFAULT 0,
  issue_date DATE,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'Pending',
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for bills if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_bills_project_id ON bills(project_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Create estimate_project_summary table to store aggregated project data
CREATE TABLE IF NOT EXISTS estimate_project_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  structure_count INTEGER DEFAULT 0,
  element_count INTEGER DEFAULT 0,
  estimate_total DECIMAL(12, 2) DEFAULT 0,
  paid_bills_total DECIMAL(12, 2) DEFAULT 0,
  unpaid_bills_total DECIMAL(12, 2) DEFAULT 0,
  bills_difference DECIMAL(12, 2) DEFAULT 0,
  purchase_orders_total DECIMAL(12, 2) DEFAULT 0,
  wages_total DECIMAL(12, 2) DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_project_summary UNIQUE (project_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_estimate_project_summary_project_id ON estimate_project_summary(project_id);

-- Create function to refresh project summary
CREATE OR REPLACE FUNCTION refresh_project_summary(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_structure_count INTEGER;
  v_element_count INTEGER;
  v_estimate_total DECIMAL(12, 2);
  v_paid_bills_total DECIMAL(12, 2);
  v_unpaid_bills_total DECIMAL(12, 2);
BEGIN
  -- Count structures
  SELECT COUNT(*) INTO v_structure_count
  FROM estimate_structures
  WHERE project_id = p_project_id;

  -- Count elements
  SELECT COUNT(*) INTO v_element_count
  FROM estimate_elements
  WHERE project_id = p_project_id;

  -- Calculate estimate total (sum of all structures and unassigned elements)
  SELECT 
    COALESCE(SUM(amount), 0) INTO v_estimate_total
  FROM (
    -- All structures
    SELECT amount FROM estimate_structures WHERE project_id = p_project_id
    UNION ALL
    -- Unassigned elements (elements without structure_id)
    SELECT amount FROM estimate_elements WHERE project_id = p_project_id AND structure_id IS NULL
  ) totals;

  -- Calculate paid bills total
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_bills_total
  FROM bills
  WHERE project_id = p_project_id 
  AND (is_paid = true OR status = 'Paid');

  -- Calculate unpaid bills total
  SELECT COALESCE(SUM(amount), 0) INTO v_unpaid_bills_total
  FROM bills
  WHERE project_id = p_project_id 
  AND (is_paid = false OR status IN ('Pending', 'Partial'));

  -- Insert or update the summary
  INSERT INTO estimate_project_summary (
    project_id,
    structure_count,
    element_count,
    estimate_total,
    paid_bills_total,
    unpaid_bills_total,
    bills_difference,
    purchase_orders_total,
    wages_total,
    last_updated_at
  ) VALUES (
    p_project_id,
    v_structure_count,
    v_element_count,
    v_estimate_total,
    v_paid_bills_total,
    v_unpaid_bills_total,
    v_estimate_total - (v_paid_bills_total + v_unpaid_bills_total),
    0, -- purchase_orders_total - to be implemented
    0, -- wages_total - to be implemented
    NOW()
  )
  ON CONFLICT (project_id) DO UPDATE SET
    structure_count = EXCLUDED.structure_count,
    element_count = EXCLUDED.element_count,
    estimate_total = EXCLUDED.estimate_total,
    paid_bills_total = EXCLUDED.paid_bills_total,
    unpaid_bills_total = EXCLUDED.unpaid_bills_total,
    bills_difference = EXCLUDED.bills_difference,
    purchase_orders_total = EXCLUDED.purchase_orders_total,
    wages_total = EXCLUDED.wages_total,
    last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to populate all project summaries
CREATE OR REPLACE FUNCTION populate_all_project_summaries()
RETURNS TEXT AS $$
DECLARE
  v_project_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Loop through all projects and refresh their summaries
  FOR v_project_id IN SELECT id FROM projects
  LOOP
    PERFORM refresh_project_summary(v_project_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN 'Populated summaries for ' || v_count || ' projects';
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update summary when related data changes

-- Trigger for estimate_structures changes
CREATE OR REPLACE FUNCTION update_summary_on_structure_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update summary for the affected project
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_project_summary(OLD.project_id);
  ELSE
    PERFORM refresh_project_summary(NEW.project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_summary_on_structure_change
AFTER INSERT OR UPDATE OR DELETE ON estimate_structures
FOR EACH ROW EXECUTE FUNCTION update_summary_on_structure_change();

-- Trigger for estimate_elements changes
CREATE OR REPLACE FUNCTION update_summary_on_element_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update summary for the affected project
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_project_summary(OLD.project_id);
  ELSE
    PERFORM refresh_project_summary(NEW.project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_summary_on_element_change
AFTER INSERT OR UPDATE OR DELETE ON estimate_elements
FOR EACH ROW EXECUTE FUNCTION update_summary_on_element_change();

-- Trigger for bills changes
CREATE OR REPLACE FUNCTION update_summary_on_bills_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update summary for the affected project
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_project_summary(OLD.project_id);
  ELSE
    PERFORM refresh_project_summary(NEW.project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_summary_on_bills_change
AFTER INSERT OR UPDATE OR DELETE ON bills
FOR EACH ROW EXECUTE FUNCTION update_summary_on_bills_change();

-- Populate initial data for all existing projects
SELECT populate_all_project_summaries();