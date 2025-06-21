# Role-Based User Management Implementation Guide

This guide outlines a step-by-step approach to implement the role-based authorization system in your construction management application without modifying your existing codebase.

## Implementation Roadmap

1. Database Schema Setup
2. Permission Framework Integration
3. User Invitation System
4. Role-Based UI Components
5. Testing and Deployment

## 1. Database Schema Setup

### Step 1: Create the Role Tables

First, add the necessary tables to your database by running the following SQL migration:

```sql
-- Create user roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user role assignments table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role_id, project_id)
);

-- Create project invitations table
CREATE TABLE IF NOT EXISTS public.project_invitations (
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

### Step 2: Add Default Roles

Populate the roles table with your standard roles:

```sql
INSERT INTO public.user_roles (name, description) VALUES 
  ('admin', 'System administrator with full access'),
  ('project_manager', 'Can manage projects and approve purchase orders'),
  ('purchaser', 'Can create purchase orders'),
  ('finance', 'Can approve purchase orders and convert to bills'),
  ('viewer', 'Read-only access to projects')
ON CONFLICT (name) DO NOTHING;
```

### Step 3: Configure Row-Level Security

Apply security policies to ensure data access is properly controlled:

```sql
-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Create necessary policies (examples below)
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
```

## 2. Permission Framework Integration

### Step 1: Create Database Helper Functions

Add these helper functions to your database to simplify permission checks:

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
```

### Step 2: Add Permission Utility Functions

Create a new permission utility file (`src/utils/roles.ts`) to house reusable permission functions:

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

/**
 * Checks if a user has a specific role for a project
 * @param userId User ID to check
 * @param roleName Role name to check
 * @param projectId Optional project ID for project-specific roles
 * @returns True if user has the role
 */
export async function hasRole(
  userId: string,
  roleName: string,
  projectId?: string
): Promise<boolean> {
  if (!userId || !roleName) return false
  
  const supabase = createClientComponentClient<Database>()
  
  try {
    const { data, error } = await supabase.rpc('user_has_role', {
      user_id: userId,
      role_name: roleName,
      project_id: projectId || null
    })
    
    if (error) {
      console.error('Error checking role:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('Error checking role:', error)
    return false
  }
}

/**
 * Check if the current user has permission for a specific action
 * @param actionType The action type to check
 * @param projectId Optional project ID to scope permissions
 */
export async function hasPermission(
  actionType: 'create_project' | 'invite_users' | 'view_project' | 'edit_project',
  projectId?: string
): Promise<boolean> {
  const supabase = createClientComponentClient<Database>()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Define permission mappings
    const permissions: Record<string, string[]> = {
      create_project: ['admin'],
      invite_users: ['admin', 'project_manager'],
      view_project: ['admin', 'project_manager', 'purchaser', 'finance', 'viewer'],
      edit_project: ['admin', 'project_manager']
    }
    
    // Check each required role
    for (const role of permissions[actionType] || []) {
      const hasRequiredRole = await hasRole(user.id, role, projectId)
      if (hasRequiredRole) return true
    }
    
    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}
```

## 3. User Invitation System

### Step 1: Create API Route for Invitations

Add this API route for project invitations (`src/app/api/projects/[projectId]/invitations/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  const { projectId } = params
  const { email, roleId } = await req.json()
  
  try {
    // Check current user permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user can invite to this project
    const { data: canInvite } = await supabase.rpc('user_has_role', {
      user_id: user.id,
      role_name: 'project_manager',
      project_id: projectId
    })
    
    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
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
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }
    
    // Here you would normally send an email with the invitation
    // For now just return the token
    return NextResponse.json({ 
      success: true, 
      invitationId: data.id,
      invitationLink: `/invitations/${token}`
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Step 2: Create Invitation Acceptance Logic

Add the invitation acceptance route (`src/app/api/invitations/[token]/accept/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single()
    
    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }
    
    // Verify invitation is pending and not expired
    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }
    
    // Update invitation status
    await supabase
      .from('project_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)
    
    // Add role assignment
    await supabase
      .from('user_role_assignments')
      .insert({
        user_id: user.id,
        role_id: invitation.role_id,
        project_id: invitation.project_id
      })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

## 4. Role-Based UI Components

### Step 1: Create a Permission Guard Component

Add a reusable component for permission-based UI rendering (`src/components/auth/RoleGuard.tsx`):

```tsx
import { ReactNode, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { hasRole } from '@/utils/roles'
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
  fallback = null
}: RoleGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    async function checkAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setHasAccess(false)
          return
        }
        
        const allowed = await hasRole(user.id, requiredRole, projectId)
        setHasAccess(allowed)
      } catch (error) {
        console.error('Permission check error:', error)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAccess()
  }, [requiredRole, projectId, supabase])
  
  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>
}
```

### Step 2: Create User Invitation Modal

Add a component for inviting users (`src/components/projects/InviteUserModal.tsx`):

```tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from '@/components/ui/use-toast'

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
  const supabase = createClientComponentClient()
  
  // Fetch roles on component mount
  useEffect(() => {
    async function fetchRoles() {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .not('name', 'eq', 'admin') // Don't allow inviting admins
      
      if (error) {
        toast({ title: 'Error', description: 'Failed to load roles' })
        return
      }
      
      setRoles(data || [])
      
      // Default to viewer role if available
      const viewerRole = data?.find(r => r.name === 'viewer')
      if (viewerRole) setRoleId(viewerRole.id)
    }
    
    if (isOpen) fetchRoles()
  }, [isOpen, supabase])
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, roleId })
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      
      toast({ title: 'Success', description: 'Invitation sent successfully' })
      setEmail('')
      onClose()
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send invitation' 
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
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

