# Role-Based User Management Implementation Guide

## Overview

This guide details how to implement a comprehensive role-based user management system for a construction management web application. The system will allow:

- Admins to create projects and invite users
- Different approval levels for users
- Assignment of users to one or multiple projects
- Role-based permissions for various actions

## Database Schema

### Core Tables

```sql
-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User role assignments table
CREATE TABLE public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role_id, project_id)
);

-- Project invitations table
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, email)
);
```

### Default Roles

```sql
INSERT INTO public.user_roles (name, description) VALUES 
  ('admin', 'System administrator with full access'),
  ('project_manager', 'Can manage projects and approve purchase orders'),
  ('purchaser', 'Can create purchase orders'),
  ('finance', 'Can approve purchase orders and convert to bills'),
  ('viewer', 'Read-only access to projects')
ON CONFLICT (name) DO NOTHING;
```

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Anyone can view roles" 
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can modify roles" 
ON public.user_roles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

-- Policies for user_role_assignments
CREATE POLICY "Users can view their own role assignments" 
ON public.user_role_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all role assignments" 
ON public.user_role_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

CREATE POLICY "Admins and project managers can modify role assignments" 
ON public.user_role_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() 
    AND (ur.name = 'admin' OR (ur.name = 'project_manager' AND ura.project_id = user_role_assignments.project_id))
  )
);

-- Policies for project_invitations
CREATE POLICY "Project admins can manage invitations"
ON public.project_invitations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() 
    AND (ur.name = 'admin' OR (ur.name = 'project_manager' AND ura.project_id = project_invitations.project_id))
  )
);

CREATE POLICY "Users can accept their own invitations"
ON public.project_invitations FOR SELECT TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
```

## Database Functions

### User Role Check Functions

```sql
-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(
  user_id UUID,
  role_name TEXT,
  project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF project_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = user_has_role.user_id 
      AND ur.name = user_has_role.role_name
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = user_has_role.user_id 
      AND ur.name = user_has_role.role_name
      AND (ura.project_id = user_has_role.project_id OR ura.project_id IS NULL)
    );
  END IF;
END;
$$;

-- Function to get users with their roles
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  roles jsonb
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user has admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role_id', ur.id,
          'role_name', ur.name,
          'project_id', ura.project_id
        )
      )
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = au.id
    ) AS roles
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

## Frontend Implementation

### Utility Functions

```typescript
// src/utils/permissions.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

/**
 * Checks if a user has a specific role, optionally scoped to a project
 * @param userId The ID of the user to check
 * @param roleName The name of the role (e.g., 'admin', 'purchaser')
 * @param projectId Optional project ID to check project-specific roles
 * @returns Promise<boolean> - True if the user has the specified role
 */
export async function hasRole(
  userId: string,
  roleName: string,
  projectId?: string
): Promise<boolean> {
  if (!userId || !roleName) return false
  
  const supabase = createClientComponentClient<Database>()
  
  try {
    let query = supabase
      .from('user_role_assignments')
      .select(`
        user_roles(name)
      `)
      .eq('user_id', userId)
    
    // If projectId is provided, check for either global roles or project-specific roles
    if (projectId) {
      query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error checking user role:', error)
      return false
    }
    
    // Extract role names from the response
    const roles = data?.map(item => (item.user_roles as any)?.name) || []
    
    // Check if the user has the requested role
    return roles.includes(roleName)
  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

/**
 * Gets all roles for a user, optionally scoped to a project
 * @param userId The ID of the user to check
 * @param projectId Optional project ID to scope the roles
 * @returns Promise<string[]> - Array of role names
 */
export async function getUserRoles(
  userId: string,
  projectId?: string
): Promise<string[]> {
  if (!userId) return []
  
  const supabase = createClientComponentClient<Database>()
  
  try {
    let query = supabase
      .from('user_role_assignments')
      .select(`
        user_roles(name)
      `)
      .eq('user_id', userId)
    
    // If projectId is provided, check for either global roles or project-specific roles
    if (projectId) {
      query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching user roles:', error)
      return []
    }
    
    // Extract role names from the response
    return data?.map(item => (item.user_roles as any)?.name) || []
  } catch (error) {
    console.error('Error fetching user roles:', error)
    return []
  }
}

/**
 * Check if the current user has permission for a specific action
 * @param actionType The action type to check
 * @param projectId Optional project ID to scope the permissions
 * @returns Promise<boolean> - True if the user has permission
 */
export async function hasPermission(
  actionType: 'create_project' | 'invite_users' | 'view_project' | 'edit_project' | 'delete_project',
  projectId?: string
): Promise<boolean> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Get user roles
    const roles = await getUserRoles(user.id, projectId)
    
    // Define which roles can perform which actions
    const permissions: Record<string, string[]> = {
      create_project: ['admin'],
      invite_users: ['admin', 'project_manager'],
      view_project: ['admin', 'project_manager', 'purchaser', 'finance', 'viewer'],
      edit_project: ['admin', 'project_manager'],
      delete_project: ['admin']
    }
    
    // Check if the user has any of the required roles for this action
    return roles.some(role => permissions[actionType].includes(role))
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}
```

