import { createClient } from '@/shared/lib/supabase/client'

/**
 * Refreshes a project's summary data by calling the database function
 * @param projectId The UUID of the project
 * @returns A promise that resolves when the refresh is complete
 */
export async function refreshProjectSummary(projectId: string): Promise<void> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .rpc('refresh_project_summary', { p_project_id: projectId })
    
    if (error) {
      console.error('Error refreshing project summary:', error)
      throw error
    }
    
    console.log('Successfully refreshed project summary')
  } catch (error) {
    console.error('Failed to refresh project summary:', error)
    throw error
  }
}

/**
 * Populates summary data for all projects in the database
 * Useful for initial setup or admin operations
 * @returns A promise with a message about the operation result
 */
export async function populateAllProjectSummaries(): Promise<string> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .rpc('populate_all_project_summaries')
    
    if (error) {
      console.error('Error populating project summaries:', error)
      throw error
    }
    
    console.log('Successfully populated all project summaries:', data)
    return data as string
  } catch (error) {
    console.error('Failed to populate project summaries:', error)
    throw error
  }
} 