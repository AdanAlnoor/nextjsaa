import { createClient } from '@/utils/supabase/client'
import { toast } from '@/components/ui/use-toast'

/**
 * Synchronizes estimate data to cost control items for a specific project
 * @param projectId - The UUID of the project to sync
 * @returns Object containing success status, count of synced items, and any error messages
 */
export async function syncEstimateToCostControl(projectId: string) {
  try {
    const supabase = createClient()
    
    // Call the RPC function
    const { data, error } = await supabase
      .rpc('sync_estimate_to_cost_control', { project_id_param: projectId })
    
    if (error) {
      console.error('Error syncing estimate to cost control:', error)
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      })
      return {
        success: false,
        count: 0,
        error: error.message
      }
    }
    
    toast({
      title: "Sync Successful",
      description: `Synchronized ${data} items from estimate.`,
      variant: "default",
    })
    
    // Return success with count of items synced
    return {
      success: true,
      count: data,
      error: null
    }
  } catch (error) {
    console.error('Unexpected error during sync:', error)
    toast({
      title: "Sync Error",
      description: error instanceof Error ? error.message : 'Unknown error occurred',
      variant: "destructive",
    })
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Retrieves cost control items for a specific project
 * @param projectId The ID of the project
 * @returns Object with success status and cost control items or error message
 */
export async function getCostControlItems(projectId: string) {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('cost_control_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('level', { ascending: true })
      .order('name')
    
    if (error) {
      console.error('Error getting cost control items:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
    
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
        }
      }
    }
    
    return { 
      success: true, 
      items: validItems 
    }
  } catch (err: any) {
    console.error('Unexpected error fetching cost control items:', err)
    return { 
      success: false, 
      error: err.message || 'An unexpected error occurred' 
    }
  }
} 