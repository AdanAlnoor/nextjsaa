-- Migrated from: fix_triggers.sql (root directory)
-- Created: 2025-04-12T12:24:31.705Z

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

-- Verify that all triggers are properly set up
SELECT 
    tgname AS trigger_name,
    proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'public.estimate_items'::regclass; 