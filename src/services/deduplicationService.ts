import { createClient } from '@/shared/lib/supabase/client'

/**
 * Identifies and removes duplicate structures with the same name in a project
 * @param projectId The UUID of the project to deduplicate
 * @returns Result of the deduplication operation
 */
export async function deduplicateStructures(projectId: string): Promise<{
  success: boolean
  message: string
  deduplicatedCount?: number
  error?: string
}> {
  const supabase = createClient()

  try {
    // Step 1: Get all structures for this project
    const { data: structures, error: fetchError } = await supabase
      .from('estimate_structures')
      .select('id, name, amount')
      .eq('project_id', projectId)
      .order('name')

    if (fetchError) {
      throw new Error(`Error fetching structures: ${fetchError.message}`)
    }

    if (!structures || structures.length === 0) {
      return {
        success: true,
        message: 'No structures found to deduplicate',
        deduplicatedCount: 0
      }
    }

    // Step 2: Group by name to find duplicates
    const structuresByName: Record<string, any[]> = {}
    structures.forEach(structure => {
      if (!structuresByName[structure.name]) {
        structuresByName[structure.name] = []
      }
      structuresByName[structure.name].push(structure)
    })

    // Step 3: Process each group of duplicates
    let deduplicatedCount = 0
    const structuresToDelete: string[] = []
    const reassignedStructureIds: Record<string, string> = {}

    for (const [name, dupes] of Object.entries(structuresByName)) {
      if (dupes.length > 1) {
        console.log(`Found ${dupes.length} duplicates for structure "${name}"`)
        
        // Keep the first one, mark others for deletion
        const mainStructure = dupes[0]
        
        for (let i = 1; i < dupes.length; i++) {
          const dupStructure = dupes[i]
          structuresToDelete.push(dupStructure.id)
          reassignedStructureIds[dupStructure.id] = mainStructure.id
          deduplicatedCount++
        }
      }
    }

    if (deduplicatedCount === 0) {
      return {
        success: true,
        message: 'No duplicate structures found',
        deduplicatedCount: 0
      }
    }

    // Step 4: Reassign elements from duplicate structures to the main structure
    for (const [oldId, newId] of Object.entries(reassignedStructureIds)) {
      const { error: updateError } = await supabase
        .from('estimate_elements')
        .update({ structure_id: newId })
        .eq('structure_id', oldId)

      if (updateError) {
        console.error(`Error reassigning elements from structure ${oldId} to ${newId}: ${updateError.message}`)
      }
    }

    // Step 5: Delete the duplicate structures
    const { error: deleteError } = await supabase
      .from('estimate_structures')
      .delete()
      .in('id', structuresToDelete)

    if (deleteError) {
      throw new Error(`Error deleting duplicate structures: ${deleteError.message}`)
    }

    return {
      success: true,
      message: `Successfully deduplicated ${deduplicatedCount} structures`,
      deduplicatedCount
    }
  } catch (error) {
    console.error('Failed to deduplicate structures:', error)
    return {
      success: false,
      message: 'Failed to deduplicate structures',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Identifies and removes duplicate elements with the same name within the same structure
 * @param projectId The UUID of the project to deduplicate
 * @returns Result of the deduplication operation
 */
export async function deduplicateElements(projectId: string): Promise<{
  success: boolean
  message: string
  deduplicatedCount?: number
  error?: string
}> {
  const supabase = createClient()

  try {
    // Step 1: Get all elements for this project
    const { data: elements, error: fetchError } = await supabase
      .from('estimate_elements')
      .select('id, name, amount, structure_id')
      .eq('project_id', projectId)
      .order('name')

    if (fetchError) {
      throw new Error(`Error fetching elements: ${fetchError.message}`)
    }

    if (!elements || elements.length === 0) {
      return {
        success: true,
        message: 'No elements found to deduplicate',
        deduplicatedCount: 0
      }
    }

    // Step 2: Group by structure_id and name to find duplicates
    const elementsByStructureAndName: Record<string, Record<string, any[]>> = {}
    elements.forEach(element => {
      const structureId = element.structure_id || 'unassigned'
      
      if (!elementsByStructureAndName[structureId]) {
        elementsByStructureAndName[structureId] = {}
      }
      
      if (!elementsByStructureAndName[structureId][element.name]) {
        elementsByStructureAndName[structureId][element.name] = []
      }
      
      elementsByStructureAndName[structureId][element.name].push(element)
    })

    // Step 3: Process each group of duplicates
    let deduplicatedCount = 0
    const elementsToDelete: string[] = []

    for (const [structureId, elementsByName] of Object.entries(elementsByStructureAndName)) {
      for (const [name, dupes] of Object.entries(elementsByName)) {
        if (dupes.length > 1) {
          console.log(`Found ${dupes.length} duplicates for element "${name}" in structure "${structureId}"`)
          
          // Keep the first one, mark others for deletion
          for (let i = 1; i < dupes.length; i++) {
            elementsToDelete.push(dupes[i].id)
            deduplicatedCount++
          }
        }
      }
    }

    if (deduplicatedCount === 0) {
      return {
        success: true,
        message: 'No duplicate elements found',
        deduplicatedCount: 0
      }
    }

    // Step 4: Delete the duplicate elements
    const { error: deleteError } = await supabase
      .from('estimate_elements')
      .delete()
      .in('id', elementsToDelete)

    if (deleteError) {
      throw new Error(`Error deleting duplicate elements: ${deleteError.message}`)
    }

    return {
      success: true,
      message: `Successfully deduplicated ${deduplicatedCount} elements`,
      deduplicatedCount
    }
  } catch (error) {
    console.error('Failed to deduplicate elements:', error)
    return {
      success: false,
      message: 'Failed to deduplicate elements',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Runs both structure and element deduplication and then refreshes summary data
 * @param projectId The UUID of the project to deduplicate
 * @returns Result of the deduplication operation
 */
export async function deduplicateAll(projectId: string): Promise<{
  success: boolean
  message: string
  structuresFixed?: number
  elementsFixed?: number
  error?: string
}> {
  try {
    // First deduplicate structures
    const structureResult = await deduplicateStructures(projectId)
    if (!structureResult.success) {
      return {
        success: false,
        message: `Structure deduplication failed: ${structureResult.error}`,
        error: structureResult.error
      }
    }

    // Then deduplicate elements
    const elementResult = await deduplicateElements(projectId)
    if (!elementResult.success) {
      return {
        success: false,
        message: `Element deduplication failed: ${elementResult.error}`,
        error: elementResult.error
      }
    }

    // Refresh the project summary data
    const supabase = createClient()
    await supabase.rpc('refresh_project_summary', { p_project_id: projectId })

    return {
      success: true,
      message: `Deduplication complete: ${structureResult.deduplicatedCount} structures and ${elementResult.deduplicatedCount} elements fixed`,
      structuresFixed: structureResult.deduplicatedCount,
      elementsFixed: elementResult.deduplicatedCount
    }
  } catch (error) {
    console.error('Failed to deduplicate project data:', error)
    return {
      success: false,
      message: 'Failed to deduplicate project data',
      error: error instanceof Error ? error.message : String(error)
    }
  }
} 