-- File: migrations/20240628000004_add_work_categories.sql
-- Description: Adds work_category field to all catalogue tables for better organization
-- Dependencies: Requires 20240628000001_library_foundation.sql
-- Risk: Low - Only adding columns, no data modification
-- Rollback: ALTER TABLE DROP COLUMN statements at end of file

BEGIN;

-- ========================================
-- 1. ADD WORK_CATEGORY COLUMNS
-- ========================================

-- Add work_category to material_catalogue
ALTER TABLE material_catalogue 
ADD COLUMN IF NOT EXISTS work_category VARCHAR(50);

-- Add work_category to labor_catalogue  
ALTER TABLE labor_catalogue 
ADD COLUMN IF NOT EXISTS work_category VARCHAR(50);

-- Add work_category to equipment_catalogue
ALTER TABLE equipment_catalogue 
ADD COLUMN IF NOT EXISTS work_category VARCHAR(50);

-- ========================================
-- 2. ADD PERFORMANCE INDEXES
-- ========================================

-- Create indexes for work_category filtering
CREATE INDEX IF NOT EXISTS idx_material_catalogue_work_category 
ON material_catalogue(work_category);

CREATE INDEX IF NOT EXISTS idx_labor_catalogue_work_category 
ON labor_catalogue(work_category);

CREATE INDEX IF NOT EXISTS idx_equipment_catalogue_work_category 
ON equipment_catalogue(work_category);

-- ========================================
-- 3. SET DEFAULT VALUES FOR EXISTING DATA
-- ========================================

-- Update existing records with default work category
UPDATE material_catalogue 
SET work_category = 'General Construction' 
WHERE work_category IS NULL;

UPDATE labor_catalogue 
SET work_category = 'General Construction' 
WHERE work_category IS NULL;

UPDATE equipment_catalogue 
SET work_category = 'General Construction' 
WHERE work_category IS NULL;

-- ========================================
-- 4. ADD VALIDATION CONSTRAINTS
-- ========================================

-- Add check constraints for valid work categories
ALTER TABLE material_catalogue 
ADD CONSTRAINT check_material_work_category_valid 
CHECK (work_category IN (
  'Concrete Work',
  'Masonry & Blockwork', 
  'Steel & Reinforcement',
  'Carpentry & Timber',
  'Roofing & Waterproofing',
  'Electrical Work',
  'Plumbing & HVAC',
  'Finishing Work',
  'Earthwork & Excavation',
  'General Construction'
));

ALTER TABLE labor_catalogue 
ADD CONSTRAINT check_labor_work_category_valid 
CHECK (work_category IN (
  'Concrete Work',
  'Masonry & Blockwork',
  'Steel & Reinforcement', 
  'Carpentry & Timber',
  'Roofing & Waterproofing',
  'Electrical Work',
  'Plumbing & HVAC',
  'Finishing Work',
  'Earthwork & Excavation',
  'General Construction'
));

ALTER TABLE equipment_catalogue 
ADD CONSTRAINT check_equipment_work_category_valid 
CHECK (work_category IN (
  'Concrete Work',
  'Masonry & Blockwork',
  'Steel & Reinforcement',
  'Carpentry & Timber', 
  'Roofing & Waterproofing',
  'Electrical Work',
  'Plumbing & HVAC',
  'Finishing Work',
  'Earthwork & Excavation',
  'General Construction'
));

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Work Categories Migration: Successfully completed';
  RAISE NOTICE 'Added work_category column to all catalogue tables';
  RAISE NOTICE 'Created performance indexes for filtering';
  RAISE NOTICE 'Set default values for existing data';
  RAISE NOTICE 'Added validation constraints for work categories';
END $$;

-- ROLLBACK SCRIPT (to be used if needed)
/*
-- Uncomment and run this section to rollback this migration

BEGIN;

-- Remove constraints
ALTER TABLE material_catalogue DROP CONSTRAINT IF EXISTS check_material_work_category_valid;
ALTER TABLE labor_catalogue DROP CONSTRAINT IF EXISTS check_labor_work_category_valid;
ALTER TABLE equipment_catalogue DROP CONSTRAINT IF EXISTS check_equipment_work_category_valid;

-- Drop indexes
DROP INDEX IF EXISTS idx_material_catalogue_work_category;
DROP INDEX IF EXISTS idx_labor_catalogue_work_category;
DROP INDEX IF EXISTS idx_equipment_catalogue_work_category;

-- Drop columns
ALTER TABLE material_catalogue DROP COLUMN IF EXISTS work_category;
ALTER TABLE labor_catalogue DROP COLUMN IF EXISTS work_category;
ALTER TABLE equipment_catalogue DROP COLUMN IF EXISTS work_category;

COMMIT;

RAISE NOTICE 'Work Categories Migration: Successfully rolled back';
*/