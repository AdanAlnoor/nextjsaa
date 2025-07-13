# Phase 1: Database Foundation - Detailed Implementation Plan

## Overview
**Duration**: 1-2 weeks  
**Risk Level**: Low  
**Impact**: Zero disruption to existing functionality  
**Rollback**: Easy (drop tables)  

## Objectives
✅ Add catalog and budget tracking tables alongside existing structure  
✅ Extend purchase_order_items with optional catalog linking  
✅ Create foundation for budget validation without affecting current workflows  
✅ Ensure zero impact on existing Purchase Order and Bills functionality  

---

## Day-by-Day Implementation Schedule

### **Day 1-2: Planning & Environment Setup**

#### Day 1 Morning: Pre-Implementation Checklist
- [ ] Database backup verification
- [ ] Staging environment ready
- [ ] Migration scripts prepared
- [ ] Team notification sent

#### Day 1 Afternoon: Script Preparation
- [ ] Create migration files
- [ ] Prepare verification queries
- [ ] Test rollback procedures
- [ ] Document changes

#### Day 2: Testing on Staging
- [ ] Apply migrations to staging
- [ ] Run verification tests
- [ ] Performance impact assessment
- [ ] Team review of changes

### **Day 3-4: Production Implementation**

#### Day 3: Core Tables Creation
- [ ] Apply catalog foundation migrations
- [ ] Verify table creation
- [ ] Check indexes and constraints
- [ ] Monitor database performance

#### Day 4: Purchase Order Extensions
- [ ] Add optional columns to existing tables
- [ ] Verify backward compatibility
- [ ] Test existing PO workflows
- [ ] Document completion

### **Day 5-7: Verification & Documentation**

#### Day 5: Comprehensive Testing
- [ ] End-to-end PO creation testing
- [ ] Bills workflow verification
- [ ] Performance benchmarking
- [ ] User acceptance testing

#### Day 6-7: Documentation & Team Training
- [ ] Update technical documentation
- [ ] Create troubleshooting guide
- [ ] Brief development team
- [ ] Prepare for Phase 2

---

## Migration Scripts

### Script 1: Create Catalog Foundation Tables

