// Check the structure of the cost_control_items table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    console.log('Checking cost_control_items table structure...');
    
    // Use SQL query to get the table structure directly
    const { data: columnInfo, error: columnError } = await supabase.rpc(
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
    
    if (columnError) {
      console.error('Error checking table structure:', columnError);
      return;
    }
    
    console.log('Column information:');
    if (columnInfo && columnInfo.length > 0) {
      columnInfo.forEach(row => {
        console.log(row);
      });
    } else {
      console.log('No column information found.');
    }
    
    // Create a sample item to see if we can insert
    const sampleItem = {
      id: '00000000-0000-0000-0000-000000000001',
      project_id: '00000000-0000-0000-0000-000000000002',
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
      imported_from_estimate: true,
      import_date: new Date().toISOString()
    };
    
    console.log('Attempting to insert sample item...');
    const { error: insertError } = await supabase
      .from('cost_control_items')
      .insert(sampleItem)
      .select();
      
    if (insertError) {
      console.error('Error inserting sample item:', insertError);
    } else {
      console.log('Successfully inserted sample item.');
      
      // Clean up the sample item
      const { error: deleteError } = await supabase
        .from('cost_control_items')
        .delete()
        .eq('id', sampleItem.id);
        
      if (deleteError) {
        console.error('Error deleting sample item:', deleteError);
      } else {
        console.log('Successfully deleted sample item.');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTable(); 