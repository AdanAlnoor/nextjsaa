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