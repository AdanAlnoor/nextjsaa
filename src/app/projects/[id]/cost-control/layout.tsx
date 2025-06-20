import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ProjectLayout from '@/components/layouts/ProjectLayout'
import { CostControlProvider } from '@/context/CostControlContext'
import { CostControlSidebar } from '@/components/cost-control/CostControlSidebar'
import { getProjectById } from '@/lib/api'
import { Database } from '@/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']

export default async function CostControlLayout({ 
  children,
  params 
}: { 
  children: React.ReactNode
  params: { id: string } 
}) {
  const projectId = params.id
  let project: Project | null = null

  if (!projectId) {
    console.error('No project ID provided for CostControlLayout')
    // Decide how to handle missing ID - maybe redirect or show error
    return <div>Error: Project ID is missing.</div>
  }

  try {
    project = await getProjectById(projectId)
    if (!project) {
      notFound()
    }
  } catch (error) {
    console.error('Failed to fetch project for CostControlLayout:', error)
    // Render an error state or redirect
    return <div>Error loading project data. Please try again.</div>
  }

  return (
    <ProjectLayout project={project}>
      <CostControlProvider projectId={project.id}>
        <div className="flex h-full bg-background">
          <CostControlSidebar project={project} />
          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto py-4 px-4">
              {children}
            </div>
          </div>
        </div>
      </CostControlProvider>
    </ProjectLayout>
  )
} 