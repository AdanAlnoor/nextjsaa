// Script to test the mapping between database and frontend
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

// Mock implementation of the mapDbToCostControlData function
function mapDbToCostControlData(item) {
  if (!item) {
    console.error("mapDbToCostControlData received null or undefined item");
    return {
      id: 'unknown',
      name: 'Error: Invalid item',
      boAmount: 0,
      actual: 0,
      difference: 0,
      paidBills: 0,
      externalBills: 0,
      pendingBills: 0,
      wages: 0,
      isParent: false,
      isOpen: false
    };
  }
  
  const mappedItem = {
    id: item.id || 'unknown',
    name: item.name || 'Unnamed Item',
    boAmount: typeof item.bo_amount === 'number' ? item.bo_amount : 0,
    actual: typeof item.actual_amount === 'number' ? item.actual_amount : 0,
    difference: (typeof item.bo_amount === 'number' ? item.bo_amount : 0) - 
                (typeof item.actual_amount === 'number' ? item.actual_amount : 0),
    paidBills: typeof item.paid_bills === 'number' ? item.paid_bills : 0,
    externalBills: typeof item.external_bills === 'number' ? item.external_bills : 0,
    pendingBills: typeof item.pending_bills === 'number' ? item.pending_bills : 0,
    wages: typeof item.wages === 'number' ? item.wages : 0,
    isParent: !!item.is_parent,
    isOpen: !!item.is_parent,
    level: typeof item.level === 'number' ? item.level : 0,
    parentId: item.parent_id || null,
    orderIndex: typeof item.order_index === 'number' ? item.order_index : 0,
    projectId: item.project_id || '',
    importedFromEstimate: !!item.imported_from_estimate,
    importDate: item.import_date || null
  };
  
  return mappedItem;
}

// Mock implementation of the transformCostControlData function
function transformCostControlData(rows) {
  if (!rows || rows.length === 0) {
    console.log("No rows to transform");
    return [];
  }
  
  try {
    // First, convert database rows to UI data structure
    const items = rows.map(row => {
      try {
        const mappedItem = mapDbToCostControlData(row);
        return mappedItem;
      } catch (error) {
        console.error("Error mapping row to CostControlData:", error, row);
        return {
          id: row.id || 'unknown',
          name: row.name || 'Error item',
          boAmount: row.bo_amount || 0,
          actual: row.actual_amount || 0,
          difference: (row.bo_amount || 0) - (row.actual_amount || 0),
          paidBills: row.paid_bills || 0,
          externalBills: row.external_bills || 0,
          pendingBills: row.pending_bills || 0,
          wages: row.wages || 0,
          isParent: row.is_parent || false,
          isOpen: row.is_parent || false
        };
      }
    });

    // Create a map for efficient lookups
    const itemMap = new Map();
    items.forEach(item => {
      itemMap.set(item.id, item);
    });

    // Build parent-child relationships
    const parentChildMap = new Map();
    
    rows.forEach(row => {
      if (row.parent_id) {
        const children = parentChildMap.get(row.parent_id) || [];
        children.push(row.id);
        parentChildMap.set(row.parent_id, children);
      }
    });

    // Add children to parent items
    parentChildMap.forEach((childIds, parentId) => {
      const parent = itemMap.get(parentId);
      if (parent) {
        parent.children = childIds;
      }
    });

    return items;
  } catch (error) {
    console.error("Error in transformCostControlData:", error);
    return [];
  }
}

async function testMapping() {
  try {
    console.log('Testing mapping between database and frontend...');
    
    // Fetch some cost control items
    const { data, error } = await supabase
      .from('cost_control_items')
      .select('*')
      .limit(3);
      
    if (error) {
      console.error('Error fetching cost control items:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No cost control items found.');
      return;
    }
    
    console.log(`Fetched ${data.length} cost control items.`);
    
    // Test mapping a single item
    console.log('\nTesting mapping a single item:');
    const sampleItem = data[0];
    console.log('Original item from database:');
    console.log(sampleItem);
    
    const mappedItem = mapDbToCostControlData(sampleItem);
    console.log('\nMapped item for frontend:');
    console.log(mappedItem);
    
    // Verify the mapping
    console.log('\nVerifying mapping:');
    console.log('Database bo_amount:', sampleItem.bo_amount, '-> Frontend boAmount:', mappedItem.boAmount);
    console.log('Database actual_amount:', sampleItem.actual_amount, '-> Frontend actual:', mappedItem.actual);
    console.log('Database paid_bills:', sampleItem.paid_bills, '-> Frontend paidBills:', mappedItem.paidBills);
    
    // Test transforming multiple items
    console.log('\nTesting transforming multiple items:');
    const transformedItems = transformCostControlData(data);
    console.log(`Transformed ${transformedItems.length} items.`);
    
    // Check parent-child relationships
    const parentItems = transformedItems.filter(item => item.isParent);
    const childItems = transformedItems.filter(item => !item.isParent);
    
    console.log(`Parent items: ${parentItems.length}`);
    console.log(`Child items: ${childItems.length}`);
    
    if (parentItems.length > 0) {
      const firstParent = parentItems[0];
      console.log('\nSample parent item:');
      console.log(firstParent);
      
      if (firstParent.children) {
        console.log(`This parent has ${firstParent.children.length} children.`);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testMapping();
