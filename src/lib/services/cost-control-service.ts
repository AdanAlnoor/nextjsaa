import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/types/supabase'
import { CostControlData, CostControlItem, mapDbToCostControlData } from '@/types/supabase'

// Initialize Supabase client
const supabase = createClient()

type CostControlRow = Database['public']['Tables']['cost_control_items']['Row']

/**
 * Transform database rows into a hierarchical structure for the UI
 */
export function transformCostControlData(rows: CostControlRow[]): CostControlData[] {
  console.log("Transforming cost control data from DB rows:", rows);
  
  if (!rows || rows.length === 0) {
    console.log("No rows to transform");
    return [];
  }
  
  // Log the structure of the first row to help debug
  if (rows.length > 0) {
    console.log("First row structure:", Object.keys(rows[0]));
    console.log("First row values:", rows[0]);
  }
  
  try {
    // First, convert database rows to UI data structure
    const items: CostControlData[] = rows.map(row => {
      try {
        // Log each row and the mapped result for debugging
        const mappedItem = mapDbToCostControlData(row as any);
        console.log("Mapped item from DB row:", row.id, mappedItem);
        return mappedItem;
      } catch (error) {
        console.error("Error mapping row to CostControlData:", error, row);
        // Return a default item with minimal data to prevent UI crashes
        return {
          id: row.id || 'unknown',
          name: row.name || 'Error item',
          boAmount: row.bo_amount || 0,
          actual: calculateActualAmount(row),
          difference: (row.bo_amount || 0) - calculateActualAmount(row),
          paidBills: row.paid_bills || 0,
          externalBills: row.external_bills || 0,
          pendingBills: row.pending_bills || 0,
          wages: row.wages || 0,
          isParent: row.is_parent || false,
          isOpen: row.is_parent || false
        };
      }
    });

    // Helper function to calculate actual amount
    function calculateActualAmount(row: any): number {
      const paidBills = Number(row.paid_bills) || 0;
      const externalBills = Number(row.external_bills) || 0;
      const wages = Number(row.wages) || 0;
      
      // Actual amount is the sum of paid bills, external bills, and wages
      return paidBills + externalBills + wages;
    }

    // Create a map for efficient lookups
    const itemMap = new Map<string, CostControlData>();
    items.forEach(item => {
      itemMap.set(item.id, item);
    });

    // Build parent-child relationships
    const parentChildMap = new Map<string, string[]>();
    
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

    console.log("Transformed cost control data:", items);
    return items;
  } catch (error) {
    console.error("Error in transformCostControlData:", error);
    return [];
  }
}

/**
 * Fetch cost control data for a specific project
 */
export async function fetchCostControlData(projectId: string): Promise<CostControlData[]> {
  try {
    console.log("Fetching cost control data for project:", projectId);
    
    // First, check if the table exists by querying a single row
    const { data: tableCheck, error: tableError } = await supabase
      .from('cost_control_items')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('Error checking cost_control_items table:', tableError);
      return [];
    }
    
    console.log("Table check result:", tableCheck);
    
    // Now fetch the actual data, filtering out orphaned items
    const { data, error } = await supabase
      .from('cost_control_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching cost control data:', error);
      return [];
    }
    
    console.log(`Fetched ${data?.length || 0} cost control items for project ${projectId}`);
    
    // Filter out orphaned items by checking if their estimate references still exist
    const validItems = []
    
    if (data && data.length > 0) {
      for (const item of data) {
        let isValid = false
        
        if (item.level === 0) {
          // Check if the structure still exists
          const { data: structureExists } = await supabase
            .from('estimate_structures')
            .select('id')
            .eq('id', item.estimate_item_id)
            .single()
          isValid = !!structureExists
        } else if (item.level === 1) {
          // Check if the element still exists
          const { data: elementExists } = await supabase
            .from('estimate_elements')
            .select('id')
            .eq('id', item.estimate_item_id)
            .single()
          isValid = !!elementExists
        } else {
          // Keep other levels for now
          isValid = true
        }
        
        if (isValid) {
          validItems.push(item)
        } else {
          console.log(`Filtering out orphaned item: ${item.name} (${item.level})`)
        }
      }
    }
    
    console.log(`After filtering orphaned items: ${validItems.length} valid items`);
    
    if (validItems && validItems.length > 0) {
      console.log("Sample valid data item:", validItems[0]);
    }

    return transformCostControlData(validItems);
  } catch (error) {
    console.error('Unexpected error in fetchCostControlData:', error);
    return [];
  }
}

/**
 * Create a new cost control item
 */
export async function createCostControlItem(
  projectId: string,
  item: Omit<Database['public']['Tables']['cost_control_items']['Insert'], 'id' | 'project_id'>
) {
  try {
    const { data, error } = await supabase
      .from('cost_control_items')
      .insert({
        project_id: projectId,
        ...item
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating cost control item:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

/**
 * Update an existing cost control item
 */
export async function updateCostControlItem(
  id: string,
  updates: Partial<Database['public']['Tables']['cost_control_items']['Update']>
) {
  try {
    const { data, error } = await supabase
      .from('cost_control_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating cost control item:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

/**
 * Delete a cost control item
 */
export async function deleteCostControlItem(id: string) {
  try {
    const { error } = await supabase
      .from('cost_control_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting cost control item:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error:', error)
    return false
  }
} 