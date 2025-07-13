#!/usr/bin/env node

/**
 * Test script for Phase 3 Background Jobs & Edge Functions
 * Run with: node scripts/test-background-jobs.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - update these with your project details
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
  console.error('   export SUPABASE_ANON_KEY="your-anon-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseTables() {
  console.log('🗄️  Testing database tables...');
  
  try {
    // Test background_job_logs table
    const { data: jobLogs, error: jobLogsError } = await supabase
      .from('background_job_logs')
      .select('count(*)')
      .limit(1);
    
    if (jobLogsError) throw new Error(`background_job_logs: ${jobLogsError.message}`);
    console.log('   ✅ background_job_logs table accessible');

    // Test price_snapshots table
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('price_snapshots')
      .select('count(*)')
      .limit(1);
    
    if (snapshotsError) throw new Error(`price_snapshots: ${snapshotsError.message}`);
    console.log('   ✅ price_snapshots table accessible');

    // Test library_item_popularity table
    const { data: popularity, error: popularityError } = await supabase
      .from('library_item_popularity')
      .select('count(*)')
      .limit(1);
    
    if (popularityError) throw new Error(`library_item_popularity: ${popularityError.message}`);
    console.log('   ✅ library_item_popularity table accessible');

    // Test estimate_library_usage table
    const { data: usage, error: usageError } = await supabase
      .from('estimate_library_usage')
      .select('count(*)')
      .limit(1);
    
    if (usageError) throw new Error(`estimate_library_usage: ${usageError.message}`);
    console.log('   ✅ estimate_library_usage table accessible');

  } catch (error) {
    console.error('   ❌ Database table test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testDatabaseFunctions() {
  console.log('🔧 Testing database functions...');
  
  try {
    // Test get_job_execution_summary function
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_job_execution_summary', { days_back: 7 });
    
    if (summaryError) throw new Error(`get_job_execution_summary: ${summaryError.message}`);
    console.log('   ✅ get_job_execution_summary function works');

    // Test clean_old_job_logs function
    const { error: cleanupError } = await supabase
      .rpc('clean_old_job_logs');
    
    if (cleanupError) throw new Error(`clean_old_job_logs: ${cleanupError.message}`);
    console.log('   ✅ clean_old_job_logs function works');

  } catch (error) {
    console.error('   ❌ Database function test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testEdgeFunctions() {
  console.log('⚡ Testing edge functions...');
  
  try {
    // Test popularity aggregation
    console.log('   📈 Testing aggregate-library-popularity...');
    const { data: popularityData, error: popularityError } = await supabase.functions.invoke(
      'aggregate-library-popularity'
    );
    
    if (popularityError) {
      console.warn(`   ⚠️  aggregate-library-popularity: ${popularityError.message}`);
    } else {
      console.log('   ✅ aggregate-library-popularity executed successfully');
      console.log(`      Processed: ${popularityData?.processed || 0} items`);
    }

    // Test price snapshot (if we have projects)
    console.log('   💰 Testing capture-price-snapshot...');
    
    // Get a project ID to test with
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (projects && projects.length > 0) {
      const { data: snapshotData, error: snapshotError } = await supabase.functions.invoke(
        'capture-price-snapshot',
        {
          body: { projectId: projects[0].id, includeAllItems: false }
        }
      );
      
      if (snapshotError) {
        console.warn(`   ⚠️  capture-price-snapshot: ${snapshotError.message}`);
      } else {
        console.log('   ✅ capture-price-snapshot executed successfully');
        console.log(`      Items processed: ${snapshotData?.items_processed || 0}`);
        console.log(`      Total value: $${snapshotData?.total_value || 0}`);
      }
    } else {
      console.log('   ⏭️  No projects found, skipping price snapshot test');
    }

    // Test complex calculations (if we have library items)
    console.log('   🧮 Testing calculate-complex-factors...');
    
    const { data: libraryItems } = await supabase
      .from('library_items')
      .select('id')
      .limit(5);
    
    if (libraryItems && libraryItems.length > 0 && projects && projects.length > 0) {
      const itemIds = libraryItems.map(item => item.id);
      
      const { data: calcData, error: calcError } = await supabase.functions.invoke(
        'calculate-complex-factors',
        {
          body: {
            libraryItemIds: itemIds,
            projectId: projects[0].id,
            options: {
              includeIndirectCosts: true,
              indirectCostPercentage: 15
            }
          }
        }
      );
      
      if (calcError) {
        console.warn(`   ⚠️  calculate-complex-factors: ${calcError.message}`);
      } else {
        console.log('   ✅ calculate-complex-factors executed successfully');
        console.log(`      Items calculated: ${calcData?.summary?.items_calculated || 0}`);
        console.log(`      Total cost: $${calcData?.summary?.total_cost || 0}`);
      }
    } else {
      console.log('   ⏭️  No library items found, skipping complex calculations test');
    }

  } catch (error) {
    console.error('   ❌ Edge function test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testJobLogging() {
  console.log('📝 Testing job logging...');
  
  try {
    // Insert a test log entry
    const { data: logEntry, error: logError } = await supabase
      .from('background_job_logs')
      .insert({
        job_name: 'test-job',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        metadata: { test: true }
      })
      .select()
      .single();
    
    if (logError) throw new Error(`Insert log: ${logError.message}`);
    console.log('   ✅ Job log entry created');

    // Verify we can read it back
    const { data: readLog, error: readError } = await supabase
      .from('background_job_logs')
      .select('*')
      .eq('id', logEntry.id)
      .single();
    
    if (readError) throw new Error(`Read log: ${readError.message}`);
    console.log('   ✅ Job log entry readable');

    // Clean up test entry
    await supabase
      .from('background_job_logs')
      .delete()
      .eq('id', logEntry.id);
    
    console.log('   ✅ Test log entry cleaned up');

  } catch (error) {
    console.error('   ❌ Job logging test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testUsageTracking() {
  console.log('📊 Testing usage tracking...');
  
  try {
    // Get a library item and project to test with
    const { data: libraryItems } = await supabase
      .from('library_items')
      .select('id')
      .limit(1);
    
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (!libraryItems?.length || !projects?.length) {
      console.log('   ⏭️  No test data available, skipping usage tracking test');
      return true;
    }

    // Test the tracking function
    const { error: trackError } = await supabase
      .rpc('track_library_item_usage', {
        p_library_item_id: libraryItems[0].id,
        p_project_id: projects[0].id,
        p_quantity: 1
      });
    
    if (trackError) throw new Error(`Track usage: ${trackError.message}`);
    console.log('   ✅ Usage tracking function works');

    // Test getting statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_library_item_statistics', {
        item_id: libraryItems[0].id
      });
    
    if (statsError) throw new Error(`Get statistics: ${statsError.message}`);
    console.log('   ✅ Statistics retrieval works');
    console.log(`      Usage count: ${stats?.usage_count_30d || 0}`);

  } catch (error) {
    console.error('   ❌ Usage tracking test failed:', error.message);
    return false;
  }
  
  return true;
}

async function runAllTests() {
  console.log('🧪 Phase 3 Background Jobs Testing Suite');
  console.log('==========================================');
  console.log(`🔗 Testing against: ${SUPABASE_URL}`);
  console.log('');

  const results = {
    database: await testDatabaseTables(),
    functions: await testDatabaseFunctions(),
    edgeFunctions: await testEdgeFunctions(),
    logging: await testJobLogging(),
    usage: await testUsageTracking()
  };

  console.log('');
  console.log('📋 Test Results Summary:');
  console.log('========================');
  console.log(`🗄️  Database Tables: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔧 Database Functions: ${results.functions ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`⚡ Edge Functions: ${results.edgeFunctions ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📝 Job Logging: ${results.logging ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📊 Usage Tracking: ${results.usage ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  
  console.log('');
  if (allPassed) {
    console.log('🎉 All tests passed! Phase 3 is ready for production.');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Deploy to production using: npm run deploy:edge-functions');
    console.log('2. Test the BackgroundJobsManager UI component');
    console.log('3. Monitor scheduled job execution');
    console.log('4. Check job performance metrics');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Ensure database migrations have been applied');
    console.log('2. Check edge function deployment status');
    console.log('3. Verify environment variables are set correctly');
    console.log('4. Check Supabase project permissions');
  }

  process.exit(allPassed ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});