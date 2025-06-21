const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jrsubdglzxjoqpgbbxbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3ViZGdsenhqb3FwZ2JieGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNDk0NzQsImV4cCI6MjA1NTgyNTQ3NH0.FzLxZV2mpVRTWVRace_ZskRBPn6gjXGZWvEvwHyUQ8o';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getProjectColumns() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching project data:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No project data available to inspect columns');
      return;
    }
    
    // Get the column names from the first row
    const columns = Object.keys(data[0]);
    
    console.log('\nPROJECTS TABLE STRUCTURE:');
    console.log('========================\n');
    
    // Display each column name and its data type
    columns.forEach((column, index) => {
      const value = data[0][column];
      const type = value === null ? 'null' : typeof value;
      const sampleValue = value === null ? 'NULL' : 
                          typeof value === 'object' ? JSON.stringify(value) : 
                          String(value);
      
      console.log(`${index + 1}. ${column}`);
      console.log(`   Type: ${type}`);
      console.log(`   Sample value: ${sampleValue}`);
      console.log('');
    });
    
    console.log(`Total columns: ${columns.length}`);
    
  } catch (err) {
    console.error('Exception occurred:', err.message);
  }
}

// Execute the function
getProjectColumns(); 