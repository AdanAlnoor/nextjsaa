# Phase 1: Database Setup and Schema Design

## Overview

This phase establishes the foundational database structure for integrating the library system with the estimate system.

## Current State Analysis

### Library System (4-Level Hierarchy)
```
Division (Level 1) → Section (Level 2) → Assembly (Level 3) → Item (Level 4)
Example: 02 → 02.10 → 02.10.10 → 02.10.10.01
```

### Estimate System (3-Level Hierarchy)
```
Structure (Level 0) → Element (Level 1) → Detail Item (Level 2)
Example: Main House → Substructure → Excavation Work
```

## Database Schema Changes

### 1. Estimate Elements Table Updates
```sql
ALTER TABLE estimate_elements 
ADD COLUMN library_division_id UUID REFERENCES divisions(id),
ADD COLUMN library_section_id UUID REFERENCES sections(id),
ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN hierarchy_level INTEGER CHECK (hierarchy_level BETWEEN 1 AND 4),
ADD COLUMN parent_element_id UUID REFERENCES estimate_elements(id),
ADD COLUMN library_code VARCHAR(20),
ADD COLUMN library_path TEXT,
ADD COLUMN is_from_library BOOLEAN DEFAULT false;
```

### 2. Estimate Detail Items Table Updates
```sql
ALTER TABLE estimate_detail_items 
ADD COLUMN library_item_id UUID REFERENCES library_items(id),
ADD COLUMN library_division_id UUID REFERENCES divisions(id),
ADD COLUMN library_section_id UUID REFERENCES sections(id),
ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN library_code VARCHAR(20),
ADD COLUMN library_path TEXT,
ADD COLUMN factor_breakdown JSONB,
ADD COLUMN is_from_library BOOLEAN DEFAULT false;
```

### 3. Performance Optimization Indexes
```sql
CREATE INDEX idx_estimate_elements_library_refs 
ON estimate_elements(library_division_id, library_section_id, library_assembly_id);

CREATE INDEX idx_estimate_detail_items_library_refs 
ON estimate_detail_items(library_item_id);

CREATE INDEX idx_estimate_hierarchy 
ON estimate_elements(parent_element_id, hierarchy_level);
```

## Schedule Views Creation

### 1. Material Schedule View
```sql
CREATE OR REPLACE VIEW estimate_material_schedule AS
WITH material_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    mc.id as material_id,
    mc.name as material_name,
    mc.unit as material_unit,
    mc.code as material_code,
    mc.category as material_category,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(mf.quantity_per_unit, 0) * 
      (1 + COALESCE(mf.wastage_percentage, 0)/100)
    ) as total_quantity,
    mc.rate as unit_rate
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN material_factors mf ON mf.library_item_id = li.id
  LEFT JOIN materials_catalogue mc ON mf.material_catalogue_id = mc.id
  WHERE ed.is_from_library = true
  GROUP BY p.id, p.name, mc.id, mc.name, mc.unit, mc.code, mc.category, mc.rate
);
```

### 2. Labour Schedule View
```sql
CREATE OR REPLACE VIEW estimate_labour_schedule AS
WITH labour_aggregation AS (
  SELECT 
    p.id as project_id,
    lc.id as labour_id,
    lc.trade as labour_trade,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(lf.hours_per_unit, 0)
    ) as total_hours
  FROM estimate_detail_items ed
  JOIN library_items li ON ed.library_item_id = li.id
  JOIN labour_factors lf ON lf.library_item_id = li.id
  JOIN labour_catalogue lc ON lf.labour_catalogue_id = lc.id
  WHERE ed.is_from_library = true
  GROUP BY p.id, lc.id, lc.trade
);
```

### 3. Equipment Schedule View
```sql
CREATE OR REPLACE VIEW estimate_equipment_schedule AS
WITH equipment_aggregation AS (
  SELECT 
    p.id as project_id,
    ec.id as equipment_id,
    ec.type as equipment_type,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(ef.hours_per_unit, 0)
    ) as total_hours
  FROM estimate_detail_items ed
  JOIN library_items li ON ed.library_item_id = li.id
  JOIN equipment_factors ef ON ef.library_item_id = li.id
  JOIN equipment_catalogue ec ON ef.equipment_catalogue_id = ec.id
  WHERE ed.is_from_library = true
  GROUP BY p.id, ec.id, ec.type
);
```

## Migration Scripts

### 1. Initial Schema Changes
```bash
migrations/
├── 2024_01_15_add_library_integration_columns.sql
├── 2024_01_15_create_schedule_views.sql
└── 2024_01_15_create_usage_tracking.sql
```

### 2. Data Migration Strategy
1. Create backup of existing tables
2. Apply schema changes
3. Update existing records with library mappings
4. Validate data integrity
5. Create new views
6. Test view performance

## Validation Queries

### 1. Check Library References
```sql
SELECT COUNT(*) as mapped_items,
       COUNT(*) FILTER (WHERE library_item_id IS NOT NULL) as with_library_ref
FROM estimate_detail_items
WHERE is_from_library = true;
```

### 2. Verify Hierarchy Integrity
```sql
WITH RECURSIVE hierarchy AS (
  SELECT id, parent_element_id, 1 as level
  FROM estimate_elements
  WHERE parent_element_id IS NULL
  
  UNION ALL
  
  SELECT e.id, e.parent_element_id, h.level + 1
  FROM estimate_elements e
  JOIN hierarchy h ON e.parent_element_id = h.id
)
SELECT MAX(level) as max_depth
FROM hierarchy;
```

## Performance Considerations

1. Partitioning Strategy
   - Partition large tables by project_id
   - Consider time-based partitioning for historical data

2. Index Optimization
   - Monitor index usage
   - Create additional indexes based on query patterns
   - Regular index maintenance

3. View Materialization
   - Materialize frequently accessed views
   - Schedule regular refreshes
   - Monitor view performance

## Rollback Plan

1. Backup Scripts
```sql
CREATE TABLE estimate_elements_backup AS SELECT * FROM estimate_elements;
CREATE TABLE estimate_detail_items_backup AS SELECT * FROM estimate_detail_items;
```

2. Rollback Scripts
```sql
-- In case of issues
DROP VIEW IF EXISTS estimate_material_schedule;
DROP VIEW IF EXISTS estimate_labour_schedule;
DROP VIEW IF EXISTS estimate_equipment_schedule;

ALTER TABLE estimate_elements 
DROP COLUMN library_division_id,
DROP COLUMN library_section_id,
DROP COLUMN library_assembly_id;

-- Additional rollback statements...
``` 