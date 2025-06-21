# Frontend Implementation for Role-Based User Management

This document expands on the frontend implementation details for the role-based user management system outlined in the rolesemp.md file.

## Table of Contents

1. [Admin Dashboard](#admin-dashboard)
2. [Project Member Management](#project-member-management)
3. [Role-Based Navigation](#role-based-navigation)
4. [Permission Feedback](#permission-feedback)
5. [User Profile and Role Display](#user-profile-and-role-display)

## Admin Dashboard

The admin dashboard provides a central interface for managing users and their roles across the application.

### User Management Screen

```tsx
// src/app/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ROLES } from '@/constants/roles'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface User {
  id: string
  email: string
  roles: {
    id: string
    name: string
    project_id: string | null
  }[]
}

interface Role {
  id: string
  name: string
  description: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch all roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
        
        if (rolesError) throw rolesError
        setRoles(rolesData as Role[])
        
        // Fetch all users with their roles using the function we created
        const { data: usersWithRoles, error: usersError } = await supabase
          .rpc('get_users_with_roles')
        
        if (usersError) throw usersError
        
        // Format the data for our UI
        const formattedUsers = usersWithRoles.map(user => ({
          id: user.id,
          email: user.email,
          roles: user.roles || []
        }))
        
        setUsers(formattedUsers)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load user data',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [supabase])

  async function toggleUserRole(userId: string, roleId: string, hasRole: boolean) {
    try {
      if (hasRole) {
        // Remove role
        await supabase
          .from('user_role_assignments')
          .delete()
          .match({ 
            user_id: userId, 
            role_id: roleId,
            project_id: null 
          })
        
        // Update local state
        setUsers(users.map(user => {
          if (user.id === userId) {
            return {
              ...user,
              roles: user.roles.filter(r => r.id !== roleId)
            }
          }
          return user
        }))
        
        toast({
          title: 'Role removed',
          description: 'User role was removed successfully'
        })
      } else {
        // Add role
        await supabase
          .from('user_role_assignments')
          .insert({
            user_id: userId,
            role_id: roleId,
            project_id: null
          })
        
        // Update local state
        setUsers(users.map(user => {
          if (user.id === userId) {
            const role = roles.find(r => r.id === roleId)
            if (role) {
              return {
                ...user,
                roles: [...user.roles, { id: roleId, name: role.name, project_id: null }]
              }
            }
          }
          return user
        }))
        
        toast({
          title: 'Role assigned',
          description: 'User role was assigned successfully'
        })
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive'
      })
    }
  }

  // Filter users by search term
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RoleGuard requiredRole={ROLES.ADMIN}>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users and Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    {roles.map(role => (
                      <TableHead key={role.id} className="text-center">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      {roles.map(role => {
                        const hasRole = user.roles.some(r => 
                          r.id === role.id && r.project_id === null
                        )
                        return (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox
                              checked={hasRole}
                              onCheckedChange={() => 
                                toggleUserRole(user.id, role.id, hasRole)
                              }
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
```

## Project Member Management

A dedicated interface for managing members within a specific project.

### Project Members Screen

```tsx
// src/app/projects/[id]/members/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ROLES } from '@/constants/roles'
import { InviteUserModal } from '@/components/projects/InviteUserModal'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Loader2, UserPlus, Trash2 } from 'lucide-react'

interface Member {
  id: string
  email: string
  roles: {
    id: string
    name: string
  }[]
}

export default function ProjectMembersPage({ params }: { params: { id: string } }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const supabase = createClientComponentClient<Database>()
  const projectId = params.id

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true)
      try {
        // Get all role assignments for this project
        const { data: roleAssignments, error: assignmentsError } = await supabase
          .from('user_role_assignments')
          .select(`
            user_id,
            role_id,
            user_roles(id, name)
          `)
          .eq('project_id', projectId)
        
        if (assignmentsError) throw assignmentsError
        
        // Get user details for each unique user ID
        const userIds = [...new Set(roleAssignments.map(ra => ra.user_id))]
        const { data: users, error: usersError } = await supabase
          .from('auth.users') // This might need to be adjusted based on your database structure
          .select('id, email')
          .in('id', userIds)
        
        if (usersError) throw usersError
        
        // Combine data into a member list
        const memberList = users.map(user => {
          const userRoles = roleAssignments
            .filter(ra => ra.user_id === user.id)
            .map(ra => ({
              id: ra.role_id,
              name: (ra.user_roles as any).name
            }))
          
          return {
            id: user.id,
            email: user.email,
            roles: userRoles
          }
        })
        
        setMembers(memberList)
      } catch (error) {
        console.error('Error fetching members:', error)
        toast({
          title: 'Error',
          description: 'Failed to load project members',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchMembers()
  }, [projectId, supabase])

  async function removeMember(userId: string) {
    try {
      // Remove all role assignments for this user in this project
      const { error } = await supabase
        .from('user_role_assignments')
        .delete()
        .match({ 
          user_id: userId, 
          project_id: projectId 
        })
      
      if (error) throw error
      
      // Update local state
      setMembers(members.filter(member => member.id !== userId))
      
      toast({
        title: 'Member removed',
        description: 'User was removed from the project'
      })
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive'
      })
    }
  }

  return (
    <RoleGuard 
      requiredRole={ROLES.PROJECT_MANAGER} 
      projectId={projectId}
    >
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Project Members</h1>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No members found. Invite some team members to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map(role => (
                              <span 
                                key={role.id}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 rounded"
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          projectId={projectId}
        />
      </div>
    </RoleGuard>
  )
}
```

## Role-Based Navigation

Customize the navigation menu based on user roles.

### Role-Based NavBar

```tsx
// src/components/navigation/RoleBasedNavbar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { getUserRoles } from '@/utils/roles'
import { ROLES } from '@/constants/roles'
import {
  Building,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  requiredRoles: string[]
}

export function RoleBasedNavbar() {
  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const userRoles = await getUserRoles(user.id)
        setRoles(userRoles)
      }
    }
    
    getUser()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems: NavItem[] = [
    {
      label: 'Projects',
      href: '/projects',
      icon: <Building className="h-5 w-5" />,
      requiredRoles: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PURCHASER, ROLES.FINANCE, ROLES.VIEWER]
    },
    {
      label: 'Purchase Orders',
      href: '/purchase-orders',
      icon: <FileText className="h-5 w-5" />,
      requiredRoles: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PURCHASER, ROLES.FINANCE]
    },
    {
      label: 'User Management',
      href: '/admin/users',
      icon: <Users className="h-5 w-5" />,
      requiredRoles: [ROLES.ADMIN]
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
      requiredRoles: [ROLES.ADMIN, ROLES.PROJECT_MANAGER]
    }
  ]

  // Filter nav items based on user roles
  const filteredNavItems = navItems.filter(item => 
    item.requiredRoles.some(role => roles.includes(role))
  )

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-bold text-xl">
                Construction Manager
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="h-5 w-5 mr-2" />
                Sign out
              </Button>
            ) : (
              <Link href="/login" className="text-sm font-medium">
                Sign in
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {filteredNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2 text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
            
            {user && (
              <button
                className="flex w-full items-center px-3 py-2 text-base font-medium"
                onClick={() => {
                  handleSignOut()
                  setIsMobileMenuOpen(false)
                }}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
```

## Permission Feedback

User-friendly feedback when permission is denied.

### Permission Denied Component

```tsx
// src/components/auth/PermissionDenied.tsx
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface PermissionDeniedProps {
  message?: string
  redirectPath?: string
  redirectLabel?: string
}

export function PermissionDenied({
  message = "You don't have permission to access this resource.",
  redirectPath = '/',
  redirectLabel = 'Return Home'
}: PermissionDeniedProps) {
  const router = useRouter()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        {message}
      </p>
      <Button onClick={() => router.push(redirectPath)}>
        {redirectLabel}
      </Button>
    </div>
  )
}
```

### Enhanced RoleGuard with Custom Fallback

```tsx
// src/components/auth/RoleGuard.tsx (updated)
import { ReactNode, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { hasRole } from '@/utils/roles'
import { Loader2 } from 'lucide-react'
import { PermissionDenied } from './PermissionDenied'

interface RoleGuardProps {
  children: ReactNode
  requiredRole: string
  projectId?: string
  fallback?: ReactNode
  showDefaultDeniedMessage?: boolean
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  projectId,
  fallback = null,
  showDefaultDeniedMessage = true
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
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Checking permissions...</span>
      </div>
    )
  }
  
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    if (showDefaultDeniedMessage) {
      return (
        <PermissionDenied
          message={`You need ${requiredRole.replace('_', ' ')} permissions to access this.`}
        />
      )
    }
    
    return null
  }
  
  return <>{children}</>
}
```

## User Profile and Role Display

A user profile page showing assigned roles and projects.

### User Profile Page

```tsx
// src/app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'

interface Role {
  id: string
  name: string
  project_id: string | null
  project_name?: string | null
}

interface UserProfile {
  id: string
  email: string
  roles: Role[]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Not authenticated')
        }
        
        // Get user's roles
        const { data: roleAssignments, error: rolesError } = await supabase
          .from('user_role_assignments')
          .select(`
            role_id,
            project_id,
            user_roles(id, name)
          `)
          .eq('user_id', user.id)
        
        if (rolesError) throw rolesError
        
        // Get project details for project-specific roles
        const projectIds = roleAssignments
          .filter(ra => ra.project_id)
          .map(ra => ra.project_id)
          
        let projectsMap: Record<string, string> = {}
        
        if (projectIds.length > 0) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
          
          projectsMap = (projects || []).reduce((map, project) => ({
            ...map,
            [project.id]: project.name
          }), {})
        }
        
        // Format roles with project names
        const roles = roleAssignments.map(ra => ({
          id: ra.role_id,
          name: (ra.user_roles as any).name,
          project_id: ra.project_id,
          project_name: ra.project_id ? projectsMap[ra.project_id] : null
        }))
        
        setProfile({
          id: user.id,
          email: user.email || '',
          roles
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p>You must be logged in to view your profile.</p>
      </div>
    )
  }

  // Group roles by type (global vs project-specific)
  const globalRoles = profile.roles.filter(role => !role.project_id)
  const projectRoles = profile.roles.filter(role => role.project_id)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-xl">
              {profile.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-medium">{profile.email}</p>
            <p className="text-sm text-gray-500">User ID: {profile.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {globalRoles.length === 0 ? (
            <p className="text-gray-500">No global roles assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {globalRoles.map(role => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                >
                  {role.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project-Specific Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {projectRoles.length === 0 ? (
            <p className="text-gray-500">No project-specific roles assigned.</p>
          ) : (
            <ul className="space-y-3">
              {projectRoles.map(role => (
                <li 
                  key={`${role.id}-${role.project_id}`}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <span className="font-medium">
                    {role.project_name || 'Unknown Project'}
                  </span>
                  <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                    {role.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

## Integration with Existing Pages

Here's how to integrate role-based permissions with your existing pages:

### Example: Purchase Orders Page with Permission Checks

```tsx
// src/app/purchase-orders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { hasPurchaseOrderPermission } from '@/utils/permissions' // Use your existing utility
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PurchaseOrdersPage() {
  const [canCreate, setCanCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      try {
        // Check if user can create purchase orders
        const hasPermission = await hasPurchaseOrderPermission('create')
        setCanCreate(hasPermission)
        
        // Fetch purchase orders (this code remains unchanged)
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('*')
          
        if (error) throw error
        
        setPurchaseOrders(data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [supabase])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        
        {/* Only show create button if user has permission */}
        {canCreate && (
          <Button onClick={() => router.push('/purchase-orders/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
        )}
      </div>
      
      {/* Rest of your existing purchase orders view code remains unchanged */}
    </div>
  )
}
```

By implementing these frontend components, you'll have a comprehensive user interface for managing roles and permissions across your application, while maintaining compatibility with your existing codebase. 