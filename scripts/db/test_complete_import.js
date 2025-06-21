// Complete import test script
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to transform estimate items to cost control items
function transformToCostControlItems(estimateItems) {
  // Filter level 0 items
  const level0Items = estimateItems.filter(item => item.level === 0);
  console.log(`Processing ${level0Items.length} level 0 items...`);
  
  // Create a map of Level 0 items with their children
  const result = [];
  let orderIndex = 0;
  
  level0Items.forEach(parentItem => {
    // Find all Level 1 items that have this parent
    const childItems = estimateItems.filter(
      item => item.level === 1 && item.parent_id === parentItem.id
    );
    console.log(`Found ${childItems.length} children for ${parentItem.name}`);
    
    // Create the parent item - MAP name to name and amount to bo_amount
    const parentId = uuidv4();
    const parentCostControlItem = {
      id: parentId,
      name: parentItem.name, 
      bo_amount: parentItem.amount || 0,
      actual_amount: 0,
      paid_bills: 0,
      external_bills: 0,
      pending_bills: 0,
      wages: 0,
      is_parent: true,
      level: 0,
      order_index: orderIndex++,
      parent_id: null,
      project_id: parentItem.project_id,
      imported_from_estimate: true,
      import_date: new Date().toISOString()
    };
    
    console.log(`Created parent item: ${parentCostControlItem.name}`);
    result.push(parentCostControlItem);
    
    // Add all children
    childItems.forEach(childItem => {
      const childCostControlItem = {
        id: uuidv4(),
        name: childItem.name,
        bo_amount: childItem.amount || 0,
        actual_amount: 0,
        paid_bills: 0,
        external_bills: 0,
        pending_bills: 0,
        wages: 0,
        is_parent: false,
        level: 1,
        order_index: orderIndex++,
        parent_id: parentId,
        project_id: childItem.project_id,
        imported_from_estimate: true,
        import_date: new Date().toISOString()
      };
      
      console.log(`Created child item: ${childCostControlItem.name}`);
      result.push(childCostControlItem);
    });
  });
  
  return result;
}

// Function to check if cost control items exist for a project
async function checkCostControlItems(projectId) {
  const { data, error } = await supabase
    .from('cost_control_items')
    .select('*')
    .eq('project_id', projectId);
    
  if (error) {
    console.error('Error fetching cost control items:', error);
    return { exists: false, count: 0, items: [] };
  }
  
  return { exists: data && data.length > 0, count: data?.length || 0, items: data || [] };
}

async function runCompleteTest() {
  try {
    const projectId = 'PR-003'; // Hardcoded project ID based on our previous test
    console.log(`\n=== COMPLETE IMPORT TEST FOR PROJECT: ${projectId} ===\n`);
    
    // STEP 1: Check if cost control items already exist for this project
    console.log('\nSTEP 1: Checking existing cost control items...');
    
    const { exists, count, items } = await checkCostControlItems(projectId);
    console.log(`Cost control items exist for project: ${exists ? 'YES' : 'NO'}`);
    console.log(`Number of existing items: ${count}`);
    
    if (exists && count > 0) {
      console.log('First item:', items[0]);
      
      // If items exist, we'll delete them to start fresh
      console.log('\nDeleting existing cost control items for this project...');
      const { error: deleteError } = await supabase
        .from('cost_control_items')
        .delete()
        .eq('project_id', projectId);
        
      if (deleteError) {
        console.error('Error deleting existing items:', deleteError);
        return;
      }
      
      console.log(`Deleted ${count} existing cost control items`);
    }
    
    // STEP 2: Fetch estimate items for this project
    console.log('\nSTEP 2: Fetching estimate items...');
    
    const { data: estimateItems, error: estimateError } = await supabase
      .from('estimate_items')
      .select('id, name, amount, level, parent_id, project_id')
      .eq('project_id', projectId)
      .in('level', [0, 1])
      .order('level', { ascending: true });
    
    if (estimateError) {
      console.error('Error fetching estimate items:', estimateError);
      return;
    }
    
    const estimateCount = estimateItems?.length || 0;
    console.log(`Found ${estimateCount} estimate items for project ${projectId}`);
    
    if (estimateCount === 0) {
      console.log('No estimate items found for this project');
      return;
    }
    
    // Quick analysis of estimate data
    const level0Count = estimateItems.filter(item => item.level === 0).length;
    const level1Count = estimateItems.filter(item => item.level === 1).length;
    
    console.log(`Level 0 items: ${level0Count}`);
    console.log(`Level 1 items: ${level1Count}`);
    
    // STEP 3: Transform estimate items to cost control items
    console.log('\nSTEP 3: Transforming estimate items to cost control items...');
    
    const costControlItems = transformToCostControlItems(estimateItems);
    console.log(`Created ${costControlItems.length} cost control items`);
    
    // STEP 4: Insert cost control items into the database
    console.log('\nSTEP 4: Inserting cost control items into the database...');
    
    // First, check if we have transformed items
    if (costControlItems.length === 0) {
      console.error('No cost control items created');
      return;
    }
    
    // Insert the items
    const { data: insertData, error: insertError } = await supabase
      .from('cost_control_items')
      .insert(costControlItems)
      .select();
      
    if (insertError) {
      console.error('Error inserting cost control items:', insertError);
      
      // Try inserting without the import fields
      console.log('Trying again without import-related fields...');
      const simplifiedItems = costControlItems.map(item => {
        const { imported_from_estimate, import_date, ...rest } = item;
        return rest;
      });
      
      const { data: retryData, error: retryError } = await supabase
        .from('cost_control_items')
        .insert(simplifiedItems)
        .select();
        
      if (retryError) {
        console.error('Second attempt error:', retryError);
        return;
      } else {
        console.log('Import successful on second attempt!');
        console.log(`Inserted ${retryData?.length || 0} items`);
      }
    } else {
      console.log('Import successful!');
      console.log(`Inserted ${insertData?.length || 0} items`);
    }
    
    // STEP 5: Verify the items were inserted correctly
    console.log('\nSTEP 5: Verifying inserted cost control items...');
    
    const { exists: existsAfter, count: countAfter, items: itemsAfter } = await checkCostControlItems(projectId);
    console.log(`Cost control items exist for project after import: ${existsAfter ? 'YES' : 'NO'}`);
    console.log(`Number of items after import: ${countAfter}`);
    
    if (existsAfter && countAfter > 0) {
      // Check some basic stats about the imported data
      const parentItems = itemsAfter.filter(item => item.is_parent);
      const childItems = itemsAfter.filter(item => !item.is_parent);
      
      console.log(`Parent items: ${parentItems.length}`);
      console.log(`Child items: ${childItems.length}`);
      
      console.log('\nSample parent item:');
      console.log(parentItems[0]);
      
      if (childItems.length > 0) {
        console.log('\nSample child item:');
        console.log(childItems[0]);
      }
      
      // Verify parent-child relationships
      if (parentItems.length > 0 && childItems.length > 0) {
        console.log('\nVerifying parent-child relationships...');
        
        const firstParentId = parentItems[0].id;
        const childrenOfFirstParent = itemsAfter.filter(item => item.parent_id === firstParentId);
        
        console.log(`First parent (${parentItems[0].name}) has ${childrenOfFirstParent.length} children`);
        
        if (childrenOfFirstParent.length > 0) {
          console.log(`First child: ${childrenOfFirstParent[0].name}`);
        }
      }
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

runCompleteTest();
