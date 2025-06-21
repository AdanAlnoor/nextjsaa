const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = 'https://jrsubdglzxjoqpgbbxbq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3ViZGdsenhqb3FwZ2JieGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNDk0NzQsImV4cCI6MjA1NTgyNTQ3NH0.FzLxZV2mpVRTWVRace_ZskRBPn6gjXGZWvEvwHyUQ8o';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Try to fetch data from a table
    const { data, error } = await supabase
      .from('projects')
      .select('count');
    
    if (error) {
      console.error('Error querying Supabase:', error);
    } else {
      console.log('Connection successful! Data:', data);
    }
  } catch (err) {
    console.error('Exception when connecting to Supabase:', err);
  }
}

testConnection(); 