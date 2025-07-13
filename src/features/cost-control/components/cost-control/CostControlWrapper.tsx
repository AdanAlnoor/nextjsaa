'use client'

import { CostControlProvider } from '@/cost-control/context/CostControlContext'
import { CostControlTab } from './CostControlTab'
import { CostControlSidebar } from './CostControlSidebar'
import { Database } from '@/shared/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface CostControlWrapperProps {
  project: Project
}

export function CostControlWrapper({ project }: CostControlWrapperProps) {
  return (
    <CostControlProvider projectId={project.id}>
      <div className="flex h-full bg-background">
        <CostControlSidebar project={project} />
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 px-2">
            <CostControlTab project={project} />
          </div>
        </div>
      </div>
    </CostControlProvider>
  )
} 