# Setting Up Estimate to Cost Control Sync

This guide explains how to set up automatic and manual syncing of estimate data to cost control items.

## Overview

The sync system has two main components:
1. PostgreSQL functions and triggers in the Supabase database
2. Client-side UI for manual syncing

## Database Setup

### Apply the Migration

To set up the database components, you can use the SQL migration file:

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Open the migration file: `migrations/20240621_add_estimate_sync_functions.sql`
4. Run the SQL script

This will:
- Add an `estimate_item_id` column to link cost control items to estimate items
- Add an `is_deleted` flag to handle soft deletes
- Create the `sync_estimate_to_cost_control` function
- Set up automatic triggers on estimate item changes

### Testing the Function

You can test the sync function manually in the SQL Editor:

```sql
-- Replace with an actual project ID
SELECT sync_estimate_to_cost_control('00000000-0000-0000-0000-000000000000');
```

## Using the Sync Feature

### Automatic Sync

With the triggers in place, cost control items will be created, updated, or marked as deleted automatically when:
- New estimate items are added
- Existing estimate items are modified
- Estimate items are deleted

### Manual Sync

Users can manually trigger a sync using the "Sync from Estimate" button in the Budget UI:

1. Navigate to Cost Control > Budget
2. Click the "Sync from Estimate" button
3. The system will fetch the latest estimate data and update cost control items

The manual sync is useful when:
- Setting up a new project
- Fixing discrepancies between estimate and cost control
- Testing the sync functionality

## Troubleshooting

If sync issues occur:

1. Check the browser console for error messages
2. Verify that the estimate items exist for the project
3. Confirm that the database functions are properly installed
4. Manually run the sync function in the SQL Editor to see any errors

## Technical Details

### PostgreSQL Functions

The sync implementation uses these key PostgreSQL functions:

1. `sync_estimate_to_cost_control`: Main function that copies estimate data to cost control
2. `trigger_sync_estimate_to_cost_control`: Trigger function for INSERT/UPDATE
3. `trigger_sync_estimate_to_cost_control_on_delete`: Trigger function for DELETE

### Data Flow

1. Estimate items are maintained in the `estimate_items` table
2. Cost control items are stored in the `cost_control_items` table
3. The sync functions create/update cost control items based on estimate items
4. A foreign key relationship links cost control items to their source estimate items

### Client-Side Components

The UI components for syncing include:
- `costControlService.ts`: API functions for syncing
- `SummaryTab.tsx`: UI for displaying budget and sync button
- `useSummaryData.ts`: Data fetching and management hook 