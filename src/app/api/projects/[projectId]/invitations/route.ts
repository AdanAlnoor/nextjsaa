import { createClient } from '@/shared/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { hasRole } from '@/auth/utils/roles'
import { Database } from '@/shared/types/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient()
  const { projectId } = params
  const { email, roleId } = await req.json()
  
  if (!email || !roleId) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
  }
  
  try {
    // Check current user permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user can invite to this project
    const canInvite = await hasRole(user.id, 'project_manager', projectId)
    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Check if user already exists
    const { data: existingUser, error: getUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    
    if (getUserError) {
      console.error("Error checking existing user:", getUserError)
      throw getUserError
    }
    
    // Generate invitation token and expiry
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48) // 48 hour expiry
    
    // Create invitation record
    const { data, error } = await supabase
      .from('project_invitations')
      .insert({
        project_id: projectId,
        email,
        role_id: roleId,
        invitation_token: token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('Failed to create invitation:', error)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }
    
    // Here you would normally send an email with the invitation
    // For now just return the token
    return NextResponse.json({ 
      success: true, 
      invitationId: data.id,
      invitationLink: `/invitations/${token}`
    })
  } catch (error: any) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createClient()
  const { projectId } = params
  
  try {
    // Check current user permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user can view project invitations
    const canView = await hasRole(user.id, 'project_manager', projectId)
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Get all pending invitations for the project
    const { data, error } = await supabase
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
        ),
        invited_by_user:auth.users!invited_by(
          email
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to fetch invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }
    
    return NextResponse.json({ invitations: data })
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch invitations' }, { status: 500 })
  }
} 