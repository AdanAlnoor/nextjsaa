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
    console.log('Checking if cost_control_items table exists...');
    
    // Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('cost_control_items')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('Error checking table:', tableError);
      console.log('Table may not exist or there might be permission issues');
      return;
    }
    
    console.log('Table exists:', !!tableExists);
    
    // Try to query one row to at least see some data
    const { data: sampleRow, error: sampleError } = await supabase
      .from('cost_control_items')
      .select('*')
      .limit(1)
      .single();
      
    if (sampleError) {
      console.error('Error getting sample row:', sampleError);
    } else if (sampleRow) {
      console.log('Sample row structure:');
      console.log(Object.keys(sampleRow).join(', '));
    } else {
      console.log('No sample rows found in table.');
      
      // Let's check the table schema directly
      const { data: columns, error: columnsError } = await supabase.rpc(
        'list_tables'
      );
      
      if (columnsError) {
        console.error('Error listing tables:', columnsError);
      } else {
        console.log('Tables in database:', columns);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTable(); 