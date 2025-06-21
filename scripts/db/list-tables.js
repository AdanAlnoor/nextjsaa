const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jrsubdglzxjoqpgbbxbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3ViZGdsenhqb3FwZ2JieGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNDk0NzQsImV4cCI6MjA1NTgyNTQ3NH0.FzLxZV2mpVRTWVRace_ZskRBPn6gjXGZWvEvwHyUQ8o';
const supabase = createClient(supabaseUrl, supabaseKey);

// List of tables to check
const tables = [
  'projects',
  'suppliers',
  'estimate_items',
  'cost_control_items',
  'purchase_orders',
  'users',
  // Additional tables that might exist
  'purchase_order_items',
  'cost_items',
  'work_done',
  'wages',
  'bills',
  'auth.users'
];

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return {
        name: tableName,
        exists: false,
        error: error.message
      };
    }
    
    // Count the records
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
      
    return {
      name: tableName,
      exists: true,
      count: countError ? 'unknown' : count
    };
  } catch (err) {
    return {
      name: tableName,
      exists: false,
      error: err.message
    };
  }
}

async function main() {
  console.log('Checking tables in Supabase project...\n');
  
  for (const table of tables) {
    const result = await checkTable(table);
    
    if (result.exists) {
      console.log(`✅ ${result.name}: EXISTS (${result.count} records)`);
    } else {
      console.log(`❌ ${result.name}: NOT FOUND - ${result.error}`);
    }
  }
  
  console.log('\nTable check complete');
}

main(); 