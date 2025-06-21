import { createClient } from '@/utils/supabase/client'
import type { Database } from '@/types/supabase'

export const ROLES = {
  // Account-level roles
  ACCOUNT_OWNER: 'account_owner',
  ACCOUNT_MANAGER: 'account_manager',
  ACCOUNT_USER: 'account_user',
  PROJECT_USER: 'project_user',
  
  // Project-specific roles (for backward compatibility)
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  PURCHASER: 'purchaser',
  FINANCE: 'finance',
  VIEWER: 'viewer'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Checks if a user has a specific role for a project
 * @param userId User ID to check
 * @param roleName Role name to check
 * @param projectId Optional project ID for project-specific roles
 * @returns True if user has the role
 */
export async function hasRole(
  userId: string,
  roleName: Role,
  projectId?: string
): Promise<boolean> {
  if (!userId || !roleName) return false
  
  const supabase = createClient()
  
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

export type ActionType = 
  | 'create_project' 
  | 'invite_users' 
  | 'view_project' 
  | 'edit_project' 
  | 'create_purchase_order' 
  | 'approve_purchase_order'
  | 'manage_account_settings'
  | 'transfer_ownership'
  | 'manage_billing'
  | 'view_all_projects';

/**
 * Check if the current user has permission for a specific action
 * @param actionType The action type to check
 * @param projectId Optional project ID to scope permissions
 */
export async function hasPermission(
  actionType: ActionType,
  projectId?: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Define permission mappings
    const permissions: Record<ActionType, Role[]> = {
      create_project: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ACCOUNT_USER, ROLES.ADMIN],
      invite_users: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ADMIN, ROLES.PROJECT_MANAGER],
      view_project: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ACCOUNT_USER, ROLES.PROJECT_USER, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PURCHASER, ROLES.FINANCE, ROLES.VIEWER],
      edit_project: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ACCOUNT_USER, ROLES.ADMIN, ROLES.PROJECT_MANAGER],
      create_purchase_order: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ACCOUNT_USER, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PURCHASER],
      approve_purchase_order: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.FINANCE],
      manage_account_settings: [ROLES.ACCOUNT_OWNER],
      transfer_ownership: [ROLES.ACCOUNT_OWNER],
      manage_billing: [ROLES.ACCOUNT_OWNER],
      view_all_projects: [ROLES.ACCOUNT_OWNER, ROLES.ACCOUNT_MANAGER, ROLES.ADMIN]
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

/**
 * Get all roles for a user
 * @param userId User ID to get roles for
 * @param projectId Optional project ID to scope roles
 * @returns Array of role names
 */
export async function getUserRoles(
  userId: string,
  projectId?: string
): Promise<Role[]> {
  const supabase = createClient()
  
  try {
    const query = supabase
      .from('user_role_assignments')
      .select(`
        role:user_roles(
          name
        )
      `)
      .eq('user_id', userId)
    
    if (projectId) {
      query.eq('project_id', projectId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching user roles:', error)
      return []
    }
    
    // Fix the type issue with role.name access
    return data
      .map(assignment => {
        if (assignment.role && typeof assignment.role === 'object' && 'name' in assignment.role) {
          return assignment.role.name as Role;
        }
        return null;
      })
      .filter((role): role is Role => role !== null);
  } catch (error) {
    console.error('Error fetching user roles:', error)
    return []
  }
}

/**
 * Check if a user is an Account Owner
 * @param userId User ID to check
 */
export async function isAccountOwner(userId: string): Promise<boolean> {
  return hasRole(userId, ROLES.ACCOUNT_OWNER);
}

/**
 * Check if a user is an Account Manager
 * @param userId User ID to check
 */
export async function isAccountManager(userId: string): Promise<boolean> {
  return hasRole(userId, ROLES.ACCOUNT_MANAGER);
}

/**
 * Assign a role to a user
 * @param userId User ID to assign role to
 * @param roleName Role name to assign
 * @param projectId Optional project ID for project-specific role
 */
export async function assignRole(
  userId: string,
  roleName: Role,
  projectId?: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get the role ID
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('name', roleName)
      .single()
    
    if (roleError || !roles) {
      console.error('Error finding role:', roleError)
      return false
    }
    
    // Create the role assignment
    const { error } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: userId,
        role_id: roles.id,
        project_id: projectId || null
      })
    
    if (error) {
      console.error('Error assigning role:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error assigning role:', error)
    return false
  }
}

/**
 * Remove a role from a user
 * @param userId User ID to remove role from
 * @param roleName Role name to remove
 * @param projectId Optional project ID for project-specific role
 */
export async function removeRole(
  userId: string,
  roleName: Role,
  projectId?: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Get the role ID
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('name', roleName)
      .single()
    
    if (roleError || !roles) {
      console.error('Error finding role:', roleError)
      return false
    }
    
    // Remove the role assignment
    const query = supabase
      .from('user_role_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roles.id)
    
    if (projectId) {
      query.eq('project_id', projectId)
    }
    
    const { error } = await query
    
    if (error) {
      console.error('Error removing role:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error removing role:', error)
    return false
  }
} 