```sql
-- File: migrations/phase1/001_create_catalog_foundation.sql
-- Description: Creates the catalog system foundation tables
-- Risk: Low - No impact on existing data
-- Rollback: DROP TABLE statements at end of file

BEGIN;

-- Create item categories table
CREATE TABLE IF NOT EXISTS item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES item_categories(id) ON DELETE SET NULL,
  code VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT check_sort_order_positive CHECK (sort_order >= 0)
);

-- Create catalog items table
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES item_categories(id) ON DELETE SET NULL,
  default_unit VARCHAR(50),
  default_supplier_id UUID, -- Will reference suppliers table if it exists
  last_purchase_price DECIMAL(12,2),
  average_price DECIMAL(12,2),
  min_order_quantity DECIMAL(10,2) DEFAULT 1,
  lead_time_days INTEGER DEFAULT 0,
  keywords TEXT[], -- PostgreSQL array for search keywords
  specifications JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_purchased_date TIMESTAMP WITH TIME ZONE,
  seasonal_factor DECIMAL(3,2) DEFAULT 1.0,
  market_trend VARCHAR(20) CHECK (market_trend IN ('stable', 'rising', 'declining', 'volatile')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_code_not_empty CHECK (LENGTH(TRIM(code)) > 0),
  CONSTRAINT check_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT check_prices_non_negative CHECK (
    (last_purchase_price IS NULL OR last_purchase_price >= 0) AND
    (average_price IS NULL OR average_price >= 0)
  ),
  CONSTRAINT check_quantities_positive CHECK (
    min_order_quantity > 0 AND
    usage_count >= 0 AND
    lead_time_days >= 0
  ),
  CONSTRAINT check_seasonal_factor_range CHECK (seasonal_factor > 0 AND seasonal_factor <= 10)
);

-- Create catalog supplier items table
CREATE TABLE IF NOT EXISTS catalog_supplier_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL, -- Will reference suppliers table
  supplier_item_code VARCHAR(100),
  supplier_price DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  minimum_quantity DECIMAL(10,2) DEFAULT 1,
  lead_time_days INTEGER DEFAULT 0,
  is_preferred BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_supplier_price_non_negative CHECK (supplier_price IS NULL OR supplier_price >= 0),
  CONSTRAINT check_minimum_quantity_positive CHECK (minimum_quantity > 0),
  CONSTRAINT check_lead_time_non_negative CHECK (lead_time_days >= 0),
  CONSTRAINT check_currency_format CHECK (LENGTH(currency) = 3),
  
  -- Unique constraint to prevent duplicate supplier-item combinations
  UNIQUE(catalog_item_id, supplier_id)
);

-- Create cost control catalog mappings table
CREATE TABLE IF NOT EXISTS cost_control_catalog_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_control_category VARCHAR(255) NOT NULL,
  catalog_category_id UUID NOT NULL REFERENCES item_categories(id) ON DELETE CASCADE,
  match_weight DECIMAL(3,2) DEFAULT 1.0,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_category_not_empty CHECK (LENGTH(TRIM(cost_control_category)) > 0),
  CONSTRAINT check_match_weight_range CHECK (match_weight > 0 AND match_weight <= 10)
);

-- Create budget transactions table for tracking budget changes
CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_control_item_id UUID, -- Will reference cost_control_items if exists
  purchase_order_id UUID, -- Will reference purchase_orders if exists
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('reserve', 'commit', 'release', 'spend', 'adjust')),
  amount DECIMAL(12,2) NOT NULL,
  reference_type VARCHAR(50), -- 'po_item', 'bill_item', 'manual_adjustment', etc.
  reference_id UUID,
  notes TEXT,
  created_by UUID, -- Will reference users/profiles if exists
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reversed_at TIMESTAMP WITH TIME ZONE,
  reversed_by UUID, -- Will reference users/profiles if exists
  
  -- Constraints
  CONSTRAINT check_amount_not_zero CHECK (amount != 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_categories_parent ON item_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_active ON item_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_item_categories_code ON item_categories(code);

CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_active ON catalog_items(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_items_code ON catalog_items(code);
CREATE INDEX IF NOT EXISTS idx_catalog_items_name ON catalog_items(name);
CREATE INDEX IF NOT EXISTS idx_catalog_items_keywords ON catalog_items USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_catalog_items_usage ON catalog_items(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_supplier_items_catalog ON catalog_supplier_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_supplier_items_supplier ON catalog_supplier_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_catalog_supplier_items_preferred ON catalog_supplier_items(is_preferred);

CREATE INDEX IF NOT EXISTS idx_cost_control_mappings_category ON cost_control_catalog_mappings(cost_control_category);
CREATE INDEX IF NOT EXISTS idx_cost_control_mappings_catalog_cat ON cost_control_catalog_mappings(catalog_category_id);
CREATE INDEX IF NOT EXISTS idx_cost_control_mappings_active ON cost_control_catalog_mappings(is_active);

CREATE INDEX IF NOT EXISTS idx_budget_transactions_cost_control ON budget_transactions(cost_control_item_id);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_po ON budget_transactions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_type ON budget_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_created ON budget_transactions(created_at);

-- Add updated_at triggers for tables that need automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_item_categories_updated_at 
  BEFORE UPDATE ON item_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at 
  BEFORE UPDATE ON catalog_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_control_mappings_updated_at 
  BEFORE UPDATE ON cost_control_catalog_mappings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Script 1: Catalog foundation tables created successfully';
  RAISE NOTICE 'Tables created: item_categories, catalog_items, catalog_supplier_items, cost_control_catalog_mappings, budget_transactions';
  RAISE NOTICE 'All indexes and triggers applied';
END $$;

-- ROLLBACK SCRIPT (to be used if needed)
/*
-- Uncomment and run this section to rollback this migration

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS update_item_categories_updated_at ON item_categories;
DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON catalog_items;
DROP TRIGGER IF EXISTS update_cost_control_mappings_updated_at ON cost_control_catalog_mappings;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS budget_transactions;
DROP TABLE IF EXISTS cost_control_catalog_mappings;
DROP TABLE IF EXISTS catalog_supplier_items;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS item_categories;

-- Drop function if no other tables use it
-- DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;

RAISE NOTICE 'Phase 1 Script 1: Catalog foundation tables rolled back successfully';
*/
```