## 5. Implementation Strategy

To integrate this system with minimal changes to your existing codebase:

1. **Add new files**: Create the new utility files and components rather than modifying existing ones.

2. **Database migrations**: Run the SQL migrations in separate files to create the new tables.

3. **Parallel adoption**: Start using the role-based components alongside your existing system:

```tsx
// Example implementation in a project page
import { RoleGuard } from '@/components/auth/RoleGuard'
import { InviteUserModal } from '@/components/projects/InviteUserModal'

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  return (
    <div>
      <h1>Project Details</h1>
      
      {/* Role-gated button */}
      <RoleGuard requiredRole="project_manager" projectId={params.id}>
        <Button onClick={() => setShowInviteModal(true)}>
          Invite Team Member
        </Button>
      </RoleGuard>
      
      {/* Invitation modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={params.id}
      />
      
      {/* Existing project content */}
    </div>
  )
}
```

## Best Practices

1. **Use Role Constants**: Define role names as constants to avoid typos:

```typescript
// src/constants/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  PURCHASER: 'purchaser',
  FINANCE: 'finance',
  VIEWER: 'viewer'
} as const;
```

2. **Permission Composition**: For complex permissions, combine multiple role checks:

```typescript
// Check if user can approve purchase orders
async function canApprovePurchaseOrder(userId: string, projectId: string) {
  const isManager = await hasRole(userId, ROLES.PROJECT_MANAGER, projectId);
  const isFinance = await hasRole(userId, ROLES.FINANCE, projectId);
  const isAdmin = await hasRole(userId, ROLES.ADMIN);
  
  return isAdmin || isManager || isFinance;
}
```

3. **Testing Strategy**: Create test accounts with different roles for proper testing:

```typescript
// Example test setup
async function setupTestRoles() {
  // Create test users
  const adminUser = await createUser('admin@example.com');
  const managerUser = await createUser('manager@example.com');
  
  // Assign roles
  await assignRole(adminUser.id, 'admin');
  await assignRole(managerUser.id, 'project_manager', projectId);
  
  return { adminUser, managerUser };
}
```

## Conclusion

This implementation provides a comprehensive role-based user management system that integrates with your existing application without requiring significant modifications to your codebase. By following the steps outlined in this guide, you can gradually adopt role-based permissions throughout your application.

The system provides:
- Fine-grained permissions at both global and project levels
- User invitation workflow
- Role-based UI rendering
- Secure database access controls

This approach follows industry best practices for authorization in web applications while maintaining compatibility with your existing system. 

## 6. Detailed Frontend Implementation

For a more comprehensive implementation of the frontend components, refer to the `frontend-implementation.md` file, which includes:

### Admin Dashboard

A complete user management interface allowing administrators to:
- View all users in the system
- Assign and revoke global roles
- Search and filter users
- See role assignments at a glance

```tsx
// Usage example
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ROLES } from '@/constants/roles'

export default function AdminPage() {
  return (
    <RoleGuard requiredRole={ROLES.ADMIN}>
      <UserManagementTable />
    </RoleGuard>
  )
}
```

### Project Member Management

Project-specific interfaces for:
- Managing team members within a project
- Showing role assignments per project
- Removing users from projects
- Inviting new members with specific roles

### Role-Based Navigation

Dynamic navigation components that:
- Show only relevant menu items based on user roles
- Adapt to user permissions across the application
- Support both desktop and mobile interfaces
- Integrate with your authentication flow

Example implementation:

```tsx
// In your layout component
import { RoleBasedNavbar } from '@/components/navigation/RoleBasedNavbar'

export default function AppLayout({ children }) {
  return (
    <>
      <RoleBasedNavbar />
      <main>{children}</main>
    </>
  )
}
```

### Permission Feedback

User-friendly interfaces for access control:
- Clear permission denied states
- Custom error messages based on required roles
- Redirection options for unauthorized users
- Loading states during permission checks

### User Profile View

A profile interface showing:
- User's global roles across the system
- Project-specific role assignments
- Personal information and settings

### Integration With Existing Pages

Examples of integrating with your current components:
- Conditional rendering of UI elements based on permissions
- Permission checks for sensitive actions
- Adapting existing pages to use the role system

```tsx
// Example: Adding permission checks to an existing Purchase Orders page
export default function PurchaseOrderPage() {
  const [canCreate, setCanCreate] = useState(false)
  
  useEffect(() => {
    // Check permission using the permission utility
    async function checkPermission() {
      const hasPermission = await hasPurchaseOrderPermission('create')
      setCanCreate(hasPermission)
    }
    
    checkPermission()
  }, [])
  
  return (
    <div>
      <h1>Purchase Orders</h1>
      
      {/* Only show action buttons to users with permission */}
      {canCreate && (
        <Button>Create New Order</Button>
      )}
      
      {/* Rest of your existing component remains unchanged */}
    </div>
  )
}
```

By implementing these frontend components alongside the backend structure described in this document, you'll have a complete role-based user management system that seamlessly integrates with your existing construction management application. 