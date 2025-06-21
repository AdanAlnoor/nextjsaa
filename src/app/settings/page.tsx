'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Users, UserPlus, Settings2, ShieldCheck, X, PlusCircle, Folder, LayoutGrid, List, MoreHorizontal, Calendar, DollarSign, UserIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from '@/components/ui/use-toast'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ROLES, getUserRoles, assignRole, removeRole, isAccountOwner, type Role } from '@/utils/roles'
import Link from 'next/link'
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRoles, setUserRoles] = useState<Role[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>(ROLES.VIEWER)
  const [isOwner, setIsOwner] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Handle not logged in
          return
        }
        
        setUser(user)
        
        // Debug output for troubleshooting
        console.log("Current user:", user);
        
        // Get user roles - use direct query instead of utility function for debugging
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_role_assignments')
            .select(`
              role:user_roles(
                id,
                name
              )
            `)
            .eq('user_id', user.id);
            
          console.log("Direct role query:", roleData, roleError);
          
          if (roleData) {
            const mappedRoles = roleData.map(r => {
              if (r.role && typeof r.role === 'object' && 'name' in r.role) {
                return r.role.name as Role;
              }
              return null;
            }).filter((r): r is Role => r !== null);
            
            console.log("Mapped roles:", mappedRoles);
            setUserRoles(mappedRoles);
            
            // Check if user is account owner
            const hasOwnerRole = mappedRoles.includes(ROLES.ACCOUNT_OWNER);
            console.log("Is account owner:", hasOwnerRole);
            setIsOwner(hasOwnerRole);
          }
        } catch (roleQueryError) {
          console.error("Error querying roles directly:", roleQueryError);
        }
        
        // Get projects (if user has appropriate role)
        if (userRoles.includes(ROLES.ACCOUNT_OWNER) || 
            userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
            userRoles.includes(ROLES.ADMIN) || 
            userRoles.includes(ROLES.PROJECT_MANAGER)) {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, client')
            .order('name')
          
          setProjects(projectsData || [])
        }
        
        // Get users (if user is admin or account owner/manager)
        if (userRoles.includes(ROLES.ACCOUNT_OWNER) || 
            userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
            userRoles.includes(ROLES.ADMIN)) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, email, created_at')
            .order('email')
          
          setUsers(usersData || [])
        }
      } catch (err) {
        console.error('Error loading user data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadUserData()
  }, [])
  
  // Additional effect to fetch projects and users when roles change
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      const supabase = createClient();
      
      // Get projects (if user has appropriate role)
      if (userRoles.includes(ROLES.ACCOUNT_OWNER) || 
          userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
          userRoles.includes(ROLES.ADMIN) || 
          userRoles.includes(ROLES.PROJECT_MANAGER)) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name, client')
          .order('name')
        
        setProjects(projectsData || [])
      }
      
      // Get users (if user is admin or account owner/manager)
      if (userRoles.includes(ROLES.ACCOUNT_OWNER) || 
          userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
          userRoles.includes(ROLES.ADMIN)) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, created_at')
          .order('email')
        
        setUsers(usersData || [])
      }
    }
    
    fetchData();
  }, [userRoles, user])
  
  async function handleAssignRole() {
    if (!selectedUser) return
    
    try {
      // Check if assigning Account Owner and there's already one
      if (selectedRole === ROLES.ACCOUNT_OWNER) {
        const supabase = createClient();
        const { data: roles } = await supabase
          .from('user_roles')
          .select('id')
          .eq('name', ROLES.ACCOUNT_OWNER)
          .single();
          
        if (roles) {
          const { data, count } = await supabase
            .from('user_role_assignments')
            .select('id', { count: 'exact' })
            .eq('role_id', roles.id);
          
          if (count && count > 0) {
            toast({
              title: 'Error',
              description: 'There can only be one Account Owner per account',
              variant: 'destructive'
            })
            return
          }
        }
      }
      
      const success = await assignRole(selectedUser.id, selectedRole)
      
      if (success) {
        toast({
          title: 'Success',
          description: `Assigned ${selectedRole} role to user`
        })
        
        // Refresh selected user's roles
        if (selectedUser) {
          const roles = await getUserRoles(selectedUser.id)
          setSelectedUser({...selectedUser, roles})
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to assign role',
        variant: 'destructive'
      })
    }
  }
  
  async function handleRemoveRole(userId: string, role: string) {
    try {
      // Don't allow removing Account Owner unless transferring
      if (role === ROLES.ACCOUNT_OWNER) {
        toast({
          title: 'Error',
          description: 'Account Owner role can only be transferred, not removed',
          variant: 'destructive'
        })
        return
      }
      
      const success = await removeRole(userId, role as any)
      
      if (success) {
        toast({
          title: 'Success',
          description: `Removed ${role} role from user`
        })
        
        // Refresh selected user's roles
        if (selectedUser && selectedUser.id === userId) {
          const roles = await getUserRoles(userId)
          setSelectedUser({...selectedUser, roles})
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove role',
        variant: 'destructive'
      })
    }
  }
  
  async function handleSelectUser(user: any) {
    try {
      const roles = await getUserRoles(user.id)
      setSelectedUser({...user, roles})
    } catch (err) {
      console.error('Error loading user roles:', err)
    }
  }
  
  async function handleTransferOwnership() {
    if (!selectedUser) return
    
    try {
      if (!confirm(`Are you sure you want to transfer ownership to ${selectedUser.email}? This action cannot be undone.`)) {
        return
      }
      
      // First assign the Account Owner role to the new user
      const success = await assignRole(selectedUser.id, ROLES.ACCOUNT_OWNER)
      
      if (success) {
        // Then remove the Account Owner role from the current user
        await removeRole(user!.id, ROLES.ACCOUNT_OWNER)
        
        toast({
          title: 'Success',
          description: `Transferred ownership to ${selectedUser.email}`
        })
        
        // Refresh
        setIsOwner(false)
        setUserRoles(await getUserRoles(user!.id))
        if (selectedUser) {
          const roles = await getUserRoles(selectedUser.id)
          setSelectedUser({...selectedUser, roles})
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to transfer ownership',
        variant: 'destructive'
      })
    }
  }
  
  const filteredUsers = searchTerm 
    ? users.filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    : users
    
  // Helper function to get display name for role
  const getRoleDisplayName = (role: string) => {
    switch(role) {
      case ROLES.ACCOUNT_OWNER: return 'Account Owner';
      case ROLES.ACCOUNT_MANAGER: return 'Account Manager';
      case ROLES.ACCOUNT_USER: return 'Account User';
      case ROLES.PROJECT_USER: return 'Project User';
      default: return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
    }
  };
  
  console.log("Current isOwner state:", isOwner);
  console.log("Current userRoles:", userRoles);
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You need to be logged in to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const showSettings = isOwner || userRoles.includes(ROLES.ACCOUNT_OWNER);
  
  return (
    <div className="container mx-auto p-4 pb-16">
      <div className="flex items-center mb-6">
        <Settings2 className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <pre className="bg-gray-100 p-4 rounded mb-4 text-xs">Debug: isOwner={String(isOwner)}, Roles: {JSON.stringify(userRoles)}</pre>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          
          {/* Only account owner, managers or admins can see the Users tab */}
          {(userRoles.includes(ROLES.ACCOUNT_OWNER) || 
            userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
            userRoles.includes(ROLES.ADMIN)) && (
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users & Roles
            </TabsTrigger>
          )}
          
          {/* Only admins or account owner, managers, or project managers can see the Projects tab */}
          {(userRoles.includes(ROLES.ACCOUNT_OWNER) || 
            userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
            userRoles.includes(ROLES.ADMIN) || 
            userRoles.includes(ROLES.PROJECT_MANAGER)) && (
            <TabsTrigger value="projects">Projects</TabsTrigger>
          )}
          
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email || ''} disabled className="max-w-md" />
              </div>
              
              <div>
                <h3 className="text-md font-medium mb-2">Your Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {userRoles.length > 0 ? (
                    userRoles.map(role => (
                      <Badge key={role} variant={
                        role === ROLES.ACCOUNT_OWNER ? "default" :
                        role === ROLES.ACCOUNT_MANAGER ? "secondary" :
                        "outline"
                      }>
                        {getRoleDisplayName(role)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific roles assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Users & Roles Tab - Account Managers and Owners */}
        <TabsContent value="users">
          {(userRoles.includes(ROLES.ACCOUNT_OWNER) || 
            userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
            userRoles.includes(ROLES.ADMIN)) ? (
            <div className="grid md:grid-cols-[300px_1fr] gap-6">
              {/* User List */}
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    <Input 
                      placeholder="Search users..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-2"
                    />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No users found</p>
                    ) : (
                      filteredUsers.map(user => (
                        <div 
                          key={user.id}
                          className={`p-2 rounded-md cursor-pointer hover:bg-muted/60 ${
                            selectedUser?.id === user.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => handleSelectUser(user)}
                        >
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* User Details */}
              <Card>
                {!selectedUser ? (
                  <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">Select a user to manage roles</p>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle>{selectedUser.email}</CardTitle>
                      <CardDescription>Manage user roles</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="account">
                        <TabsList className="mb-4">
                          <TabsTrigger value="account">Account Roles</TabsTrigger>
                          <TabsTrigger value="projects">Project Roles</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="account">
                          <div className="mb-6">
                            <h3 className="text-lg font-medium mb-2">
                              <ShieldCheck className="h-4 w-4 inline-block mr-1" />
                              Assigned Roles
                            </h3>
                            {!selectedUser.roles || selectedUser.roles.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No roles assigned</p>
                            ) : (
                              <div className="space-y-2">
                                {selectedUser.roles.map((role: string) => (
                                  <div 
                                    key={role}
                                    className="flex items-center justify-between bg-muted/60 p-2 rounded-md"
                                  >
                                    <span className="font-medium">{getRoleDisplayName(role)}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveRole(selectedUser.id, role)}
                                      disabled={role === ROLES.ACCOUNT_OWNER && !userRoles.includes(ROLES.ACCOUNT_OWNER)}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex items-end gap-4">
                              <div className="space-y-2 flex-1">
                                <Label htmlFor="role">Assign Role</Label>
                                <Select 
                                  value={selectedRole} 
                                  onValueChange={(value) => setSelectedRole(value as Role)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={ROLES.ACCOUNT_OWNER} disabled={!userRoles.includes(ROLES.ACCOUNT_OWNER)}>
                                      Account Owner
                                    </SelectItem>
                                    <SelectItem value={ROLES.ACCOUNT_MANAGER}>
                                      Account Manager
                                    </SelectItem>
                                    <SelectItem value={ROLES.ACCOUNT_USER}>
                                      Account User
                                    </SelectItem>
                                    <SelectItem value={ROLES.PROJECT_USER}>
                                      Project User
                                    </SelectItem>
                                    {/* Legacy roles for backwards compatibility */}
                                    <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                                    <SelectItem value={ROLES.PROJECT_MANAGER}>Project Manager</SelectItem>
                                    <SelectItem value={ROLES.PURCHASER}>Purchaser</SelectItem>
                                    <SelectItem value={ROLES.FINANCE}>Finance</SelectItem>
                                    <SelectItem value={ROLES.VIEWER}>Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={handleAssignRole}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign Role
                              </Button>
                            </div>
                            
                            {/* Transfer Ownership Button - only visible to Account Owner */}
                            {userRoles.includes(ROLES.ACCOUNT_OWNER) && selectedUser.id !== user.id && (
                              <div className="mt-8 pt-6 border-t">
                                <h3 className="text-md font-medium mb-2">Account Ownership</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                  Transfer account ownership to this user. You will lose your Account Owner role.
                                </p>
                                <Button 
                                  variant="destructive" 
                                  onClick={handleTransferOwnership}
                                >
                                  Transfer Ownership
                                </Button>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="projects">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Project-Specific Roles</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedUser.roles?.includes(ROLES.ACCOUNT_OWNER) || 
                               selectedUser.roles?.includes(ROLES.ACCOUNT_MANAGER) ? (
                                "This user has access to all projects through their account role."
                              ) : (
                                "Assign this user to specific projects with custom roles."
                              )}
                            </p>
                            
                            {!(selectedUser.roles?.includes(ROLES.ACCOUNT_OWNER) || 
                               selectedUser.roles?.includes(ROLES.ACCOUNT_MANAGER)) && (
                              <div className="mt-4">
                                {projects.length === 0 ? (
                                  <p className="text-center text-muted-foreground py-4">No projects found</p>
                                ) : (
                                  <div className="border rounded-md divide-y">
                                    {projects.map(project => (
                                      <div key={project.id} className="p-3">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <h4 className="font-medium">{project.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                              {project.client || 'No client'}
                                            </p>
                                          </div>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            asChild
                                          >
                                            <Link href={`/projects/${project.id}/team?userId=${selectedUser.id}`}>
                                              Manage Role
                                            </Link>
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">You don't have permission to manage users</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Projects Tab */}
        <TabsContent value="projects">
          {(userRoles.includes(ROLES.ACCOUNT_OWNER) || 
            userRoles.includes(ROLES.ACCOUNT_MANAGER) || 
            userRoles.includes(ROLES.ADMIN) || 
            userRoles.includes(ROLES.PROJECT_MANAGER)) ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Project Management</CardTitle>
                  <CardDescription>Manage project settings and team members</CardDescription>
                </div>
                <Button asChild className="h-9">
                  <Link href="/projects/new">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Project
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex rounded-full bg-muted p-6 mb-4">
                      <Folder className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mt-2 mb-1">No projects yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      Get started by creating your first project to manage estimates, purchase orders, and more.
                    </p>
                    <Button asChild size="lg">
                      <Link href="/projects/new">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create New Project
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Search projects..."
                          className="w-[250px]"
                          // value={projectSearchTerm}
                          // onChange={(e) => setProjectSearchTerm(e.target.value)}
                        />
                        <Select defaultValue="all">
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="onhold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          Grid
                        </Button>
                        <Button variant="ghost" size="sm">
                          <List className="h-4 w-4 mr-2" />
                          List
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map(project => (
                        <div key={project.id} className="group relative rounded-lg border overflow-hidden transition-all hover:shadow-md">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium text-lg truncate">{project.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {project.client || 'No client'}
                                </p>
                              </div>
                              <div className="ml-2 flex-shrink-0">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Active
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2 mt-4">
                              <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>Started: {new Date().toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>Team: {Math.floor(Math.random() * 5) + 1} members</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>Budget: ${(Math.random() * 100000).toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                              <div className="flex -space-x-2">
                                {Array.from({ length: Math.floor(Math.random() * 4) + 1 }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="h-8 w-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                                  >
                                    <UserIcon className="h-4 w-4 text-primary" />
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/projects/${project.id}`}>
                                    View
                                  </Link>
                                </Button>
                                <Button asChild size="sm">
                                  <Link href={`/projects/${project.id}/team`}>
                                    Manage
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* New Project Card */}
                      <Link 
                        href="/projects/new"
                        className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-8 text-center h-full hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className="rounded-full bg-primary/10 p-3 mb-3">
                          <PlusCircle className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-medium mb-1">Create Project</h3>
                        <p className="text-sm text-muted-foreground">Add a new construction project</p>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">You don't have permission to manage projects</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>
                  {showSettings 
                    ? "Manage users and account roles" 
                    : "View account users and their roles"}
                </CardDescription>
              </div>
              {userRoles.includes(ROLES.ACCOUNT_OWNER) && (
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New users
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {userRoles.includes(ROLES.ACCOUNT_OWNER) || userRoles.includes(ROLES.ACCOUNT_MANAGER) ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="grid grid-cols-7 items-center border-b bg-muted/50 p-2 text-sm font-medium">
                      <div className="w-6"></div>
                      <div>Name</div>
                      <div>Email</div>
                      <div>Company</div>
                      <div>Phone</div>
                      <div>Projects</div>
                      <div className="flex items-center">
                        Account Role
                        <span className="ml-1 text-xs">▲</span>
                      </div>
                    </div>
                    <div className="divide-y">
                      {filteredUsers.map(u => {
                        const userProjectCount = projects.filter(p => 
                          p.members?.some((m: any) => m.user_id === u.id)
                        ).length;
                        
                        return (
                          <div key={u.id} className="grid grid-cols-7 items-center p-3 text-sm">
                            <div>
                              <input type="checkbox" className="rounded border-gray-300" />
                            </div>
                            <div className="font-medium">{u.full_name || u.email.split('@')[0]}</div>
                            <div>{u.email}</div>
                            <div>{u.company || '—'}</div>
                            <div>{u.phone || '—'}</div>
                            <div>{userProjectCount || 0}</div>
                            <div>
                              {u.id === user?.id ? (
                                <span className="text-sm font-medium">
                                  {userRoles.includes(ROLES.ACCOUNT_OWNER) 
                                    ? 'Account owner' 
                                    : userRoles.includes(ROLES.ACCOUNT_MANAGER)
                                      ? 'Account manager'
                                      : userRoles.includes(ROLES.ACCOUNT_USER)
                                        ? 'Account user'
                                        : 'Project user'}
                                </span>
                              ) : (
                                <Select
                                  disabled={!userRoles.includes(ROLES.ACCOUNT_OWNER)}
                                  defaultValue={
                                    u.roles?.includes(ROLES.ACCOUNT_OWNER)
                                      ? ROLES.ACCOUNT_OWNER
                                      : u.roles?.includes(ROLES.ACCOUNT_MANAGER)
                                        ? ROLES.ACCOUNT_MANAGER
                                        : u.roles?.includes(ROLES.ACCOUNT_USER)
                                          ? ROLES.ACCOUNT_USER
                                          : ROLES.PROJECT_USER
                                  }
                                  onValueChange={async (value) => {
                                    const currentRoles = u.roles || [];
                                    
                                    // Remove existing account roles
                                    const accountRoles = [
                                      ROLES.ACCOUNT_OWNER,
                                      ROLES.ACCOUNT_MANAGER,
                                      ROLES.ACCOUNT_USER,
                                      ROLES.PROJECT_USER
                                    ] as const;
                                    
                                    for (const role of currentRoles) {
                                      if (accountRoles.includes(role as any)) {
                                        await removeRole(u.id, role as Role);
                                      }
                                    }
                                    
                                    // Add new role
                                    await assignRole(u.id, value as Role);
                                    
                                    // Refresh user list
                                    const supabase = createClient();
                                    const { data: usersData } = await supabase
                                      .from('users')
                                      .select('id, email, created_at')
                                      .order('email');
                                    
                                    setUsers(usersData || []);
                                    
                                    toast({
                                      title: 'Role updated',
                                      description: `Changed ${u.email}'s role to ${getRoleDisplayName(value)}`
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem 
                                      value={ROLES.ACCOUNT_OWNER} 
                                      disabled={!userRoles.includes(ROLES.ACCOUNT_OWNER) || 
                                        filteredUsers.some(user => 
                                          user.roles?.includes(ROLES.ACCOUNT_OWNER) && user.id !== u.id
                                        )}
                                    >
                                      Account owner
                                    </SelectItem>
                                    <SelectItem value={ROLES.ACCOUNT_MANAGER}>
                                      Account manager
                                    </SelectItem>
                                    <SelectItem value={ROLES.ACCOUNT_USER}>
                                      Account user
                                    </SelectItem>
                                    <SelectItem value={ROLES.PROJECT_USER}>
                                      Project user
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {userRoles.includes(ROLES.ACCOUNT_OWNER) && (
                    <div className="pt-6 border-t mt-8">
                      <h3 className="text-lg font-medium mb-4">Account Information</h3>
                      <div className="space-y-4 max-w-md">
                        <div>
                          <Label htmlFor="account-name">Account Name</Label>
                          <Input id="account-name" placeholder="Your account name" />
                        </div>
                        <div>
                          <Label htmlFor="company">Company</Label>
                          <Input id="company" placeholder="Your company name" />
                        </div>
                        <Button className="mt-2">
                          Save Changes
                        </Button>
                      </div>
                      
                      <div className="pt-6 border-t mt-6">
                        <h3 className="text-lg font-medium mb-4">Billing Information</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Manage your subscription and payment information
                        </p>
                        <Button variant="outline">
                          Manage Billing
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground mb-2">
                    Only Account Owners and Managers can view and manage users.
                  </p>
                  <p className="text-sm">
                    Contact your Account Owner for any changes to your account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 