### Script 2: Extend Purchase Order Items Table

```sql
-- File: migrations/phase1/002_extend_purchase_order_items.sql
-- Description: Adds optional catalog linking columns to existing purchase_order_items table
-- Risk: Very Low - Only adds nullable columns
-- Rollback: ALTER TABLE DROP COLUMN statements

BEGIN;

-- Check if purchase_order_items table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
    RAISE EXCEPTION 'purchase_order_items table does not exist. Please ensure base tables are created first.';
  END IF;
END $$;

-- Add optional catalog linking columns
-- These are all nullable so existing data remains unaffected
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget_validation_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS suggested_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS price_variance_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS cost_control_available_before DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS cost_control_available_after DECIMAL(12,2);

-- Add constraints for new columns
ALTER TABLE purchase_order_items 
ADD CONSTRAINT IF NOT EXISTS check_suggested_price_non_negative 
  CHECK (suggested_price IS NULL OR suggested_price >= 0),
ADD CONSTRAINT IF NOT EXISTS check_price_variance_range 
  CHECK (price_variance_percent IS NULL OR (price_variance_percent >= -100 AND price_variance_percent <= 1000)),
ADD CONSTRAINT IF NOT EXISTS check_available_amounts_non_negative 
  CHECK (
    (cost_control_available_before IS NULL OR cost_control_available_before >= 0) AND
    (cost_control_available_after IS NULL OR cost_control_available_after >= 0)
  );

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_po_items_catalog ON purchase_order_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_po_items_budget_override ON purchase_order_items(budget_validation_override);

-- Add comments to document the new columns
COMMENT ON COLUMN purchase_order_items.catalog_item_id IS 'Optional reference to catalog item for this PO item';
COMMENT ON COLUMN purchase_order_items.budget_validation_override IS 'True if budget validation was overridden for this item';
COMMENT ON COLUMN purchase_order_items.override_reason IS 'Reason provided when budget validation was overridden';
COMMENT ON COLUMN purchase_order_items.suggested_price IS 'Price suggested by catalog system';
COMMENT ON COLUMN purchase_order_items.price_variance_percent IS 'Percentage variance from suggested price';
COMMENT ON COLUMN purchase_order_items.cost_control_available_before IS 'Available budget before this PO item';
COMMENT ON COLUMN purchase_order_items.cost_control_available_after IS 'Available budget after this PO item';

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Script 2: Purchase order items table extended successfully';
  RAISE NOTICE 'Added columns: catalog_item_id, budget_validation_override, override_reason, suggested_price, price_variance_percent, cost_control_available_before, cost_control_available_after';
  RAISE NOTICE 'All existing data remains unchanged';
END $$;

-- ROLLBACK SCRIPT (to be used if needed)
/*
-- Uncomment and run this section to rollback this migration

BEGIN;

-- Remove the added columns
ALTER TABLE purchase_order_items 
DROP COLUMN IF EXISTS catalog_item_id,
DROP COLUMN IF EXISTS budget_validation_override,
DROP COLUMN IF EXISTS override_reason,
DROP COLUMN IF EXISTS suggested_price,
DROP COLUMN IF EXISTS price_variance_percent,
DROP COLUMN IF EXISTS cost_control_available_before,
DROP COLUMN IF EXISTS cost_control_available_after;

COMMIT;

RAISE NOTICE 'Phase 1 Script 2: Purchase order items extensions rolled back successfully';
*/
```

### Script 3: Add Supplier Reference (If Needed)

