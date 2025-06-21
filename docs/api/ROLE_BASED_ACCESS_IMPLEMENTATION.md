# Role-Based User Management Implementation Guide

This document provides instructions for implementing and using the role-based user management system in your construction management application.

## Overview

The role-based user management system provides:

- Global and project-specific roles
- Fine-grained permission controls
- User invitation system for projects
- Role-based UI rendering
- Admin interface for role management

## Implementation Steps

### 1. Database Setup

Run the migration script to create all necessary database tables, functions, and policies:

```bash
# Install dependencies if not already installed
npm install dotenv @supabase/supabase-js

# Run the migration script
node scripts/apply-role-migrations.js
```

The script will create:
- `user_roles` table
- `user_role_assignments` table
- `project_invitations` table
- Row Level Security (RLS) policies
- Helper functions for permission checks

### 2. Add Core Components

The system includes several core components:

1. **Role Utility Functions** (`src/utils/roles.ts`)
   - Role constants
   - Permission check functions
   - Role assignment functions

2. **RoleGuard Component** (`src/components/auth/RoleGuard.tsx`)
   - Renders UI elements based on user roles
   - Conditional rendering with fallback content

3. **InviteUserModal Component** (`src/components/projects/InviteUserModal.tsx`)
   - Modal for inviting users to projects with specific roles

4. **API Routes**
   - Project invitations
   - Invitation acceptance

### 3. Pages and Integration

The following pages have been created:

1. **Settings Page** (`src/app/settings/page.tsx`)
   - User profile and roles
   - Admin interface for role management
   - Project team management

2. **Team Management Page** (`src/app/projects/[id]/team/page.tsx`)
   - Project-specific team management
   - Role assignments for project members
   - Invitation management

3. **Invitation Page** (`src/app/invitations/[token]/page.tsx`)
   - Displays invitation details
   - Allows users to accept/decline invitations

## Using Role-Based Access Control

### Protecting UI Elements

Use the `RoleGuard` component to conditionally render UI elements based on user roles:

```tsx
// Only show to project managers
<RoleGuard requiredRole={ROLES.PROJECT_MANAGER} projectId={projectId}>
  <Button onClick={handleCreatePurchaseOrder}>Create Purchase Order</Button>
</RoleGuard>

// Show different content for different roles
<RoleGuard 
  requiredRole={ROLES.PURCHASER} 
  projectId={projectId}
  fallback={
    <RoleGuard 
      requiredRole={ROLES.ADMIN}
      fallback={<p>You don't have permission to view this content</p>}
    >
      <AdminContent />
    </RoleGuard>
  }
>
  <PurchaserContent />
</RoleGuard>
```

### Permission Checks in Code

Use the permission utility functions to check roles programmatically:

```tsx
import { hasRole, hasPermission } from '@/utils/roles';

// Check if current user has a specific role
const canEditProject = await hasPermission('edit_project', projectId);
if (canEditProject) {
  // Allow editing
}

// Check specific roles
const isAdmin = await hasRole(userId, 'admin');
const isPurchaser = await hasRole(userId, 'purchaser', projectId);
```

### Inviting Users to Projects

1. Use the `InviteUserModal` component:

```tsx
const [showInviteModal, setShowInviteModal] = useState(false);

// In your JSX
{showInviteModal && (
  <InviteUserModal
    isOpen={showInviteModal}
    onClose={() => setShowInviteModal(false)}
    projectId={projectId}
  />
)}

// Button to open modal
<Button onClick={() => setShowInviteModal(true)}>
  Invite User
</Button>
```

2. Users receive an invitation link that takes them to `/invitations/[token]` where they can accept the invitation.

### Managing User Roles

Administrators can manage user roles through the Settings page:

1. Navigate to `/settings`
2. Go to the "Users & Roles" tab
3. Select a user
4. Assign or remove roles

Project managers can manage project-specific roles:

1. Navigate to `/projects/[id]/team`
2. View team members and their roles
3. Invite new members with specific roles
4. Remove members from the project

## Role Definitions

The system includes five default roles:

1. **Admin**
   - Global access to all features
   - Can manage users and their roles
   - Can create projects and manage all aspects

2. **Project Manager**
   - Can manage specific projects they're assigned to
   - Can invite users to their projects
   - Can approve purchase orders

3. **Purchaser**
   - Can create purchase orders for assigned projects
   - Can view project information

4. **Finance**
   - Can approve purchase orders and convert to bills
   - Can view financial information

5. **Viewer**
   - Read-only access to projects they're assigned to

## Security Considerations

The system implements several security measures:

1. **Row Level Security (RLS)** in the database
   - Controls who can view/edit data
   - Enforces permissions at the database level

2. **Server-side validation**
   - Verifies permissions before allowing actions
   - Prevents unauthorized access

3. **Client-side protection**
   - Hides UI elements based on permissions
   - Provides appropriate feedback for unauthorized actions

## Troubleshooting

If you encounter issues:

1. **Role assignments not working:**
   - Check if the user has the correct role assignment in the database
   - Verify RLS policies are correctly applied

2. **Invitations not sending:**
   - Ensure the email service is properly configured
   - Check if the invitation record is being created in the database

3. **Permission denied errors:**
   - Verify the user has the required role for the action
   - Check if project-specific permissions are correctly assigned

## Extending the System

To add new roles or permissions:

1. Add new role constants in `src/utils/roles.ts`
2. Insert new roles into the `user_roles` table
3. Update permission mappings in the `hasPermission` function
4. Add appropriate RLS policies for the new roles

To add new protected features:

1. Wrap the feature in a `RoleGuard` component with appropriate roles
2. Add server-side permission checks in API routes
3. Use `hasRole` or `hasPermission` functions in your business logic 