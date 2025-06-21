// Test script to import estimate data from PR-003 to cost_control_items
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

async function testImport() {
  try {
    const projectId = 'PR-003'; // Hardcoded project ID based on our previous test
    console.log(`Testing import for project: ${projectId}`);
    
    // Fetch estimate items for this project
    console.log('Fetching estimate items...');
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
    
    console.log(`Found ${estimateItems?.length || 0} estimate items for project ${projectId}`);
    
    if (!estimateItems || estimateItems.length === 0) {
      console.log('No estimate items found for this project');
      return;
    }
    
    // Transform estimate items to cost control items
    console.log('Transforming estimate items to cost control items...');
    const costControlItems = transformToCostControlItems(estimateItems);
    console.log(`Created ${costControlItems.length} cost control items`);
    
    // Insert cost control items into the database
    console.log('Inserting cost control items into the database...');
    
    // First, check if we have transformed items
    if (costControlItems.length === 0) {
      console.error('No cost control items created');
      return;
    }
    
    // Log the first item for debug purposes
    console.log('First item to insert:', costControlItems[0]);
    
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
      } else {
        console.log('Import successful on second attempt!');
        console.log(`Inserted ${retryData?.length || 0} items`);
      }
    } else {
      console.log('Import successful!');
      console.log(`Inserted ${insertData?.length || 0} items`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testImport(); 