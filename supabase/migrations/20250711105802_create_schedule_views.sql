-- Create schedule views for materials, labour, and equipment aggregation
BEGIN;

-- Drop existing views if they exist
DROP VIEW IF EXISTS estimate_material_schedule CASCADE;
DROP VIEW IF EXISTS estimate_labour_schedule CASCADE;
DROP VIEW IF EXISTS estimate_equipment_schedule CASCADE;

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
    -- Aggregate quantities from all detail items using this material
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
    -- Source tracking
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
    -- Aggregate hours from all detail items requiring this labour
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(lf.hours_per_unit, 0)
    ) as total_hours_raw,
    AVG(COALESCE(lf.productivity_factor, 1.0)) as avg_productivity_factor,
    -- Source tracking
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
    -- Aggregate hours from all detail items requiring this equipment
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(ef.hours_per_unit, 0)
    ) as total_hours_raw,
    AVG(COALESCE(ef.utilization_factor, 0.75)) as avg_utilization_factor,
    -- Source tracking
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

-- Create indexes on base tables for view performance
CREATE INDEX IF NOT EXISTS idx_material_factors_lookup 
ON material_factors(library_item_id, material_catalogue_id);

CREATE INDEX IF NOT EXISTS idx_labour_factors_lookup 
ON labour_factors(library_item_id, labour_catalogue_id);

CREATE INDEX IF NOT EXISTS idx_equipment_factors_lookup 
ON equipment_factors(library_item_id, equipment_catalogue_id);

-- Grant permissions
GRANT SELECT ON estimate_material_schedule TO authenticated;
GRANT SELECT ON estimate_labour_schedule TO authenticated;
GRANT SELECT ON estimate_equipment_schedule TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW estimate_material_schedule IS 'Aggregated material requirements from all library-based estimate items';
COMMENT ON VIEW estimate_labour_schedule IS 'Aggregated labour requirements from all library-based estimate items';
COMMENT ON VIEW estimate_equipment_schedule IS 'Aggregated equipment requirements from all library-based estimate items';

COMMIT;