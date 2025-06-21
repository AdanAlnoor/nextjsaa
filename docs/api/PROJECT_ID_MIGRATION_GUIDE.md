# Project ID Migration Guide: Text to UUID

This guide outlines the process for migrating project IDs from text format (e.g., "PR-001") to UUID format in your application.

## Overview

The migration involves:

1. Database schema changes
2. Data migration
3. Code updates
4. Testing
5. Rollback plan

## Prerequisites

- Backup your database before starting
- Schedule downtime for the migration
- Ensure all team members are aware of the changes

## Migration Steps

### 1. Database Migration

Run the following SQL scripts in order:

```bash
# 1. Run the main migration script
psql -d your_database -f migrate_project_ids_to_uuid.sql

# 2. Update purchase orders with new project IDs
psql -d your_database -f update_purchase_order_project_ids.sql
```

### 2. Code Deployment

Deploy the updated code that includes:

- Updated TypeScript types
- Modified service functions
- New utility functions for ID conversion
- UI changes to display project IDs correctly

### 3. Verification

After migration, verify:

- Projects are accessible by their new UUID
- Purchase orders are correctly associated with projects
- UI displays project information correctly
- API endpoints work with both UUID and text IDs (for backward compatibility)

## Rollback Plan

If issues occur, run the rollback script:

```bash
psql -d your_database -f rollback_project_id_migration.sql
```

Then revert code changes to the previous version.

## Technical Details

### Database Changes

The migration:

1. Adds a UUID column to the projects table
2. Creates a mapping between text IDs and UUIDs
3. Updates all references to project IDs in related tables
4. Swaps the primary key from text to UUID
5. Maintains the original text ID for backward compatibility

### Code Changes

The following files were updated:

- `src/types/supabase.ts`: Updated Database interface
- `src/lib/services/purchase-order-service.ts`: Modified to handle UUID project IDs
- `src/components/cost-control/PurchaseOrderTab.tsx`: Updated Project interface
- `src/lib/utils.ts`: Added utility function for ID conversion

### API Compatibility

The API now supports:

- UUID project IDs (primary)
- Text project IDs (for backward compatibility)
- Project numbers (for display and reference)

## Troubleshooting

### Common Issues

1. **Missing Project Associations**: Run `update_purchase_order_project_ids.sql` again
2. **UI Display Issues**: Check that the `getProjectIdFormats` utility is being used
3. **API Errors**: Ensure endpoints handle both UUID and text ID formats

### Support

Contact the development team at dev@example.com for assistance with migration issues. 