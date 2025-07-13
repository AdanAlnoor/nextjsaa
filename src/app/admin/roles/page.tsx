'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/shared/types/supabase'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/shared/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { toast } from '@/shared/components/ui/use-toast'
import { Loader2, Trash2, Edit, Plus } from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  isProtected?: boolean
}

const PROTECTED_ROLES = ['admin', 'project_manager', 'purchaser', 'finance', 'viewer'];

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null)
  const [newRole, setNewRole] = useState({ name: '', description: '' })
  
  const supabase = createClient()
  
  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true)
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .order('name')
          
        if (error) {
          throw error
        }
        
        // Mark protected roles that can't be deleted
        const processedRoles = data.map(role => ({
          ...role,
          isProtected: PROTECTED_ROLES.includes(role.name)
        }))
        
        setRoles(processedRoles)
      } catch (error) {
        console.error('Error fetching roles:', error)
        toast({
          title: 'Error',
          description: 'Failed to load roles',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchRoles()
  }, [supabase])
  
  // Create new role
  const createRole = async () => {
    if (!newRole.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive'
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ 
          name: newRole.name.trim(), 
          description: newRole.description.trim() 
        })
        .select()
        
      if (error) {
        throw error
      }
      
      // Add to local state
      setRoles([...roles, { ...data[0], isProtected: false }])
      setNewRole({ name: '', description: '' })
      setIsCreateDialogOpen(false)
      
      toast({
        title: 'Role Created',
        description: `Role "${newRole.name}" created successfully`,
      })
    } catch (error) {
      console.error('Error creating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to create role. It may already exist.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Update role
  const updateRole = async () => {
    if (!roleToEdit) return
    
    if (!roleToEdit.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive'
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .update({ 
          name: roleToEdit.name.trim(), 
          description: roleToEdit.description.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', roleToEdit.id)
        .select()
        
      if (error) {
        throw error
      }
      
      // Update local state
      setRoles(roles.map(role => 
        role.id === roleToEdit.id 
          ? { ...data[0], isProtected: role.isProtected } 
          : role
      ))
      setRoleToEdit(null)
      setIsEditDialogOpen(false)
      
      toast({
        title: 'Role Updated',
        description: `Role updated successfully`,
      })
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Delete role
  const deleteRole = async () => {
    if (!roleToDelete) return
    
    setIsSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleToDelete.id)
        
      if (error) {
        throw error
      }
      
      // Update local state
      setRoles(roles.filter(role => role.id !== roleToDelete.id))
      setRoleToDelete(null)
      setIsDeleteDialogOpen(false)
      
      toast({
        title: 'Role Deleted',
        description: `Role "${roleToDelete.name}" deleted successfully`,
      })
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete role. It may be assigned to users.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg text-gray-700">Loading roles...</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Manage the roles that can be assigned to users
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <Plus size={16} />
                  Add New Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Add a new role to the system. Roles determine what actions users can perform.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input 
                      id="role-name" 
                      value={newRole.name}
                      onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                      placeholder="e.g. approver, viewer, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea 
                      id="role-description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                      placeholder="Describe what this role can do..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={createRole} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Role'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-gray-500">
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                roles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || 'No description'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Dialog open={isEditDialogOpen && roleToEdit?.id === role.id} onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) setRoleToEdit(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRoleToEdit(role);
                                setIsEditDialogOpen(true);
                              }}
                              disabled={role.isProtected}
                              title={role.isProtected ? "System roles cannot be edited" : "Edit role"}
                            >
                              <Edit size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Role</DialogTitle>
                              <DialogDescription>
                                Update the role details.
                              </DialogDescription>
                            </DialogHeader>
                            {roleToEdit && (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-role-name">Role Name</Label>
                                  <Input 
                                    id="edit-role-name" 
                                    value={roleToEdit.name}
                                    onChange={(e) => setRoleToEdit({...roleToEdit, name: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-role-description">Description</Label>
                                  <Textarea 
                                    id="edit-role-description"
                                    value={roleToEdit.description || ''}
                                    onChange={(e) => setRoleToEdit({...roleToEdit, description: e.target.value})}
                                    rows={3}
                                  />
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                                Cancel
                              </Button>
                              <Button onClick={updateRole} disabled={isSubmitting}>
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  'Update Role'
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={isDeleteDialogOpen && roleToDelete?.id === role.id} onOpenChange={(open) => {
                          setIsDeleteDialogOpen(open);
                          if (!open) setRoleToDelete(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                              onClick={() => {
                                setRoleToDelete(role);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={role.isProtected}
                              title={role.isProtected ? "System roles cannot be deleted" : "Delete role"}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Role</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this role? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <p className="text-sm text-gray-500">
                                If users are currently assigned this role, they will lose this permission.
                              </p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={deleteRole} disabled={isSubmitting}>
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete Role'
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>About Permission Roles</CardTitle>
          <CardDescription>
            How roles work in the purchase order approval system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Roles control what actions users can perform in the system. Each role provides different permissions:
          </p>
          <dl className="space-y-4">
            <div>
              <dt className="font-medium">System Roles (Cannot be deleted)</dt>
              <dd className="ml-4 mt-1 text-sm">
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>admin:</strong> Full access to all functions including user management</li>
                  <li><strong>project_manager:</strong> Can manage projects and approve purchase orders</li>
                  <li><strong>purchaser:</strong> Can create and edit draft purchase orders</li>
                  <li><strong>finance:</strong> Can approve purchase orders and convert them to bills</li>
                  <li><strong>viewer:</strong> Read-only access to projects and purchase orders</li>
                </ul>
              </dd>
            </div>
            <div>
              <dt className="font-medium">Custom Roles</dt>
              <dd className="ml-4 mt-1 text-sm">
                You can create custom roles with specific descriptions to match your organization&apos;s needs.
                These can be assigned to users just like system roles.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
} 