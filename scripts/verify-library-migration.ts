import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VerificationResult {
  category: string;
  item: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

const results: VerificationResult[] = [];

function logResult(category: string, item: string, status: 'success' | 'error' | 'warning', message: string) {
  results.push({ category, item, status, message });
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
  console.log(`${icon} ${category} - ${item}: ${message}`);
}

/**
 * Verify Library Integration Migration
 */
async function verifyMigration() {
  console.log('🔍 Verifying Library Integration Migration\n');

  try {
    // 1. Check estimate_elements columns
    console.log('📋 Checking estimate_elements columns...');
    await checkTableColumns('estimate_elements', [
      'library_division_id',
      'library_section_id',
      'library_assembly_id',
      'hierarchy_level',
      'parent_element_id',
      'library_code',
      'library_path',
      'is_from_library',
    ]);

    // 2. Check estimate_detail_items columns
    console.log('\n📋 Checking estimate_detail_items columns...');
    await checkTableColumns('estimate_detail_items', [
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
    ]);

    // 3. Check views
    console.log('\n📋 Checking schedule views...');
    await checkViews([
      'estimate_material_schedule',
      'estimate_labour_schedule',
      'estimate_equipment_schedule',
    ]);

    // 4. Check usage tracking tables
    console.log('\n📋 Checking usage tracking tables...');
    await checkTables([
      'estimate_library_usage',
      'library_item_popularity',
      'estimate_hierarchy_templates',
    ]);

    // 5. Check indexes
    console.log('\n📋 Checking indexes...');
    await checkIndexes([
      'idx_estimate_elements_library_refs',
      'idx_estimate_detail_items_library_refs',
      'idx_estimate_hierarchy',
      'idx_library_usage_project',
      'idx_library_usage_item',
    ]);

    // 6. Test view functionality
    console.log('\n📋 Testing view functionality...');
    await testViews();

    // 7. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);

    if (errorCount > 0) {
      console.log('\n❌ Migration verification failed with errors:');
      results.filter(r => r.status === 'error').forEach(r => {
        console.log(`  - ${r.category}: ${r.item} - ${r.message}`);
      });
      process.exit(1);
    } else if (warningCount > 0) {
      console.log('\n⚠️  Migration completed with warnings:');
      results.filter(r => r.status === 'warning').forEach(r => {
        console.log(`  - ${r.category}: ${r.item} - ${r.message}`);
      });
    } else {
      console.log('\n✅ All migration checks passed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

async function checkTableColumns(tableName: string, expectedColumns: string[]) {
  try {
    // Get table structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    if (error) {
      logResult('Table Columns', tableName, 'error', `Failed to query table: ${error.message}`);
      return;
    }

    // The query returns an empty array, but we can check the table exists
    logResult('Table Columns', tableName, 'success', 'Table exists and is accessible');

    // Check individual columns by attempting to query them
    for (const column of expectedColumns) {
      try {
        const { error: colError } = await supabase
          .from(tableName)
          .select(column)
          .limit(0);

        if (colError) {
          logResult('Table Columns', `${tableName}.${column}`, 'error', 'Column not found');
        } else {
          logResult('Table Columns', `${tableName}.${column}`, 'success', 'Column exists');
        }
      } catch (err) {
        logResult('Table Columns', `${tableName}.${column}`, 'error', 'Column check failed');
      }
    }
  } catch (error) {
    logResult('Table Columns', tableName, 'error', `Table check failed: ${error}`);
  }
}

async function checkViews(viewNames: string[]) {
  for (const viewName of viewNames) {
    try {
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .limit(0);

      if (error) {
        logResult('Views', viewName, 'error', `View not accessible: ${error.message}`);
      } else {
        logResult('Views', viewName, 'success', 'View exists and is accessible');
      }
    } catch (error) {
      logResult('Views', viewName, 'error', `View check failed: ${error}`);
    }
  }
}

async function checkTables(tableNames: string[]) {
  for (const tableName of tableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (error) {
        logResult('Tables', tableName, 'error', `Table not accessible: ${error.message}`);
      } else {
        logResult('Tables', tableName, 'success', 'Table exists and is accessible');
      }
    } catch (error) {
      logResult('Tables', tableName, 'error', `Table check failed: ${error}`);
    }
  }
}

async function checkIndexes(indexNames: string[]) {
  // Note: We can't directly query pg_indexes through Supabase client
  // So we'll just log as warnings
  for (const indexName of indexNames) {
    logResult('Indexes', indexName, 'warning', 'Index existence cannot be verified through client');
  }
}

async function testViews() {
  // Test material schedule view
  try {
    const { data, error } = await supabase
      .from('estimate_material_schedule')
      .select('*')
      .limit(1);

    if (error) {
      logResult('View Test', 'estimate_material_schedule', 'warning', 'View query returned error (might be empty)');
    } else {
      logResult('View Test', 'estimate_material_schedule', 'success', 'View is queryable');
    }
  } catch (error) {
    logResult('View Test', 'estimate_material_schedule', 'error', `View test failed: ${error}`);
  }

  // Test labour schedule view
  try {
    const { data, error } = await supabase
      .from('estimate_labour_schedule')
      .select('*')
      .limit(1);

    if (error) {
      logResult('View Test', 'estimate_labour_schedule', 'warning', 'View query returned error (might be empty)');
    } else {
      logResult('View Test', 'estimate_labour_schedule', 'success', 'View is queryable');
    }
  } catch (error) {
    logResult('View Test', 'estimate_labour_schedule', 'error', `View test failed: ${error}`);
  }

  // Test equipment schedule view
  try {
    const { data, error } = await supabase
      .from('estimate_equipment_schedule')
      .select('*')
      .limit(1);

    if (error) {
      logResult('View Test', 'estimate_equipment_schedule', 'warning', 'View query returned error (might be empty)');
    } else {
      logResult('View Test', 'estimate_equipment_schedule', 'success', 'View is queryable');
    }
  } catch (error) {
    logResult('View Test', 'estimate_equipment_schedule', 'error', `View test failed: ${error}`);
  }
}

// Run verification
verifyMigration();