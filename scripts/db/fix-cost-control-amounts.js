// Script to fix cost control parent amounts by recalculating them based on the sum of their children
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables from .env.local
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error loading .env.local file:', error);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key are required. Make sure they are defined in .env.local');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCostControlAmounts(projectId) {
  console.log(`Starting to fix cost control amounts for project: ${projectId}`);
  
  try {
    // 1. Fetch all cost control items for the project
    const { data: costControlItems, error: fetchError } = await supabase
      .from('cost_control_items')
      .select('*')
      .eq('project_id', projectId)
      .order('level', { ascending: true });
      
    if (fetchError) {
      console.error('Error fetching cost control items:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log(`Fetched ${costControlItems.length} cost control items`);
    
    // 2. Group items by parent_id
    const itemsByParentId = {};
    const parentItems = [];
    
    costControlItems.forEach(item => {
      if (item.is_parent) {
        parentItems.push(item);
      }
      
      if (item.parent_id) {
        if (!itemsByParentId[item.parent_id]) {
          itemsByParentId[item.parent_id] = [];
        }
        itemsByParentId[item.parent_id].push(item);
      }
    });
    
    console.log(`Found ${parentItems.length} parent items`);
    
    // 3. Update each parent's bo_amount based on the sum of its children
    const updates = [];
    
    for (const parentItem of parentItems) {
      const children = itemsByParentId[parentItem.id] || [];
      const childrenSum = children.reduce((sum, child) => sum + (child.bo_amount || 0), 0);
      
      console.log(`Parent: ${parentItem.name}, Current bo_amount: ${parentItem.bo_amount}, Sum of children: ${childrenSum}`);
      
      if (Math.abs((parentItem.bo_amount || 0) - childrenSum) > 0.01) {
        console.log(`Updating parent ${parentItem.name} bo_amount from ${parentItem.bo_amount} to ${childrenSum}`);
        
        const { data, error } = await supabase
          .from('cost_control_items')
          .update({ bo_amount: childrenSum })
          .eq('id', parentItem.id);
          
        if (error) {
          console.error(`Error updating parent ${parentItem.name}:`, error);
        } else {
          updates.push({
            id: parentItem.id,
            name: parentItem.name,
            oldAmount: parentItem.bo_amount,
            newAmount: childrenSum
          });
        }
      }
    }
    
    console.log('Updates completed:', updates);
    return { success: true, updates };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}

// Check if project ID is provided as command line argument
const projectId = process.argv[2];

if (!projectId) {
  console.error('Please provide a project ID as a command line argument');
  console.log('Usage: node fix-cost-control-amounts.js PROJECT_ID');
  process.exit(1);
}

// Run the fix function
fixCostControlAmounts(projectId)
  .then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error running fix script:', error);
    process.exit(1);
  }); 