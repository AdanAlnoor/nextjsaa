// Test script to fetch estimate data
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

async function testFetchEstimate() {
  try {
    console.log('Fetching available projects...');
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);
      
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }
    
    console.log('Available projects:');
    console.log(projects);
    
    // Try fetching estimate items for each project
    for (const project of projects) {
      console.log(`\n--------------------------------------------`);
      console.log(`Testing with project ID: ${project.id} (${project.name})`);
      
      // Fetch estimate items for this project
      console.log('Fetching estimate items...');
      const { data: estimateItems, error: estimateError } = await supabase
        .from('estimate_items')
        .select('id, name, amount, level, parent_id, project_id')
        .eq('project_id', project.id)
        .in('level', [0, 1])
        .order('level', { ascending: true });
      
      if (estimateError) {
        console.error('Error fetching estimate items:', estimateError);
        continue;
      }
      
      console.log(`Found ${estimateItems?.length || 0} estimate items for project ${project.id}`);
      
      if (estimateItems && estimateItems.length > 0) {
        console.log('First 3 items:');
        console.log(estimateItems.slice(0, 3));

        // Test if we're ready to transform
        console.log('\nMapping data structures:');
        const level0Items = estimateItems.filter(item => item.level === 0);
        console.log(`Found ${level0Items.length} level 0 items`);
        
        if (level0Items.length > 0) {
          console.log('First level 0 item:', level0Items[0]);
          
          // Find children of first level 0 item
          const childItems = estimateItems.filter(
            item => item.level === 1 && item.parent_id === level0Items[0].id
          );
          
          console.log(`Found ${childItems.length} children for the first level 0 item`);
          if (childItems.length > 0) {
            console.log('First child:', childItems[0]);
          }
        }
      } else {
        console.log('No estimate items found for this project');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testFetchEstimate();
