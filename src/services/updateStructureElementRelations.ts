import { createClient } from '@/shared/lib/supabase/client'

/**
 * Fixes orphaned elements in the database by assigning them to an "Unassigned" structure
 * @param projectId The UUID of the project to fix
 * @returns A promise with the result of the operation
 */
export async function fixOrphanedElements(projectId: string): Promise<{
  success: boolean
  message: string
  fixedCount?: number
  error?: string
}> {
  const supabase = createClient()

  try {
    // First, check if there are orphaned elements (with null structure_id or non-existent structure_id)
    const { data: orphanedElements, error: findError } = await supabase
      .from('estimate_elements')
      .select('id, name, amount')
      .eq('project_id', projectId)
      .is('structure_id', null)

    if (findError) {
      throw new Error(`Error finding orphaned elements: ${findError.message}`)
    }

    // If no orphaned elements, return early
    if (!orphanedElements || orphanedElements.length === 0) {
      return {
        success: true,
        message: 'No orphaned elements found',
        fixedCount: 0
      }
    }

    // Check if an "Unassigned" structure exists, create one if not
    let unassignedStructureId: string

    const { data: existingStructure, error: structureError } = await supabase
      .from('estimate_structures')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', 'Unassigned Elements')
      .single()

    if (structureError && structureError.code !== 'PGRST116') { // PGRST116 = not found, which is expected
      throw new Error(`Error checking for existing structure: ${structureError.message}`)
    }

    if (existingStructure) {
      unassignedStructureId = existingStructure.id
    } else {
      // Create a new "Unassigned" structure
      const { data: newStructure, error: createError } = await supabase
        .from('estimate_structures')
        .insert({
          name: 'Unassigned Elements',
          amount: orphanedElements.reduce((sum, elem) => sum + (Number(elem.amount) || 0), 0),
          project_id: projectId
        })
        .select('id')
        .single()

      if (createError) {
        throw new Error(`Error creating unassigned structure: ${createError.message}`)
      }

      unassignedStructureId = newStructure.id
    }

    // Update all orphaned elements to use the unassigned structure
    const { data: updatedElements, error: updateError } = await supabase
      .from('estimate_elements')
      .update({ structure_id: unassignedStructureId })
      .eq('project_id', projectId)
      .is('structure_id', null)
      .select('id')

    if (updateError) {
      throw new Error(`Error updating orphaned elements: ${updateError.message}`)
    }

    // Return success result
    return {
      success: true,
      message: `Successfully fixed ${orphanedElements.length} orphaned elements`,
      fixedCount: orphanedElements.length
    }
  } catch (error) {
    console.error('Failed to fix orphaned elements:', error)
    return {
      success: false,
      message: 'Failed to fix orphaned elements',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Refreshes the summary data to reflect fixed relationships
 * @param projectId The UUID of the project to refresh
 */
export async function refreshSummaryAfterFix(projectId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Call the RPC function to refresh the project summary
    const { data, error } = await supabase
      .rpc('refresh_project_summary', { p_project_id: projectId })
    
    if (error) {
      console.error('Error refreshing project summary:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Failed to refresh project summary:', error)
    return false
  }
} 