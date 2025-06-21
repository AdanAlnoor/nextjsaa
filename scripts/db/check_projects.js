// Check for available project IDs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
  try {
    console.log('Fetching available projects...');
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);
      
    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    
    console.log('Available projects:');
    console.log(projects);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkProjects(); 