### Project Invitation Component

```tsx
// src/components/projects/InviteUserModal.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function InviteUserModal({ isOpen, onClose, projectId }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [roles, setRoles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient<Database>()
  
  // Fetch available roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .not('name', 'eq', 'admin') // Don't allow inviting admins
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load roles',
          variant: 'destructive'
        })
        return
      }
      
      setRoles(data || [])
      
      // Set default role to viewer if available
      const viewerRole = data?.find(role => role.name === 'viewer')
      if (viewerRole) {
        setRoleId(viewerRole.id)
      } else if (data && data.length > 0) {
        setRoleId(data[0].id)
      }
    }
    
    if (isOpen) {
      fetchRoles()
    }
  }, [isOpen, supabase])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Validate input
      if (!email || !roleId) {
        toast({
          title: 'Error',
          description: 'Please fill in all fields',
          variant: 'destructive'
        })
        return
      }
      
      // Send invitation
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          roleId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }
      
      toast({
        title: 'Success',
        description: 'Invitation sent successfully'
      })
      
      // Reset form and close modal
      setEmail('')
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User to Project</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a user to this project.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={roleId} onValueChange={setRoleId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

## API Routes

### Project Invitation API

```typescript
// src/app/api/projects/[projectId]/invitations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { sendInvitationEmail } from '@/utils/email'

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params
    const { email, roleId } = await req.json()
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authorized (admin or project manager)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: hasPermission, error: permissionError } = await supabase.rpc('user_has_role', {
      user_id: user.id,
      role_name: 'admin',
      project_id: projectId
    })
    
    if (permissionError) {
      return NextResponse.json({ error: 'Error checking permissions' }, { status: 500 })
    }
    
    if (!hasPermission) {
      const { data: isPM, error: pmError } = await supabase.rpc('user_has_role', {
        user_id: user.id,
        role_name: 'project_manager',
        project_id: projectId
      })
      
      if (pmError || !isPM) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }
    
    // Generate invitation token and expiration date (48 hours)
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)
    
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
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'User is already invited to this project' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }
    
    // Get project details for the email
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()
    
    // Send invitation email
    await sendInvitationEmail({
      email,
      projectName: project?.name || 'Construction Project',
      invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${token}`,
      invitedBy: user.email || 'A project administrator'
    })
    
    return NextResponse.json({ success: true, invitationId: data.id })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Accept Invitation API

```typescript
// src/app/api/invitations/[token]/accept/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('project_invitations')
      .select(`
        id,
        project_id,
        email,
        role_id,
        status,
        expires_at
      `)
      .eq('invitation_token', token)
      .single()
    
    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }
    
    // Check if invitation is for this user
    if (invitation.email !== user.email) {
      return NextResponse.json({ error: 'This invitation is for a different user' }, { status: 403 })
    }
    
    // Check if invitation is expired
    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }
    
    // Begin transaction to update invitation and assign role
    const { error: txError } = await supabase.rpc('accept_project_invitation', {
      p_invitation_id: invitation.id,
      p_user_id: user.id
    })
    
    if (txError) {
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation accepted successfully',
      projectId: invitation.project_id
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Stored Procedure for Accepting Invitations

```sql
CREATE OR REPLACE FUNCTION public.accept_project_invitation(
  p_invitation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
  v_role_id UUID;
BEGIN
  -- Get invitation details
  SELECT project_id, role_id INTO v_project_id, v_role_id
  FROM public.project_invitations
  WHERE id = p_invitation_id;
  
  -- Mark invitation as accepted
  UPDATE public.project_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_invitation_id;
  
  -- Assign role to user for this project
  INSERT INTO public.user_role_assignments
    (user_id, role_id, project_id)
  VALUES
    (p_user_id, v_role_id, v_project_id)
  ON CONFLICT (user_id, role_id, project_id) DO NOTHING;
END;
$$;
```

## Protected Components with Role Check

### HOC for Role-Based Access Control

```tsx
// src/components/auth/RoleGuard.tsx

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { hasRole } from '@/utils/permissions'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  requiredRole: string
  projectId?: string
  fallback?: ReactNode
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  projectId,
  fallback = <div>Access denied</div>
}: RoleGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  
  useEffect(() => {
    const checkAccess = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      // Check if user has required role
      const allowed = await hasRole(user.id, requiredRole, projectId)
      setHasAccess(allowed)
    }
    
    checkAccess()
  }, [supabase, router, requiredRole, projectId])
  
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    )
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>
}
```

### Usage Example

```tsx
// Example usage in a project management page

import { RoleGuard } from '@/components/auth/RoleGuard'
import { Button } from '@/components/ui/button'
import { InviteUserModal } from '@/components/projects/InviteUserModal'

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  
  return (
    <div>
      <h1>Project Details</h1>
      
      {/* Only admins and project managers can invite users */}
      <RoleGuard 
        requiredRole="project_manager" 
        projectId={params.id}
        fallback={null} // Hide button completely if user doesn't have permission
      >
        <Button onClick={() => setIsInviteModalOpen(true)}>
          Invite User
        </Button>
        
        <InviteUserModal 
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          projectId={params.id}
        />
      </RoleGuard>
      
      {/* Project content here */}
    </div>
  )
}
```

## Email Service Implementation

```typescript
// src/utils/email.ts

import nodemailer from 'nodemailer'

interface InvitationEmailProps {
  email: string
  projectName: string
  invitationLink: string
  invitedBy: string
}

export async function sendInvitationEmail({
  email,
  projectName,
  invitationLink,
  invitedBy
}: InvitationEmailProps) {
  // Create a nodemailer transporter (configure with your email service)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: process.env.EMAIL_SERVER_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD
    }
  })
  
  // Email content
  const mailOptions = {
    from: `"Construction Manager" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Invitation to join ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to join a project</h2>
        <p>Hello,</p>
        <p>${invitedBy} has invited you to join the project: <strong>${projectName}</strong></p>
        <p>Click the button below to accept the invitation:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation will expire in 48 hours.</p>
        <p>If you don't have an account yet, you'll be able to create one after clicking the link.</p>
        <p>If you have any questions, please contact the person who invited you.</p>
      </div>
    `
  }
  
  // Send the email
  return transporter.sendMail(mailOptions)
}
```

## Best Practices and Security Considerations

1. **Row-Level Security (RLS)**: All tables should have RLS policies to restrict data access based on roles and ownership.

2. **SQL Injection Prevention**: Use parameterized queries and avoid string concatenation in SQL queries.

3. **Token Expiration**: Set reasonable expiration times for invitation tokens (e.g., 48 hours).

4. **Rate Limiting**: Implement rate limiting for authentication and invitation endpoints to prevent abuse.

5. **Audit Logging**: Log all important security-related actions like role assignments and invitations.

6. **Least Privilege Principle**: Assign users the minimum privileges needed for their tasks.

7. **Secure Email Templates**: Ensure email templates don't contain sensitive information and have clear branding to prevent phishing.

8. **Session Management**: Implement proper session timeouts and secure cookie settings.

9. **Error Handling**: Use generic error messages to users but log detailed errors for debugging.

10. **Regular Security Reviews**: Periodically review role assignments and permissions.

## Conclusion

This implementation provides a robust role-based user management system that allows:

- Different role types with varying permissions
- Project-specific role assignments
- Email invitations for new users
- Role-based access control throughout the application
- Secure database operations with RLS

By following this guide, you'll have a comprehensive user management system that meets construction industry needs for project collaboration with proper authorization controls. 