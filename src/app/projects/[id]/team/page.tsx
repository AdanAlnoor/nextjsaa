'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserPlus, ArrowLeft, X } from "lucide-react"
import { toast } from '@/components/ui/use-toast'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ROLES } from '@/utils/roles'
import { InviteUserModal } from '@/components/projects/InviteUserModal'
import Link from 'next/link'

interface TeamMember {
  id: string
  email: string
  roles: string[]
}

interface Invitation {
  id: string
  email: string
  status: string
  role: {
    name: string
    description: string
  } | null
  expires_at: string
  created_at: string
}

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const { id: projectId } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadProjectTeam() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        
        // Get project details
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, name, client, created_at')
          .eq('id', projectId)
          .single()
          
        if (projectError) throw projectError
        
        setProject(project)
        
        // Get team members - users with role assignments for this project
        const { data: roleAssignments, error: teamError } = await supabase
          .from('user_role_assignments')
          .select(`
            id,
            user_id,
            users:auth.users!user_id(
              id,
              email
            ),
            roles:user_roles(
              name
            )
          `)
          .eq('project_id', projectId)
        
        if (teamError) throw teamError
        
        // Process team members
        const processedMembers: Record<string, TeamMember> = {}
        
        if (roleAssignments) {
          roleAssignments.forEach((assignment: any) => {
            if (!assignment.users || !assignment.roles) return
            
            const userId = assignment.users.id
            const email = assignment.users.email
            const roleName = assignment.roles.name
            
            if (!processedMembers[userId]) {
              processedMembers[userId] = {
                id: userId,
                email,
                roles: []
              }
            }
            
            if (roleName && !processedMembers[userId].roles.includes(roleName)) {
              processedMembers[userId].roles.push(roleName)
            }
          })
        }
        
        setTeamMembers(Object.values(processedMembers))
        
        // Get pending invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('project_invitations')
          .select(`
            id,
            email,
            status,
            expires_at,
            created_at,
            role:user_roles(
              name,
              description
            )
          `)
          .eq('project_id', projectId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        
        if (invitationsError) throw invitationsError
        
        // Process invitations data to match our interface
        const processedInvitations: Invitation[] = (invitationsData || []).map(inv => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          expires_at: inv.expires_at,
          created_at: inv.created_at,
          role: inv.role && inv.role.length > 0 ? inv.role[0] : null
        }))
        
        setInvitations(processedInvitations)
      } catch (err: any) {
        console.error('Error loading project team:', err)
        setError(err.message || 'Failed to load project team')
      } finally {
        setLoading(false)
      }
    }
    
    loadProjectTeam()
  }, [projectId])
  
  // Handle invitation cancellation
  async function handleCancelInvitation(invitationId: string) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('project_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)
      
      if (error) throw error
      
      // Update local state
      setInvitations(invitations.filter(inv => inv.id !== invitationId))
      
      toast({
        title: 'Success',
        description: 'Invitation cancelled successfully'
      })
    } catch (err: any) {
      console.error('Error cancelling invitation:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel invitation',
        variant: 'destructive'
      })
    }
  }
  
  // Handle team member removal
  async function handleRemoveMember(userId: string) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId)
      
      if (error) throw error
      
      // Update local state
      setTeamMembers(teamMembers.filter(member => member.id !== userId))
      
      toast({
        title: 'Success',
        description: 'Team member removed successfully'
      })
    } catch (err: any) {
      console.error('Error removing team member:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove team member',
        variant: 'destructive'
      })
    }
  }
  
  // Handle invitation modal close with refresh
  function handleInviteModalClose() {
    setShowInviteModal(false)
    
    // Refresh the invitations list
    const supabase = createClient()
    supabase
      .from('project_invitations')
      .select(`
        id,
        email,
        status,
        expires_at,
        created_at,
        role:user_roles(
          name,
          description
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          // Process the data to match our interface
          const processedInvitations: Invitation[] = data.map(inv => ({
            id: inv.id,
            email: inv.email,
            status: inv.status,
            expires_at: inv.expires_at,
            created_at: inv.created_at,
            role: inv.role && inv.role.length > 0 ? inv.role[0] : null
          }))
          setInvitations(processedInvitations)
        }
      })
  }
  
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
            <CardDescription>Could not load project team</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error || 'Project not found'}</p>
            <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <RoleGuard requiredRole={ROLES.PROJECT_MANAGER} projectId={projectId}>
      <div className="container mx-auto p-4 pb-16">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" className="mr-3" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Team Management</p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Team Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>People with access to this project</CardDescription>
              </div>
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No team members yet</p>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium">{member.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.roles.map(role => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Pending Invitations */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Invitations waiting to be accepted</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No pending invitations</p>
              ) : (
                <div className="space-y-4">
                  {invitations.map(invitation => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex flex-col mt-1">
                          <span className="text-xs text-muted-foreground">
                            Role: {invitation.role?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Render invitation modal when shown */}
        {showInviteModal && (
          <InviteUserModal
            isOpen={showInviteModal}
            onClose={handleInviteModalClose}
            projectId={projectId}
          />
        )}
      </div>
    </RoleGuard>
  )
} 