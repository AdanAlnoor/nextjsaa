'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function InvitationPage({ params }: { params: { token: string } }) {
  const { token } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<any | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Load invitation details
  useEffect(() => {
    async function loadInvitation() {
      setLoading(true)
      setError(null)
      
      try {
        const supabase = createClient()
        
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Redirect to login with return URL
          router.push(`/login?returnTo=/invitations/${token}`)
          return
        }
        
        // Get invitation details
        const { data, error } = await supabase
          .from('project_invitations')
          .select(`
            id,
            project_id,
            email,
            role_id,
            status,
            expires_at,
            projects(name),
            user_roles(name, description)
          `)
          .eq('invitation_token', token)
          .single()
          
        if (error) {
          throw new Error('Invalid invitation link')
        }
        
        // Check if invitation is still valid
        if (data.status !== 'pending') {
          throw new Error('This invitation has already been used')
        }
        
        if (new Date(data.expires_at) < new Date()) {
          throw new Error('This invitation has expired')
        }
        
        // Check if invitation was meant for this user
        if (data.email.toLowerCase() !== user.email?.toLowerCase()) {
          throw new Error('This invitation was sent to a different email address')
        }
        
        setInvitation(data)
      } catch (err: any) {
        console.error('Error loading invitation:', err)
        setError(err.message || 'Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }
    
    loadInvitation()
  }, [token, router])
  
  // Accept invitation
  async function handleAccept() {
    setAccepting(true)
    setError(null)
    
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Authentication required')
      }
      
      // Call the accept_invitation function
      const { error } = await supabase.rpc('accept_invitation', {
        p_invitation_id: invitation.id,
        p_user_id: user.id,
        p_role_id: invitation.role_id,
        p_project_id: invitation.project_id
      })
      
      if (error) {
        throw error
      }
      
      setSuccess(true)
      
      // Redirect to project after 2 seconds
      setTimeout(() => {
        router.push(`/projects/${invitation.project_id}`)
      }, 2000)
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }
  
  // Handle invitation rejection
  function handleReject() {
    router.push('/')
  }
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Invitation Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-center">Invitation Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              You have successfully joined the project. Redirecting you to the project page...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Project Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Project</p>
            <p className="text-lg font-bold">{invitation?.projects?.name || 'Unknown Project'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-1">Role</p>
            <p className="font-medium">{invitation?.user_roles?.name || 'Unknown Role'}</p>
            <p className="text-sm text-muted-foreground">
              {invitation?.user_roles?.description || ''}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReject}>
            Decline
          </Button>
          <Button onClick={handleAccept} disabled={accepting}>
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 