# Fixing Triggers in Supabase SQL Editor

Since we're having issues with the migration process, the most direct approach is to execute the SQL directly in the Supabase SQL Editor.

## Instructions

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project: `jrsubdglzxjoqpgbbxbq`
3. Go to the SQL Editor (in the left sidebar)
4. Create a new query
5. Copy and paste the following SQL code:

```sql
-- First, drop ALL triggers on the estimate_items table to ensure we start fresh
DO $$ 
DECLARE
    trigger_name text;
BEGIN
    FOR trigger_name IN (SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.estimate_items'::regclass)
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON public.estimate_items CASCADE';
    END LOOP;
END $$;

-- Drop all functions that might be related to the old column names
DROP FUNCTION IF EXISTS update_parent_builder_cost() CASCADE;
DROP FUNCTION IF EXISTS calculate_builder_cost() CASCADE;
DROP FUNCTION IF EXISTS update_parent_amount() CASCADE;
DROP FUNCTION IF EXISTS calculate_amount() CASCADE;

-- Create function to automatically calculate amount for level 2 items
CREATE OR REPLACE FUNCTION calculate_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.level = 2 THEN
        NEW.amount = COALESCE(NEW.quantity * NEW.rate, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate amount
CREATE TRIGGER calculate_estimate_items_amount
    BEFORE INSERT OR UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_amount();

-- Create function to update parent amount
CREATE OR REPLACE FUNCTION update_parent_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update immediate parent's amount
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE public.estimate_items
            SET amount = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.estimate_items
                WHERE parent_id = OLD.parent_id
            )
            WHERE id = OLD.parent_id;
            
            -- Update grandparent if it exists
            UPDATE public.estimate_items
            SET amount = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.estimate_items
                WHERE parent_id = p.id
            )
            FROM public.estimate_items p
            WHERE p.id = (
                SELECT parent_id 
                FROM public.estimate_items 
                WHERE id = OLD.parent_id
            );
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.parent_id IS NOT NULL THEN
            -- Update immediate parent's amount
            UPDATE public.estimate_items
            SET amount = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.estimate_items
                WHERE parent_id = NEW.parent_id
            )
            WHERE id = NEW.parent_id;
            
            -- Update grandparent if it exists
            UPDATE public.estimate_items
            SET amount = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.estimate_items
                WHERE parent_id = p.id
            )
            FROM public.estimate_items p
            WHERE p.id = (
                SELECT parent_id 
                FROM public.estimate_items 
                WHERE id = NEW.parent_id
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update parent amount
CREATE TRIGGER update_parent_estimate_items_amount
    AFTER INSERT OR UPDATE OR DELETE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_amount();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_estimate_items_updated_at
    BEFORE UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

6. Click "Run" to execute the SQL
7. Verify that the SQL executed successfully without errors

## Verification

After executing the SQL, you can verify that the triggers are set up correctly by running the following SQL query:

```sql
-- Check if triggers exist on estimate_items table
SELECT tgname AS trigger_name, 
       proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'public.estimate_items'::regclass;
```

You should see the following triggers:
- `calculate_estimate_items_amount`
- `update_parent_estimate_items_amount`
- `update_estimate_items_updated_at`

## Testing

To test that the triggers are working correctly, you can:

1. Update a level 2 item with a quantity and rate, and verify that the amount is calculated correctly
2. Update a child item and verify that the parent's amount is updated
3. Update any item and verify that the updated_at timestamp is updated

## Troubleshooting

If you encounter any errors:

1. Read the error message carefully to understand what went wrong
2. Check if any of the triggers or functions already exist and need to be dropped first
3. Ensure that the estimate_items table has the expected columns (amount, quantity, rate, level, parent_id, updated_at)
4. If needed, you can check the table structure with:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'estimate_items';
``` 