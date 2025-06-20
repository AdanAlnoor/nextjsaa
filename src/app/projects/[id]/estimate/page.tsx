'use client'

import { createClient } from '@/utils/supabase/client'
import { EstimateTab } from '@/components/bq/EstimateTab'
import { useEffect, useState } from 'react'
import { Database } from '@/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

export default function EstimatePage({
  params,
}: {
  params: { id: string }
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadProject() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          console.error('Error loading project:', error)
          return
        }

        setProject(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [params.id, supabase])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!project) {
    return <div>Project not found</div>
  }

  return (
    <div className="container mx-auto py-6">
      <EstimateTab project={project} />
    </div>
  )
} 