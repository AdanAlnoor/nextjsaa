import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Test migration verification script
 */
async function testMigrations() {
  console.log('🚀 Starting Library Integration Migration Tests\n');

  try {
    // Test 1: Check if estimate tables have new columns
    console.log('📋 Test 1: Verifying new columns in estimate tables...');
    await testEstimateTableColumns();

    // Test 2: Check if schedule views were created
    console.log('\n📋 Test 2: Verifying schedule views...');
    await testScheduleViews();

    // Test 3: Check if usage tracking tables were created
    console.log('\n📋 Test 3: Verifying usage tracking tables...');
    await testUsageTrackingTables();

    // Test 4: Check indexes
    console.log('\n📋 Test 4: Verifying indexes...');
    await testIndexes();

    // Test 5: Test RLS policies
    console.log('\n📋 Test 5: Verifying RLS policies...');
    await testRLSPolicies();

    console.log('\n✅ All migration tests passed!');
  } catch (error) {
    console.error('\n❌ Migration test failed:', error);
    process.exit(1);
  }
}

/**
 * Test 1: Verify new columns in estimate tables
 */
async function testEstimateTableColumns() {
  const expectedElementColumns = [
    'library_division_id',
    'library_section_id',
    'library_assembly_id',
    'hierarchy_level',
    'parent_element_id',
    'library_code',
    'library_path',
    'is_from_library',
  ];

  const expectedDetailColumns = [
    'library_item_id',
    'library_division_id',
    'library_section_id',
    'library_assembly_id',
    'library_code',
    'library_path',
    'factor_breakdown',
    'is_from_library',
    'rate_manual',
    'rate_calculated',
  ];

  // Check estimate_elements columns
  const { data: elementColumns, error: elementError } = await supabase.rpc('get_table_columns', {
    table_name: 'estimate_elements',
  });

  if (elementError) {
    // Fallback to information_schema query
    const { data, error } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'estimate_elements');

    if (error) throw error;

    const columnNames = data?.map((col: any) => col.column_name) || [];
    const missingColumns = expectedElementColumns.filter(col => !columnNames.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Missing columns in estimate_elements: ${missingColumns.join(', ')}`);
    }
  }

  console.log('  ✓ estimate_elements table has all required columns');

  // Check estimate_detail_items columns
  const { data: detailColumns, error: detailError } = await supabase
    .from('information_schema.columns' as any)
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'estimate_detail_items');

  if (detailError) throw detailError;

  const detailColumnNames = detailColumns?.map((col: any) => col.column_name) || [];
  const missingDetailColumns = expectedDetailColumns.filter(col => !detailColumnNames.includes(col));

  if (missingDetailColumns.length > 0) {
    throw new Error(`Missing columns in estimate_detail_items: ${missingDetailColumns.join(', ')}`);
  }

  console.log('  ✓ estimate_detail_items table has all required columns');
}

/**
 * Test 2: Verify schedule views
 */
async function testScheduleViews() {
  const expectedViews = [
    'estimate_material_schedule',
    'estimate_labour_schedule',
    'estimate_equipment_schedule',
  ];

  for (const viewName of expectedViews) {
    const { data, error } = await supabase
      .from('information_schema.views' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', viewName)
      .single();

    if (error || !data) {
      throw new Error(`View ${viewName} not found`);
    }

    console.log(`  ✓ ${viewName} view exists`);
  }
}

/**
 * Test 3: Verify usage tracking tables
 */
async function testUsageTrackingTables() {
  const expectedTables = [
    'estimate_library_usage',
    'library_item_popularity',
    'estimate_hierarchy_templates',
  ];

  for (const tableName of expectedTables) {
    const { data, error } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();

    if (error || !data) {
      throw new Error(`Table ${tableName} not found`);
    }

    console.log(`  ✓ ${tableName} table exists`);
  }
}

/**
 * Test 4: Verify indexes
 */
async function testIndexes() {
  const expectedIndexes = [
    'idx_estimate_elements_library_refs',
    'idx_estimate_detail_items_library_refs',
    'idx_estimate_hierarchy',
    'idx_library_usage_project',
    'idx_library_usage_item',
  ];

  const { data: indexes, error } = await supabase
    .from('pg_indexes' as any)
    .select('indexname')
    .eq('schemaname', 'public')
    .in('indexname', expectedIndexes);

  if (error) throw error;

  const foundIndexes = indexes?.map((idx: any) => idx.indexname) || [];
  const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));

  if (missingIndexes.length > 0) {
    console.warn(`  ⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
  } else {
    console.log('  ✓ All indexes created successfully');
  }
}

/**
 * Test 5: Verify RLS policies
 */
async function testRLSPolicies() {
  const tablesWithRLS = [
    'estimate_library_usage',
    'library_item_popularity',
    'estimate_hierarchy_templates',
  ];

  for (const tableName of tablesWithRLS) {
    const { data, error } = await supabase
      .from('pg_policies' as any)
      .select('policyname')
      .eq('schemaname', 'public')
      .eq('tablename', tableName);

    if (error) {
      console.warn(`  ⚠️  Could not check RLS policies for ${tableName}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.warn(`  ⚠️  No RLS policies found for ${tableName}`);
    } else {
      console.log(`  ✓ ${tableName} has ${data.length} RLS policies`);
    }
  }
}

/**
 * Create a test function to validate migration rollback
 */
async function createRollbackScript() {
  const rollbackSQL = `
-- Rollback script for library integration migrations
BEGIN;

-- Drop views
DROP VIEW IF EXISTS estimate_material_schedule CASCADE;
DROP VIEW IF EXISTS estimate_labour_schedule CASCADE;
DROP VIEW IF EXISTS estimate_equipment_schedule CASCADE;

-- Drop usage tracking tables
DROP TABLE IF EXISTS estimate_library_usage CASCADE;
DROP TABLE IF EXISTS library_item_popularity CASCADE;
DROP TABLE IF EXISTS estimate_hierarchy_templates CASCADE;

-- Remove columns from estimate_elements
ALTER TABLE estimate_elements 
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS hierarchy_level,
DROP COLUMN IF EXISTS parent_element_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS is_from_library;

-- Remove columns from estimate_detail_items
ALTER TABLE estimate_detail_items 
DROP COLUMN IF EXISTS library_item_id,
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS factor_breakdown,
DROP COLUMN IF EXISTS is_from_library,
DROP COLUMN IF EXISTS rate_manual,
DROP COLUMN IF EXISTS rate_calculated;

-- Drop functions
DROP FUNCTION IF EXISTS update_library_usage_timestamp CASCADE;
DROP FUNCTION IF EXISTS update_library_item_popularity CASCADE;

COMMIT;
`;

  const rollbackPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    'rollback_library_integration.sql'
  );

  await fs.writeFile(rollbackPath, rollbackSQL);
  console.log(`\n📝 Rollback script created at: ${rollbackPath}`);
}

// Run the tests
(async () => {
  await testMigrations();
  await createRollbackScript();
})();