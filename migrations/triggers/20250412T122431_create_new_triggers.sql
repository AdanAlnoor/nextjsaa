-- Migrated from: create_new_triggers.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Create function to automatically calculate amount for level 2 items
CREATE OR REPLACE FUNCTION calculate_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.level = 2 THEN
        NEW.amount = COALESCE(NEW.quantity * NEW.rate, 0);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically calculate amount
DROP TRIGGER IF EXISTS calculate_estimate_items_amount ON public.estimate_items;
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
        UPDATE public.estimate_items
        SET amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM public.estimate_items
            WHERE parent_id = OLD.parent_id
        )
        WHERE id = OLD.parent_id;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Update immediate parent's amount
        UPDATE public.estimate_items
        SET amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM public.estimate_items
            WHERE parent_id = NEW.parent_id
        )
        WHERE id = NEW.parent_id;

        -- Update grandparent's amount if exists
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

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to automatically update parent amount
DROP TRIGGER IF EXISTS update_parent_estimate_items_amount ON public.estimate_items;
CREATE TRIGGER update_parent_estimate_items_amount
    AFTER INSERT OR UPDATE OR DELETE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_amount(); 