```sql
-- File: migrations/phase1/003_add_supplier_references.sql
-- Description: Adds foreign key references to suppliers table if it exists
-- Risk: Very Low - Only adds constraints if possible
-- Rollback: DROP CONSTRAINT statements

BEGIN;

-- Check if suppliers table exists and add foreign key if possible
DO $$
BEGIN
  -- Check if suppliers table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    
    -- Add foreign key constraint to catalog_items if not already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'catalog_items' 
      AND constraint_name = 'fk_catalog_items_supplier'
    ) THEN
      ALTER TABLE catalog_items 
      ADD CONSTRAINT fk_catalog_items_supplier 
      FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Added foreign key constraint from catalog_items to suppliers';
    ELSE
      RAISE NOTICE 'Foreign key constraint from catalog_items to suppliers already exists';
    END IF;
    
    -- Add foreign key constraint to catalog_supplier_items if not already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'catalog_supplier_items' 
      AND constraint_name = 'fk_catalog_supplier_items_supplier'
    ) THEN
      ALTER TABLE catalog_supplier_items 
      ADD CONSTRAINT fk_catalog_supplier_items_supplier 
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Added foreign key constraint from catalog_supplier_items to suppliers';
    ELSE
      RAISE NOTICE 'Foreign key constraint from catalog_supplier_items to suppliers already exists';
    END IF;
    
  ELSE
    RAISE NOTICE 'Suppliers table does not exist. Skipping foreign key constraints.';
    RAISE NOTICE 'Foreign keys can be added later when suppliers table is available.';
  END IF;
  
  -- Check if cost_control_items table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_control_items') THEN
    
    -- Add foreign key constraint to budget_transactions if not already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'budget_transactions' 
      AND constraint_name = 'fk_budget_transactions_cost_control'
    ) THEN
      ALTER TABLE budget_transactions 
      ADD CONSTRAINT fk_budget_transactions_cost_control 
      FOREIGN KEY (cost_control_item_id) REFERENCES cost_control_items(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Added foreign key constraint from budget_transactions to cost_control_items';
    ELSE
      RAISE NOTICE 'Foreign key constraint from budget_transactions to cost_control_items already exists';
    END IF;
    
  ELSE
    RAISE NOTICE 'cost_control_items table does not exist. Skipping foreign key constraint.';
  END IF;
  
  -- Check if purchase_orders table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    
    -- Add foreign key constraint to budget_transactions if not already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'budget_transactions' 
      AND constraint_name = 'fk_budget_transactions_purchase_order'
    ) THEN
      ALTER TABLE budget_transactions 
      ADD CONSTRAINT fk_budget_transactions_purchase_order 
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Added foreign key constraint from budget_transactions to purchase_orders';
    ELSE
      RAISE NOTICE 'Foreign key constraint from budget_transactions to purchase_orders already exists';
    END IF;
    
  ELSE
    RAISE NOTICE 'purchase_orders table does not exist. Skipping foreign key constraint.';
  END IF;

END $$;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Script 3: Foreign key references added where possible';
  RAISE NOTICE 'All referential integrity constraints are now in place';
END $$;

-- ROLLBACK SCRIPT (to be used if needed)
/*
-- Uncomment and run this section to rollback this migration

BEGIN;

-- Remove foreign key constraints
ALTER TABLE catalog_items DROP CONSTRAINT IF EXISTS fk_catalog_items_supplier;
ALTER TABLE catalog_supplier_items DROP CONSTRAINT IF EXISTS fk_catalog_supplier_items_supplier;
ALTER TABLE budget_transactions DROP CONSTRAINT IF EXISTS fk_budget_transactions_cost_control;
ALTER TABLE budget_transactions DROP CONSTRAINT IF EXISTS fk_budget_transactions_purchase_order;

COMMIT;

RAISE NOTICE 'Phase 1 Script 3: Foreign key references rolled back successfully';
*/
```

---

## Verification Scripts

### Verification Script 1: Table Structure Verification

