// Script to check the database schema for the cost_control_items table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Checking database schema for cost_control_items table...');
    
    // Check if the table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('cost_control_items')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('Error checking if table exists:', tableError);
      console.log('The cost_control_items table may not exist or there might be permission issues.');
      return;
    }
    
    console.log('Table exists:', !!tableExists);
    
    // Get the column information using a raw SQL query
    const { data: columns, error: columnsError } = await supabase.rpc(
      'execute_sql',
      {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'cost_control_items'
          ORDER BY ordinal_position;
        `
      }
    );
    
    if (columnsError) {
      console.error('Error getting column information:', columnsError);
      
      // Try an alternative approach - fetch a row and check its structure
      console.log('Trying alternative approach - fetching a sample row...');
      
      const { data: sampleRow, error: sampleError } = await supabase
        .from('cost_control_items')
        .select('*')
        .limit(1)
        .single();
        
      if (sampleError) {
        console.error('Error fetching sample row:', sampleError);
        return;
      }
      
      if (sampleRow) {
        console.log('Sample row structure:');
        console.log(Object.keys(sampleRow).join(', '));
        console.log('Sample row values:');
        console.log(sampleRow);
      } else {
        console.log('No rows found in the table.');
      }
      
      return;
    }
    
    console.log('Column information:');
    if (columns && columns.length > 0) {
      // Format the column information in a table
      console.log('Column Name | Data Type | Nullable');
      console.log('------------|-----------|----------');
      columns.forEach(col => {
        console.log(`${col.column_name.padEnd(12)} | ${col.data_type.padEnd(9)} | ${col.is_nullable}`);
      });
      
      // Check for specific columns we need
      const requiredColumns = [
        'id', 'name', 'bo_amount', 'actual_amount', 'paid_bills', 
        'external_bills', 'pending_bills', 'wages', 'is_parent', 
        'level', 'order_index', 'parent_id', 'project_id'
      ];
      
      const missingColumns = requiredColumns.filter(
        col => !columns.some(c => c.column_name === col)
      );
      
      if (missingColumns.length > 0) {
        console.error('Missing required columns:', missingColumns.join(', '));
      } else {
        console.log('All required columns are present.');
      }
    } else {
      console.log('No column information found.');
    }
    
    // Try to insert a test row
    const testId = 'test-' + Date.now();
    const testItem = {
      id: testId,
      name: 'Test Item',
      bo_amount: 100,
      actual_amount: 0,
      paid_bills: 0,
      external_bills: 0,
      pending_bills: 0,
      wages: 0,
      is_parent: true,
      level: 0,
      order_index: 0,
      parent_id: null,
      project_id: 'PR-003'
    };
    
    console.log('\nAttempting to insert a test item...');
    const { error: insertError } = await supabase
      .from('cost_control_items')
      .insert(testItem);
      
    if (insertError) {
      console.error('Error inserting test item:', insertError);
    } else {
      console.log('Successfully inserted test item.');
      
      // Clean up the test item
      const { error: deleteError } = await supabase
        .from('cost_control_items')
        .delete()
        .eq('id', testId);
        
      if (deleteError) {
        console.error('Error deleting test item:', deleteError);
      } else {
        console.log('Successfully deleted test item.');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSchema();
