import { createClient } from '@/shared/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token

  if (!token) {
    return NextResponse.json({ error: 'Invitation token is missing' }, { status: 400 })
  }

  const supabase = createClient()

  try {
    // 1. Find the invitation by token
    // Ensure table and column names match your schema (e.g., 'project_invitations')
    const { data: invitation, error: findError } = await supabase
      .from('project_invitations') // <--- ADJUST TABLE NAME IF NEEDED
      .select('*')
      .eq('invitation_token', token) // <--- ADJUST COLUMN NAME IF NEEDED
      .maybeSingle()

    if (findError) {
      console.error("Error finding invitation:", findError)
      throw findError
    }

    if (!invitation) {
      console.log(`Invitation token not found: ${token}`)
      return NextResponse.json({ error: 'Invalid or expired invitation token' }, { status: 404 })
    }

    // 2. Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log(`Invitation token expired: ${token}`)
      // Optionally delete the expired invitation
      await supabase.from('project_invitations').delete().eq('id', invitation.id)
      return NextResponse.json({ error: 'Invitation token has expired' }, { status: 410 }) // 410 Gone
    }

    // 3. Get the currently logged-in user (must be logged in to accept)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Error getting user or no user logged in:", userError)
      // If no user is logged in, redirect to login, passing the token
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('invitationToken', token)
      redirectUrl.searchParams.set('email', invitation.email) // Pre-fill email
      return NextResponse.redirect(redirectUrl)
    }

    // 4. If user is logged in, check if their email matches the invitation email
    if (user.email !== invitation.email) {
      console.warn(`Logged in user (${user.email}) does not match invitation email (${invitation.email})`)
      // Maybe allow them to log out and try again?
      return NextResponse.json({ error: 'Invitation email does not match logged-in user' }, { status: 403 })
    }

    // 5. Add user to the project_users table (or your equivalent junction table)
    console.log(`Adding user ${user.id} to project ${invitation.project_id} with role ${invitation.role_id}`)
    const { error: addUserError } = await supabase
      .from('project_users') // <--- ADJUST TABLE NAME IF NEEDED
      .insert({
        project_id: invitation.project_id,
        user_id: user.id,
        role_id: invitation.role_id, // Ensure role_id is stored/passed correctly
      })

    if (addUserError) {
      // Handle potential duplicate entry errors gracefully
      if (addUserError.code === '23505') { // Unique violation
        console.warn(`User ${user.id} might already be in project ${invitation.project_id}. Proceeding...`)
      } else {
        console.error("Error adding user to project:", addUserError)
        throw addUserError // Rethrow other errors
      }
    }

    // 6. Delete the used invitation
    console.log(`Deleting used invitation ${invitation.id}`)
    const { error: deleteError } = await supabase.from('project_invitations').delete().eq('id', invitation.id)
    if (deleteError) {
      console.error("Error deleting invitation:", deleteError)
      // Log error but proceed, as user was added
    }

    // 7. Redirect to the project page
    console.log(`Redirecting user to project page: /projects/${invitation.project_id}`)
    return NextResponse.redirect(new URL(`/projects/${invitation.project_id}`, request.url))
  } catch (error: any) {
    console.error('Error accepting invitation:', error)
    // Return a generic error response
    return NextResponse.json({ error: error.message || 'Failed to accept invitation' }, { status: 500 })
  }
} 