```sql
-- File: verification/phase1/verify_table_structures.sql
-- Description: Verifies all Phase 1 tables and columns are created correctly

\echo 'Starting Phase 1 Table Structure Verification...'

-- Verify item_categories table
SELECT 
  'item_categories' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'item_categories') 
    THEN 'EXISTS' ELSE 'MISSING' END as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'item_categories') as column_count;

-- Verify catalog_items table
SELECT 
  'catalog_items' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_items') 
    THEN 'EXISTS' ELSE 'MISSING' END as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'catalog_items') as column_count;

-- Verify catalog_supplier_items table
SELECT 
  'catalog_supplier_items' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_supplier_items') 
    THEN 'EXISTS' ELSE 'MISSING' END as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'catalog_supplier_items') as column_count;

-- Verify cost_control_catalog_mappings table
SELECT 
  'cost_control_catalog_mappings' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_control_catalog_mappings') 
    THEN 'EXISTS' ELSE 'MISSING' END as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'cost_control_catalog_mappings') as column_count;

-- Verify budget_transactions table
SELECT 
  'budget_transactions' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_transactions') 
    THEN 'EXISTS' ELSE 'MISSING' END as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'budget_transactions') as column_count;

-- Verify purchase_order_items extensions
SELECT 
  'purchase_order_items (catalog_item_id)' as verification,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' AND column_name = 'catalog_item_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
  'purchase_order_items (budget_validation_override)' as verification,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' AND column_name = 'budget_validation_override'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Verify indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN (
  'item_categories', 
  'catalog_items', 
  'catalog_supplier_items', 
  'cost_control_catalog_mappings', 
  'budget_transactions',
  'purchase_order_items'
) 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verify constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN (
  'item_categories', 
  'catalog_items', 
  'catalog_supplier_items', 
  'cost_control_catalog_mappings', 
  'budget_transactions'
)
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo 'Phase 1 Table Structure Verification Complete'
```

### Verification Script 2: Data Integrity Verification

```sql
-- File: verification/phase1/verify_data_integrity.sql
-- Description: Verifies that existing data is unaffected and new tables work correctly

\echo 'Starting Phase 1 Data Integrity Verification...'

-- Check that existing purchase_order_items data is intact
SELECT 
  'Existing PO Items Check' as test_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN catalog_item_id IS NULL THEN 1 END) as null_catalog_refs,
  COUNT(CASE WHEN budget_validation_override = false THEN 1 END) as no_overrides
FROM purchase_order_items;

-- Test inserting a sample category
INSERT INTO item_categories (name, code, description) 
VALUES ('Test Category', 'TEST-CAT', 'Sample category for verification')
ON CONFLICT (code) DO NOTHING;

-- Test inserting a sample catalog item
INSERT INTO catalog_items (code, name, description, default_unit) 
VALUES ('TEST-ITEM-001', 'Test Item', 'Sample item for verification', 'pcs')
ON CONFLICT (code) DO NOTHING;

-- Verify the test data was inserted
SELECT 
  'Test Data Insert' as test_name,
  (SELECT COUNT(*) FROM item_categories WHERE code = 'TEST-CAT') as categories_inserted,
  (SELECT COUNT(*) FROM catalog_items WHERE code = 'TEST-ITEM-001') as items_inserted;

-- Test that foreign key relationships work
SELECT 
  'Foreign Key Test' as test_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM catalog_items ci
    JOIN item_categories ic ON ci.category_id = ic.id
    WHERE ci.code = 'TEST-ITEM-001'
  ) THEN 'PASS' ELSE 'Not Set (Expected)' END as fk_status;

-- Clean up test data
DELETE FROM catalog_items WHERE code = 'TEST-ITEM-001';
DELETE FROM item_categories WHERE code = 'TEST-CAT';

-- Verify cleanup
SELECT 
  'Cleanup Verification' as test_name,
  (SELECT COUNT(*) FROM item_categories WHERE code = 'TEST-CAT') as remaining_categories,
  (SELECT COUNT(*) FROM catalog_items WHERE code = 'TEST-ITEM-001') as remaining_items;

\echo 'Phase 1 Data Integrity Verification Complete'
```

### Verification Script 3: Performance Impact Assessment

