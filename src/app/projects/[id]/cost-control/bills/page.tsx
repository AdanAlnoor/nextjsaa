'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/shared/types/supabase'
import { BillsTab } from '@/cost-control/components/cost-control/bills/BillsTab'

type Project = Database['public']['Tables']['projects']['Row']

interface BillsPageProps {
  params: { id: string }
}

export default function BillsPage({ params }: BillsPageProps) {
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
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        <span className="text-indigo-500 dark:text-indigo-400">Bills</span>
      </h1>
      <BillsTab project={project} authStatus="authenticated" />
    </>
  )
} 