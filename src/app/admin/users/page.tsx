'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ROLES, assignRole, removeRole, getUserRoles } from '@/utils/roles'
import RoleGuard from '@/components/auth/RoleGuard'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserPlus, Check, X } from "lucide-react"
import { toast } from '@/components/ui/use-toast'

interface User {
  id: string
  email: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState(ROLES.VIEWER)
  
  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Get all users (this requires admin access)
        const { data, error } = await supabase
          .from('users')
          .select('id, email, created_at')
          .order('created_at', { ascending: false })
          
        if (error) throw error
        
        setUsers(data || [])
      } catch (err: any) {
        console.error('Error loading users:', err)
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadUsers()
  }, [])
  
  // Load roles for selected user
  useEffect(() => {
    if (!selectedUser) {
      setUserRoles([])
      return
    }
    
    async function loadUserRoles() {
      try {
        const roles = await getUserRoles(selectedUser.id)
        setUserRoles(roles)
      } catch (err) {
        console.error('Error loading user roles:', err)
        toast({
          title: 'Error',
          description: 'Failed to load user roles',
          variant: 'destructive'
        })
      }
    }
    
    loadUserRoles()
  }, [selectedUser])
  
  async function handleAddRole() {
    if (!selectedUser) return
    
    try {
      const success = await assignRole(selectedUser.id, selectedRole)
      
      if (success) {
        toast({
          title: 'Success',
          description: `Assigned ${selectedRole} role to user`
        })
        // Refresh user roles
        const roles = await getUserRoles(selectedUser.id)
        setUserRoles(roles)
      } else {
        throw new Error('Failed to assign role')
      }
    } catch (err: any) {
      console.error('Error assigning role:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to assign role',
        variant: 'destructive'
      })
    }
  }
  
  async function handleRemoveRole(role: string) {
    if (!selectedUser) return
    
    try {
      const success = await removeRole(selectedUser.id, role as any)
      
      if (success) {
        toast({
          title: 'Success',
          description: `Removed ${role} role from user`
        })
        // Refresh user roles
        const roles = await getUserRoles(selectedUser.id)
        setUserRoles(roles)
      } else {
        throw new Error('Failed to remove role')
      }
    } catch (err: any) {
      console.error('Error removing role:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove role',
        variant: 'destructive'
      })
    }
  }
  
  // This page should only be accessible to admins
  return (
    <RoleGuard requiredPermission="manage_users">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        
        {loading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {/* User List */}
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Select a user to manage roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {users.map(user => (
                    <div 
                      key={user.id}
                      className={`p-2 rounded-md cursor-pointer hover:bg-muted/60 ${
                        selectedUser?.id === user.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
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
                    <Tabs defaultValue="global">
                      <TabsList className="mb-4">
                        <TabsTrigger value="global">Global Roles</TabsTrigger>
                        <TabsTrigger value="projects">Project Roles</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="global">
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-2">Assigned Roles</h3>
                          {userRoles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No roles assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {userRoles.map(role => (
                                <div 
                                  key={role}
                                  className="flex items-center justify-between bg-muted/60 p-2 rounded-md"
                                >
                                  <span className="font-medium">{role}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveRole(role)}
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-end gap-4">
                          <div className="space-y-2 flex-1">
                            <Label htmlFor="role">Assign Role</Label>
                            <Select 
                              value={selectedRole} 
                              onValueChange={(value) => setSelectedRole(value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(ROLES).map(role => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleAddRole}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Role
                          </Button>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="projects">
                        <p className="text-center text-muted-foreground py-8">
                          Project-specific role management would be implemented here.
                          <br />
                          It would show a list of projects and allow assigning roles for each project.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </RoleGuard>
  )
} 