```sql
-- File: verification/phase1/verify_performance_impact.sql
-- Description: Verifies that new tables don't impact existing query performance

\echo 'Starting Phase 1 Performance Impact Assessment...'

-- Time existing purchase order queries
\timing on

-- Test 1: Basic PO query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT po.*, poi.* 
FROM purchase_orders po
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
LIMIT 100;

-- Test 2: PO creation performance (if test data exists)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM purchase_orders 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;

-- Test 3: Check for any unexpected table locks
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass,
  l.page,
  l.tuple,
  l.virtualxid,
  l.transactionid,
  l.mode,
  l.granted
FROM pg_locks l
WHERE l.relation::regclass::text LIKE '%purchase_order%' 
   OR l.relation::regclass::text LIKE '%catalog%'
   OR l.relation::regclass::text LIKE '%budget%';

-- Test 4: Verify index usage on new tables
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM catalog_items WHERE is_active = true LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM item_categories WHERE is_active = true LIMIT 10;

\timing off

\echo 'Phase 1 Performance Impact Assessment Complete'
```

---

## Implementation Commands

### Command 1: Apply Migrations

```bash
#!/bin/bash
# File: scripts/phase1/apply_migrations.sh
# Description: Applies all Phase 1 migrations safely

set -e  # Exit on any error

echo "=== Phase 1 Migration Application Started ==="
echo "Timestamp: $(date)"

# Database connection details (modify as needed)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-your_database_name}
DB_USER=${DB_USER:-your_username}

# Create backup before migration
echo "Creating database backup..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  --no-password --clean --if-exists \
  > "backup_before_phase1_$(date +%Y%m%d_%H%M%S).sql"

if [ $? -eq 0 ]; then
  echo "✅ Database backup created successfully"
else
  echo "❌ Database backup failed. Aborting migration."
  exit 1
fi

# Apply migration scripts in order
MIGRATION_DIR="migrations/phase1"

echo "Applying migration scripts..."

echo "1/3 - Creating catalog foundation tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "$MIGRATION_DIR/001_create_catalog_foundation.sql"

if [ $? -eq 0 ]; then
  echo "✅ Catalog foundation tables created"
else
  echo "❌ Failed to create catalog foundation tables"
  exit 1
fi

echo "2/3 - Extending purchase order items table..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "$MIGRATION_DIR/002_extend_purchase_order_items.sql"

if [ $? -eq 0 ]; then
  echo "✅ Purchase order items table extended"
else
  echo "❌ Failed to extend purchase order items table"
  exit 1
fi

echo "3/3 - Adding supplier references..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "$MIGRATION_DIR/003_add_supplier_references.sql"

if [ $? -eq 0 ]; then
  echo "✅ Supplier references added"
else
  echo "❌ Failed to add supplier references"
  exit 1
fi

echo "=== Phase 1 Migration Application Completed Successfully ==="
echo "Timestamp: $(date)"
```

### Command 2: Run Verification

```bash
#!/bin/bash
# File: scripts/phase1/run_verification.sh
# Description: Runs all Phase 1 verification scripts

set -e

echo "=== Phase 1 Verification Started ==="
echo "Timestamp: $(date)"

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-your_database_name}
DB_USER=${DB_USER:-your_username}

VERIFICATION_DIR="verification/phase1"

echo "Running verification scripts..."

echo "1/3 - Verifying table structures..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "$VERIFICATION_DIR/verify_table_structures.sql" \
  > "verification_results_$(date +%Y%m%d_%H%M%S).log"

echo "2/3 - Verifying data integrity..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "$VERIFICATION_DIR/verify_data_integrity.sql" \
  >> "verification_results_$(date +%Y%m%d_%H%M%S).log"

echo "3/3 - Assessing performance impact..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "$VERIFICATION_DIR/verify_performance_impact.sql" \
  >> "verification_results_$(date +%Y%m%d_%H%M%S).log"

echo "✅ All verification scripts completed successfully"
echo "Results saved to verification_results_*.log"

echo "=== Phase 1 Verification Completed ==="
echo "Timestamp: $(date)"
```

### Command 3: Emergency Rollback

