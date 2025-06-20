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
  if (!rows || rows.length === 0) {
    return [];
  }
  
  try {
    // First, convert database rows to UI data structure
    const items: CostControlData[] = rows.map(row => {
      try {
        return mapDbToCostControlData(row as any);
      } catch (error) {
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

    return items;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch cost control data for a specific project
 */
export async function fetchCostControlData(projectId: string): Promise<CostControlData[]> {
  try {
    
    // First, check if the table exists by querying a single row
    const { data: tableCheck, error: tableError } = await supabase
      .from('cost_control_items')
      .select('id')
      .limit(1);
      
    if (tableError) {
      return [];
    }
    
    // Now fetch the actual data, filtering out orphaned items
    const { data, error } = await supabase
      .from('cost_control_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true });

    if (error) {
      return [];
    }
    
    // Optimize orphaned item filtering by batch checking instead of individual queries
    let validItems = data || []
    
    if (data && data.length > 0) {
      // Get all structure and element IDs that need validation
      const structureIds = data.filter(item => item.level === 0).map(item => item.estimate_item_id).filter(Boolean)
      const elementIds = data.filter(item => item.level === 1).map(item => item.estimate_item_id).filter(Boolean)
      
      // Batch check structures
      let validStructureIds = new Set<string>()
      if (structureIds.length > 0) {
        const { data: validStructures } = await supabase
          .from('estimate_structures')
          .select('id')
          .in('id', structureIds)
        validStructureIds = new Set(validStructures?.map(s => s.id) || [])
      }
      
      // Batch check elements  
      let validElementIds = new Set<string>()
      if (elementIds.length > 0) {
        const { data: validElements } = await supabase
          .from('estimate_elements')
          .select('id')
          .in('id', elementIds)
        validElementIds = new Set(validElements?.map(e => e.id) || [])
      }
      
      // Filter items based on batch results
      validItems = data.filter(item => {
        if (item.level === 0) {
          return validStructureIds.has(item.estimate_item_id)
        } else if (item.level === 1) {
          return validElementIds.has(item.estimate_item_id)
        } else {
          return true // Keep other levels
        }
      })
    }
    

    return transformCostControlData(validItems);
  } catch (error) {
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
      return null
    }

    return data
  } catch (error) {
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
      return null
    }

    return data
  } catch (error) {
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
      return false
    }

    return true
  } catch (error) {
    return false
  }
} 