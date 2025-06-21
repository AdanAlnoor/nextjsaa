-- URGENT: Run this SQL in Supabase Dashboard to fix 404 errors
-- This creates the missing estimate_project_summary table

-- First, ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the estimate_project_summary table
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

-- Create or replace the refresh function
CREATE OR REPLACE FUNCTION refresh_project_summary(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_structure_count INTEGER;
  v_element_count INTEGER;
  v_estimate_total DECIMAL(12, 2);
  v_paid_bills_total DECIMAL(12, 2);
  v_unpaid_bills_total DECIMAL(12, 2);
  v_purchase_orders_total DECIMAL(12, 2);
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

  -- Calculate bills totals if bills table exists
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_bills_total
    FROM bills
    WHERE project_id = p_project_id 
    AND (status = 'Paid' OR (status IS NULL AND is_paid = true));
    
    SELECT COALESCE(SUM(amount), 0) INTO v_unpaid_bills_total
    FROM bills
    WHERE project_id = p_project_id 
    AND (status IN ('Pending', 'Partial') OR (status IS NULL AND (is_paid = false OR is_paid IS NULL)));
  EXCEPTION
    WHEN undefined_table THEN
      v_paid_bills_total := 0;
      v_unpaid_bills_total := 0;
  END;

  -- Calculate purchase orders total if table exists
  BEGIN
    SELECT COALESCE(SUM(total), 0) INTO v_purchase_orders_total
    FROM purchase_orders
    WHERE project_id = p_project_id;
  EXCEPTION
    WHEN undefined_table THEN
      v_purchase_orders_total := 0;
  END;

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
    v_purchase_orders_total,
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

-- Grant necessary permissions
GRANT ALL ON estimate_project_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_project_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION populate_all_project_summaries() TO authenticated;

-- Populate initial data for your current project
SELECT refresh_project_summary('9f7b6f03-623d-491f-90ef-72939e61e658');

-- Optional: Populate all projects (uncomment if needed)
-- SELECT populate_all_project_summaries();