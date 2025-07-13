'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { UserPlus, ArrowLeft } from "lucide-react"

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const { id: projectId } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, name, client, created_at')
          .eq('id', projectId)
          .single()
          
        if (projectError) throw projectError
        setProject(project)
      } catch (err: any) {
        console.error('Error loading project:', err)
        setError(err.message || 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    
    loadProject()
  }, [projectId])
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }
  
  if (error || !project) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || 'Project not found'}
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">Team Management</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Team management functionality coming soon...
              </p>
              <Button variant="outline" disabled>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Permission management coming soon...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 