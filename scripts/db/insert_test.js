// Check if we can insert into the cost_control_items table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTest() {
  try {
    // Create a sample item to see if we can insert
    const sampleItem = {
      id: '00000000-0000-0000-0000-000000000001',
      project_id: 'PR-001', // Real project ID
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
    
    console.log('Attempting to insert sample item:', sampleItem);
    
    const { data, error } = await supabase
      .from('cost_control_items')
      .insert(sampleItem)
      .select();
      
    if (error) {
      console.error('Error inserting sample item:', error);
      
      // Let's try without the additional fields
      delete sampleItem.imported_from_estimate;
      delete sampleItem.import_date;
      
      console.log('Trying again without imported_from_estimate and import_date fields');
      const { data: data2, error: error2 } = await supabase
        .from('cost_control_items')
        .insert(sampleItem)
        .select();
        
      if (error2) {
        console.error('Second attempt error:', error2);
      } else {
        console.log('Second attempt succeeded:', data2);
      }
    } else {
      console.log('Successfully inserted sample item:', data);
      
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

insertTest(); 