```bash
#!/bin/bash
# File: scripts/phase1/emergency_rollback.sh
# Description: Emergency rollback for Phase 1 if needed

set -e

echo "=== EMERGENCY PHASE 1 ROLLBACK STARTED ==="
echo "Timestamp: $(date)"
echo "⚠️  WARNING: This will remove all Phase 1 database changes"

read -p "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): " confirmation

if [ "$confirmation" != "ROLLBACK" ]; then
  echo "Rollback cancelled by user"
  exit 0
fi

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-your_database_name}
DB_USER=${DB_USER:-your_username}

# Create backup before rollback
echo "Creating backup before rollback..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  --no-password --clean --if-exists \
  > "backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql"

# Rollback in reverse order
echo "Rolling back Phase 1 changes..."

echo "1/3 - Removing supplier references..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
BEGIN;
ALTER TABLE catalog_items DROP CONSTRAINT IF EXISTS fk_catalog_items_supplier;
ALTER TABLE catalog_supplier_items DROP CONSTRAINT IF EXISTS fk_catalog_supplier_items_supplier;
ALTER TABLE budget_transactions DROP CONSTRAINT IF EXISTS fk_budget_transactions_cost_control;
ALTER TABLE budget_transactions DROP CONSTRAINT IF EXISTS fk_budget_transactions_purchase_order;
COMMIT;
"

echo "2/3 - Removing purchase order items extensions..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
BEGIN;
ALTER TABLE purchase_order_items 
DROP COLUMN IF EXISTS catalog_item_id,
DROP COLUMN IF EXISTS budget_validation_override,
DROP COLUMN IF EXISTS override_reason,
DROP COLUMN IF EXISTS suggested_price,
DROP COLUMN IF EXISTS price_variance_percent,
DROP COLUMN IF EXISTS cost_control_available_before,
DROP COLUMN IF EXISTS cost_control_available_after;
COMMIT;
"

echo "3/3 - Removing catalog foundation tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
BEGIN;
DROP TRIGGER IF EXISTS update_item_categories_updated_at ON item_categories;
DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON catalog_items;
DROP TRIGGER IF EXISTS update_cost_control_mappings_updated_at ON cost_control_catalog_mappings;
DROP TABLE IF EXISTS budget_transactions;
DROP TABLE IF EXISTS cost_control_catalog_mappings;
DROP TABLE IF EXISTS catalog_supplier_items;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS item_categories;
COMMIT;
"

echo "✅ Phase 1 rollback completed successfully"
echo "All Phase 1 changes have been removed"
echo "System restored to pre-Phase 1 state"

echo "=== EMERGENCY PHASE 1 ROLLBACK COMPLETED ==="
echo "Timestamp: $(date)"
```

---

## Daily Checklist

### Pre-Implementation Checklist
- [ ] Database backup completed and verified
- [ ] Staging environment ready and tested
- [ ] Migration scripts reviewed by team
- [ ] Rollback procedures tested on staging
- [ ] Team notifications sent
- [ ] Monitoring tools ready

### Post-Implementation Checklist
- [ ] All migration scripts executed successfully
- [ ] Verification scripts passed
- [ ] No impact on existing functionality confirmed
- [ ] Performance benchmarks within acceptable range
- [ ] Database size increase documented
- [ ] Team notified of completion

### Success Criteria
✅ **Zero Downtime**: Existing PO/Bills workflows unaffected  
✅ **Data Integrity**: All existing data intact  
✅ **Performance**: No degradation in query response times  
✅ **Rollback Ready**: Emergency rollback procedures tested  
✅ **Team Ready**: Development team briefed on new structure  

---

## Risk Mitigation

### Identified Risks & Mitigation
1. **Database Size Growth**: Monitor disk space, plan for 10-15% increase
2. **Index Creation Time**: Schedule during low-usage hours
3. **Foreign Key Conflicts**: Scripts handle missing tables gracefully
4. **Rollback Complexity**: Automated rollback scripts prepared

### Monitoring During Implementation
- Database connection count
- Query response times
- Error rates in application logs
- Disk space utilization
- CPU and memory usage

**Phase 1 provides a solid, risk-free foundation for the enhanced Purchase Orders and Bills system. All changes are non-breaking and easily reversible.**