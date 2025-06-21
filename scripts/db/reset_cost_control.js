// Utility script to reset cost control data for a project
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

// Get project ID from command line argument
const projectId = process.argv[2];
if (!projectId) {
  console.error('Error: Project ID is required');
  console.error('Usage: node reset_cost_control.js <project_id>');
  console.error('Example: node reset_cost_control.js PR-003');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetCostControlData() {
  try {
    console.log(`Resetting cost control data for project: ${projectId}`);
    
    // Check if the project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();
      
    if (projectError) {
      console.error('Error finding project:', projectError);
      console.error(`Project with ID '${projectId}' may not exist.`);
      return;
    }
    
    console.log(`Found project: ${project.name} (${project.id})`);
    
    // Check for existing cost control items
    const { data: items, error: itemsError } = await supabase
      .from('cost_control_items')
      .select('id')
      .eq('project_id', projectId);
      
    if (itemsError) {
      console.error('Error checking for existing items:', itemsError);
      return;
    }
    
    const count = items?.length || 0;
    console.log(`Found ${count} existing cost control items`);
    
    if (count === 0) {
      console.log('No cost control items to delete.');
      return;
    }
    
    // Confirm deletion
    console.log(`\nWARNING: You are about to delete ${count} cost control items for project ${project.name}.`);
    console.log('This action cannot be undone.\n');
    
    // Since we can't get interactive console input easily in this script,
    // we'll just proceed with the deletion, but in a real application,
    // you'd want to confirm with the user first.
    
    console.log('Deleting cost control items...');
    const { error: deleteError } = await supabase
      .from('cost_control_items')
      .delete()
      .eq('project_id', projectId);
      
    if (deleteError) {
      console.error('Error deleting cost control items:', deleteError);
      return;
    }
    
    console.log(`Successfully deleted ${count} cost control items for project ${project.name}.`);
    console.log('You can now import from estimate again to recreate the cost control data.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

resetCostControlData(); 