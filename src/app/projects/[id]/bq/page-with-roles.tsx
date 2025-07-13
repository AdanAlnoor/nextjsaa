'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Loader2, PlusCircle, Users } from "lucide-react"
import { RoleGuard } from '@/auth/components/auth/RoleGuard'
import { ROLES } from '@/auth/utils/roles'
import { InviteUserModal } from '@/projects/components/projects/InviteUserModal'

interface Project {
  id: string
  name: string
  client: string | null
  created_at: string
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { id: projectId } = params
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Get project details
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, client, created_at')
          .eq('id', projectId)
          .single()
          
        if (error) throw error
        
        setProject(data)
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
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load project</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error || 'Project not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        
        {/* Team management button only visible to Project Managers */}
        <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={projectId}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            <span>Manage Team</span>
          </Button>
        </RoleGuard>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Details about this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p>{project.client || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p>{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="bq" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="bq">Bill of Quantities</TabsTrigger>
          <TabsTrigger value="cost-control">Cost Control</TabsTrigger>
          
          {/* Only show budget-sensitive tabs to Finance role */}
          <RoleGuard requiredPermission={ROLES.FINANCE} projectId={projectId}>
            <TabsTrigger value="budget">Budget</TabsTrigger>
          </RoleGuard>
          
          {/* Only show purchasing to Purchaser role */}
          <RoleGuard 
            requiredPermission={ROLES.PURCHASER} 
            projectId={projectId}
            fallback={
              <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={projectId}>
                <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
              </RoleGuard>
            }
          >
            <TabsTrigger value="purchasing">Purchasing</TabsTrigger>
          </RoleGuard>
          
          {/* Team tab only visible to Project Managers */}
          <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={projectId}>
            <TabsTrigger value="team">Team</TabsTrigger>
          </RoleGuard>
        </TabsList>
        
        <TabsContent value="bq">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Bill of Quantities</CardTitle>
                
                {/* Only project managers can add items */}
                <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={projectId}>
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </RoleGuard>
              </div>
            </CardHeader>
            <CardContent>
              <p>Bill of quantities content goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cost-control">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Cost Control</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>Cost control content goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Budget</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p>Budget information visible only to Finance and Admins</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="purchasing">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Purchasing</CardTitle>
                
                {/* Only purchasers and project managers can create purchase orders */}
                <RoleGuard 
                  requiredPermission={ROLES.PURCHASER} 
                  projectId={projectId}
                  fallback={
                    <RoleGuard requiredPermission={ROLES.PROJECT_MANAGER} projectId={projectId}>
                      <Button size="sm">Create Purchase Order</Button>
                    </RoleGuard>
                  }
                >
                  <Button size="sm">Create Purchase Order</Button>
                </RoleGuard>
              </div>
            </CardHeader>
            <CardContent>
              <p>Purchasing information goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Project Team</CardTitle>
                <Button 
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p>Team members and their roles would be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Render invitation modal when shown */}
      {showInviteModal && (
        <InviteUserModal
          projectId={projectId}
          onInviteSent={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
} 