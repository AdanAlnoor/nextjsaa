# Fix for Missing estimate_project_summary Table

## Problem Description

The cost control summary feature in the application is trying to query a table called `estimate_project_summary` that doesn't exist in the database. This table is supposed to store aggregated project data including:

- Structure and element counts
- Estimate totals
- Bills totals (paid and unpaid)
- Purchase order totals
- Wages totals

## Solution

We've created a migration that creates this missing table and the necessary functions to populate it.

## How to Apply the Fix

### Option 1: Using Supabase SQL Editor (Recommended)

1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the file: `/sql/create_estimate_project_summary.sql`
4. Copy the entire contents of the file
5. Paste it into the SQL editor
6. Click "Run" to execute the script

The script will:
- Create the `estimate_project_summary` table
- Create functions to refresh project summaries
- Populate initial data for all existing projects
- Grant necessary permissions

### Option 2: Using Migration File

1. The migration file is located at: `/migrations/schema/20250618_create_estimate_project_summary_table.sql`
2. This can be applied through your migration system if you have one set up

## What the Fix Does

1. **Creates the estimate_project_summary table** with columns for:
   - `project_id` - Links to the projects table
   - `structure_count` - Number of structures in the estimate
   - `element_count` - Number of elements in the estimate
   - `estimate_total` - Total estimate amount
   - `paid_bills_total` - Total of paid bills
   - `unpaid_bills_total` - Total of unpaid bills
   - `bills_difference` - Difference between estimate and bills
   - `purchase_orders_total` - Total of purchase orders
   - `wages_total` - Total wages (placeholder for future implementation)

2. **Creates refresh_project_summary function** that:
   - Counts structures and elements for a project
   - Calculates totals from estimate data
   - Updates the summary table with current data

3. **Creates populate_all_project_summaries function** that:
   - Refreshes summaries for all projects in the system
   - Returns a count of projects updated

4. **Handles missing tables gracefully**:
   - If the `bills` table doesn't exist, it sets bill totals to 0
   - If the `purchase_orders` table doesn't exist, it sets PO total to 0

## Verification

After applying the fix, verify it worked by:

1. In Supabase SQL Editor, run:
   ```sql
   SELECT * FROM estimate_project_summary LIMIT 5;
   ```

2. Check that the table exists and has data

3. Test in the application:
   - Navigate to a project's cost control page
   - The summary tab should now load without errors

## Troubleshooting

If you still see errors after applying the fix:

1. **Check if the table was created**:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'estimate_project_summary'
   );
   ```

2. **Manually refresh a specific project**:
   ```sql
   SELECT refresh_project_summary('your-project-id-here');
   ```

3. **Check for permission issues**:
   ```sql
   SELECT has_table_privilege('authenticated', 'estimate_project_summary', 'SELECT');
   ```

## Related Files

- Hook using this table: `/src/components/cost-control/summary/hooks/useSummaryDetailData.ts`
- Service functions: `/src/services/summaryService.ts`
- Migration file: `/migrations/schema/20250618_create_estimate_project_summary_table.sql`
- SQL script: `/sql/create_estimate_project_summary.sql`

## Future Improvements

The current implementation creates a physical table that needs to be refreshed. Future improvements could include:

1. Converting to a view for real-time data
2. Adding triggers to auto-update on data changes
3. Implementing the wages calculation
4. Adding more detailed bill categorization