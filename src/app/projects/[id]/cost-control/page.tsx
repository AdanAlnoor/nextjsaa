'use client'

import { CostControlTab } from '@/components/cost-control/CostControlTab'
import { Database } from '@/types/supabase'
import { useCostControl } from '@/context/CostControlContext'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Project = Database['public']['Tables']['projects']['Row']

interface SummaryPageProps {
  params: { id: string }
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchProject = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (data) {
        setProject(data)
      }
      setLoading(false)
    }
    
    fetchProject()
  }, [params.id])
  
  if (loading || !project) {
    return <div>Loading...</div>
  }
  
  return (
    <>
      <h1 className="text-xl font-medium text-slate-900 mb-3">
        Cost Control Summary
      </h1>
      <CostControlTab project={project} />
    </>
  )
} 