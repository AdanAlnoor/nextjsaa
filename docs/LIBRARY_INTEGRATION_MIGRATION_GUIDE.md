# Library Integration Migration Guide

## Overview

This guide explains how to apply the library integration migrations to your Supabase database.

## Migration Files Created

1. **`20250711105801_add_library_reference_columns.sql`**
   - Adds library reference columns to estimate tables
   - Creates performance indexes

2. **`20250711105802_create_schedule_views.sql`**
   - Creates material, labour, and equipment schedule views
   - Adds indexes for view performance

3. **`20250711105803_create_usage_tracking.sql`**
   - Creates usage tracking tables
   - Sets up popularity tracking
   - Implements RLS policies

4. **`20250711110000_library_integration_combined.sql`**
   - Combined migration with safety checks
   - Can be run multiple times safely

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `20250711110000_library_integration_combined.sql`
4. Paste into the SQL editor
5. Click "Run" to execute

### Option 2: Using Supabase CLI

If your migration history is in sync:

```bash
supabase db push
```

If you have migration conflicts:

```bash
# Apply the combined migration directly
supabase db execute -f supabase/migrations/20250711110000_library_integration_combined.sql
```

### Option 3: Manual Application

1. Connect to your database using any PostgreSQL client
2. Run the migration files in order:
   - First: `20250711105801_add_library_reference_columns.sql`
   - Second: `20250711105802_create_schedule_views.sql`
   - Third: `20250711105803_create_usage_tracking.sql`

Or run the combined migration that includes all changes.

## Verification

### Using the Verification Script

1. Add your service role key to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. Run the verification script:
   ```bash
   npx tsx scripts/verify-library-migration.ts
   ```

### Manual Verification

Check the following in your Supabase dashboard:

1. **Table Editor**: Verify new columns in:
   - `estimate_elements` table
   - `estimate_detail_items` table

2. **New Tables**: Check for:
   - `estimate_library_usage`
   - `library_item_popularity`
   - `estimate_hierarchy_templates`

3. **Views**: Verify in SQL Editor:
   ```sql
   SELECT * FROM estimate_material_schedule LIMIT 1;
   SELECT * FROM estimate_labour_schedule LIMIT 1;
   SELECT * FROM estimate_equipment_schedule LIMIT 1;
   ```

## Rollback (if needed)

If you need to rollback the migration:

1. Use the rollback script: `supabase/migrations/rollback_library_integration.sql`
2. Or manually in SQL Editor:

```sql
-- Remove views
DROP VIEW IF EXISTS estimate_material_schedule CASCADE;
DROP VIEW IF EXISTS estimate_labour_schedule CASCADE;
DROP VIEW IF EXISTS estimate_equipment_schedule CASCADE;

-- Remove usage tracking tables
DROP TABLE IF EXISTS estimate_library_usage CASCADE;
DROP TABLE IF EXISTS library_item_popularity CASCADE;
DROP TABLE IF EXISTS estimate_hierarchy_templates CASCADE;

-- Remove columns from estimate_elements
ALTER TABLE estimate_elements 
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS hierarchy_level,
DROP COLUMN IF EXISTS parent_element_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS is_from_library;

-- Remove columns from estimate_detail_items
ALTER TABLE estimate_detail_items 
DROP COLUMN IF EXISTS library_item_id,
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS factor_breakdown,
DROP COLUMN IF EXISTS is_from_library,
DROP COLUMN IF EXISTS rate_manual,
DROP COLUMN IF EXISTS rate_calculated;
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure you're using the service role key, not the anon key
   - Check RLS policies are not blocking access

2. **Column Already Exists**
   - The combined migration handles this with IF NOT EXISTS checks
   - Safe to run multiple times

3. **View Creation Fails**
   - Check that all referenced tables exist
   - Verify material_factors, labour_factors, equipment_factors tables exist

4. **Migration History Conflicts**
   - Use the combined migration file
   - Or apply directly through SQL Editor

## Next Steps

After successful migration:

1. Test the new columns by creating a library-based estimate
2. Verify schedule views are aggregating correctly
3. Check usage tracking is recording selections
4. Proceed with Phase 2: Core Services implementation