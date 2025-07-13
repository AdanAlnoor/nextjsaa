'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'

interface ProjectSummary {
  id: string
  project_id: string
  structure_count: number
  element_count: number
  estimate_total: number
  paid_bills_total: number
  unpaid_bills_total: number
  bills_difference: number
  purchase_orders_total: number
  wages_total: number
  last_updated_at: string
  created_at: string
}

interface UseProjectSummaryResult {
  summary: ProjectSummary | null
  isLoading: boolean
  isError: boolean
  refreshSummary: () => Promise<void>
}

export function useProjectSummary(projectId: string): UseProjectSummaryResult {
  const { 
    data: summaryData, 
    isLoading, 
    isError,
    refetch
  } = useQuery({
    queryKey: ['projectSummary', projectId],
    queryFn: async () => {
      const supabase = createClient()
      
      try {
        const { data, error } = await supabase
          .from('estimate_project_summary')
          .select('*')
          .eq('project_id', projectId)
          .single()
        
        if (error) {
          console.error('Error fetching project summary:', error)
          throw error
        }
        
        console.log('Fetched project summary:', data)
        return data as ProjectSummary
      } catch (error) {
        console.error('Failed to fetch project summary:', error)
        throw error
      }
    }
  })
  
  const refreshSummary = async () => {
    await refetch()
  }
  
  return {
    summary: summaryData || null,
    isLoading,
    isError,
    refreshSummary
  }
} 