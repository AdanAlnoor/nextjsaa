import { createClient } from '@/shared/lib/supabase/client'
import type { Database } from '@/shared/types/supabase'

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
  
  const supabase = createClient()
  
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
  
  const supabase = createClient()
  
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
 * Check if the current user has permission for specific purchase order actions
 * @param action The action to check (create, edit, approve, convert)
 * @param projectId Optional project ID to scope the permissions
 * @returns Promise<boolean> - True if the user has permission
 */
export async function hasPurchaseOrderPermission(
  action: 'view' | 'create' | 'edit' | 'approve' | 'convert',
  projectId?: string
): Promise<boolean> {
  // Temporarily disabled role-based permissions for purchase orders
  // Always return true to allow all authenticated users to perform any action
  return true;
  
  // Original implementation commented out below:
  /*
  const supabase = createClient()
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    // Get user roles
    const roles = await getUserRoles(user.id, projectId)
    
    // Define which roles can perform which actions
    const permissions = {
      view: ['admin', 'project_manager', 'purchaser', 'finance', 'viewer'],
      create: ['admin', 'project_manager', 'purchaser'],
      edit: ['admin', 'project_manager', 'purchaser'],
      approve: ['admin', 'project_manager', 'finance'],
      convert: ['admin', 'finance']
    }
    
    // Check if the user has any of the required roles for this action
    return roles.some(role => permissions[action].includes(role))
  } catch (error) {
    console.error('Error checking purchase order permission:', error)
    return false
  }
  */
}

/**
 * Check if a user has a specific permission, optionally within a project context.
 */
export async function hasPermission(
  userId: string, 
  permissionName: string, 
  projectId?: string
): Promise<boolean> {
  if (!userId || !permissionName) return false;
  
  const supabase = createClient(); // Use standard client
  
  try {
    // Fetch user roles, considering project context if provided
    let query = supabase
      .from('user_role_assignments')
      .select(`
        role_id,
        user_roles!inner(id, name)
      `)
      .eq('user_id', userId);
      
    if (projectId) {
      query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
    }
    
    const { data: userRoleAssignments, error: userRolesError } = await query;

    if (userRolesError) {
      console.error('Error fetching user roles:', userRolesError);
      return false;
    }

    if (!userRoleAssignments || userRoleAssignments.length === 0) {
      console.log('User has no roles');
      return false;
    }
    
    const roleIds = userRoleAssignments.map(r => r.role_id);

    // Fetch the permission ID
    const { data: permissionData, error: permissionError } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permissionName)
      .single();

    if (permissionError || !permissionData) {
      console.error('Error fetching permission or permission not found:', permissionError);
      return false;
    }
    const permissionId = permissionData.id;

    // Check if any of the user's roles have the required permission
    const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .select('role_id')
      .eq('permission_id', permissionId)
      .in('role_id', roleIds); 

    if (rolePermissionsError) {
      console.error('Error fetching role permissions:', rolePermissionsError);
      return false;
    }

    return rolePermissionsData && rolePermissionsData.length > 0;

  } catch (error) {
    console.error('Unexpected error in hasPermission:', error);
    return false;
  }
}

/**
 * Get all permissions assigned to a user, optionally within a project context.
 */
export async function getAllUserPermissions(
  userId: string, 
  projectId?: string
): Promise<string[]> {
  if (!userId) return [];
  
  const supabase = createClient(); // Use standard client
  
  try {
    // Fetch user roles (project-specific and global)
    let query = supabase
      .from('user_role_assignments')
      .select(`
        role_id
      `)
      .eq('user_id', userId);
      
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    }

    const { data: userRoleAssignments, error: userRolesError } = await query;
    
    if (userRolesError || !userRoleAssignments || userRoleAssignments.length === 0) {
      console.error('Error fetching user roles or no roles found:', userRolesError);
      return [];
    }
    
    const roleIds = userRoleAssignments.map(r => r.role_id);

    // Fetch permission IDs associated with these roles
    const { data: rolePermsData, error: rolePermsError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);
      
    if (rolePermsError || !rolePermsData || rolePermsData.length === 0) {
      console.error('Error fetching role permissions or no permissions found for roles:', rolePermsError);
      return [];
    }
    
    const permissionIds = [...new Set(rolePermsData.map(rp => rp.permission_id))]; // Unique IDs

    // Fetch permission names for these IDs
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('name')
      .in('id', permissionIds);
      
    if (permissionsError) {
      console.error('Error fetching permission names:', permissionsError);
      return [];
    }

    return permissionsData ? permissionsData.map(p => p.name) : [];

  } catch (error) {
    console.error('Unexpected error in getAllUserPermissions:', error);
    return [];
  }
}

// Remove the placeholder functions added previously if they exist
// export async function checkPermission(...) { ... }
// export async function getUserPermissions(...) { ... }
// export async function checkRolePermission(...) { ... } 