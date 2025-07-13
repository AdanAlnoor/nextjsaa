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