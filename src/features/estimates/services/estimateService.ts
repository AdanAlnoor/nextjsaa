import { createClient } from '@/shared/lib/supabase/client'
import type { Database } from '@/shared/types/supabase'

// Initialize Supabase client
const supabase = createClient()

export type EstimateStructure = Database['public']['Tables']['estimate_structures']['Row']
export type EstimateElement = Database['public']['Tables']['estimate_elements']['Row']
export type EstimateStructureInsert = Database['public']['Tables']['estimate_structures']['Insert']
export type EstimateElementInsert = Database['public']['Tables']['estimate_elements']['Insert']

/**
 * Fetch all estimate structures for a project
 */
export async function fetchEstimateStructures(projectId: string): Promise<EstimateStructure[]> {
  try {
    const { data, error } = await supabase
      .from('estimate_structures')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching estimate structures:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchEstimateStructures:', error)
    return []
  }
}

/**
 * Fetch all estimate elements for a project
 */
export async function fetchEstimateElements(projectId: string): Promise<EstimateElement[]> {
  try {
    const { data, error } = await supabase
      .from('estimate_elements')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching estimate elements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchEstimateElements:', error)
    return []
  }
}

/**
 * Fetch estimate elements with their structure information
 */
export async function fetchEstimateElementsWithStructures(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('estimate_elements')
      .select(`
        *,
        estimate_structures(
          id,
          name,
          code,
          description
        )
      `)
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching estimate elements with structures:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchEstimateElementsWithStructures:', error)
    return []
  }
}

/**
 * Create a new estimate structure
 */
export async function createEstimateStructure(
  data: EstimateStructureInsert
): Promise<EstimateStructure | null> {
  try {
    const { data: created, error } = await supabase
      .from('estimate_structures')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating estimate structure:', error)
      return null
    }

    return created
  } catch (error) {
    console.error('Error in createEstimateStructure:', error)
    return null
  }
}

/**
 * Create a new estimate element
 */
export async function createEstimateElement(
  data: EstimateElementInsert
): Promise<EstimateElement | null> {
  try {
    const { data: created, error } = await supabase
      .from('estimate_elements')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating estimate element:', error)
      return null
    }

    return created
  } catch (error) {
    console.error('Error in createEstimateElement:', error)
    return null
  }
}

/**
 * Update an estimate structure
 */
export async function updateEstimateStructure(
  id: string,
  updates: Partial<Database['public']['Tables']['estimate_structures']['Update']>
): Promise<EstimateStructure | null> {
  try {
    const { data, error } = await supabase
      .from('estimate_structures')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating estimate structure:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateEstimateStructure:', error)
    return null
  }
}

/**
 * Update an estimate element
 */
export async function updateEstimateElement(
  id: string,
  updates: Partial<Database['public']['Tables']['estimate_elements']['Update']>
): Promise<EstimateElement | null> {
  try {
    const { data, error } = await supabase
      .from('estimate_elements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating estimate element:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateEstimateElement:', error)
    return null
  }
}

/**
 * Delete an estimate structure
 */
export async function deleteEstimateStructure(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('estimate_structures')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting estimate structure:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteEstimateStructure:', error)
    return false
  }
}

/**
 * Delete an estimate element
 */
export async function deleteEstimateElement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('estimate_elements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting estimate element:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteEstimateElement:', error)
    return false
  }
}

/**
 * Get estimate summary for a project
 */
export async function getEstimateSummary(projectId: string) {
  try {
    const [structures, elements] = await Promise.all([
      fetchEstimateStructures(projectId),
      fetchEstimateElements(projectId)
    ])

    const totalAmount = elements.reduce((sum, element) => sum + (element.amount || 0), 0)
    const structureCount = structures.length
    const elementCount = elements.length

    return {
      totalAmount,
      structureCount,
      elementCount,
      structures,
      elements
    }
  } catch (error) {
    console.error('Error in getEstimateSummary:', error)
    return {
      totalAmount: 0,
      structureCount: 0,
      elementCount: 0,
      structures: [],
      elements: []
    }
  }
}