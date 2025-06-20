'use client'

import { PurchaseOrdersTab } from '@/components/cost-control/purchase-orders/PurchaseOrdersTab'
import { Database } from '@/types/supabase'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import RoleGuard from '@/components/auth/RoleGuard'
import { ROLES } from '@/utils/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LockIcon, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Project = Database['public']['Tables']['projects']['Row']

interface PurchaseWorksPageProps {
  params: { id: string }
}

export default function PurchaseWorksPageMock({ params }: PurchaseWorksPageProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  
  useEffect(() => {
    const fetchProject = async () => {
      try {
        console.log('Fetching project with ID:', params.id)
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', params.id)
          .single()
        
        if (error) {
          console.error('Error fetching project:', error)
          throw new Error(`Failed to fetch project: ${error.message}`)
        }

        console.log('Fetched project:', data)
        if (data) {
          setProject(data)
        } else {
          throw new Error('Project not found')
        }
      } catch (error) {
        console.error('Error in fetchProject:', error)
        setError(error instanceof Error ? error.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProject()
  }, [params.id])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>There was a problem loading this page</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    )
  }

  if (!project) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <CardHeader>
          <CardTitle>Project Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested project could not be found.</p>
          <Button onClick={() => router.push('/projects')} className="mt-4">Go to Projects</Button>
        </CardContent>
      </Card>
    )
  }
  
  // Instead of using RoleGuard, we'll directly render the component with mock data
  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        <span className="text-indigo-500 dark:text-indigo-400">Purchase Works (Mock Mode)</span>
      </h1>
      <PurchaseOrdersTab project={project} />
    </>
  )
} 