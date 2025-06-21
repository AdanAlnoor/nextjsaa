-- Create enum for estimate status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estimate_status') THEN
        CREATE TYPE estimate_status AS ENUM ('Incomplete', 'Complete');
    END IF;
END $$;

-- Create estimate_items table
CREATE TABLE IF NOT EXISTS public.estimate_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.estimate_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level IN (0, 1, 2)),
    status estimate_status DEFAULT 'Incomplete',
    cost_type TEXT,
    quantity DECIMAL,
    unit TEXT,
    unit_cost DECIMAL,
    builder_cost DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    "order" INTEGER NOT NULL,
    index TEXT NOT NULL,
    CONSTRAINT valid_level2_fields CHECK (
        (level = 2 AND cost_type IS NOT NULL AND quantity IS NOT NULL AND unit IS NOT NULL AND unit_cost IS NOT NULL) OR
        (level != 2)
    )
);

-- Create indexes for better performance (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'estimate_items_project_id_idx') THEN
        CREATE INDEX estimate_items_project_id_idx ON public.estimate_items(project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'estimate_items_parent_id_idx') THEN
        CREATE INDEX estimate_items_parent_id_idx ON public.estimate_items(parent_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'estimate_items_order_idx') THEN
        CREATE INDEX estimate_items_order_idx ON public.estimate_items("order");
    END IF;
END $$;

-- Add RLS policies (dropping existing ones first to avoid conflicts)
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.estimate_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.estimate_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.estimate_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.estimate_items;

CREATE POLICY "Enable read access for authenticated users" ON public.estimate_items
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.estimate_items
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.estimate_items
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.estimate_items
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Drop existing triggers and functions to avoid conflicts
DROP TRIGGER IF EXISTS update_estimate_items_updated_at ON public.estimate_items;
DROP FUNCTION IF EXISTS update_estimate_items_updated_at() CASCADE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_estimate_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_estimate_items_updated_at
    BEFORE UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_items_updated_at();

-- Drop existing parent builder cost trigger and function with CASCADE
DROP TRIGGER IF EXISTS update_parent_builder_cost ON public.estimate_items;
DROP TRIGGER IF EXISTS update_parent_estimate_items_builder_cost ON public.estimate_items;
DROP FUNCTION IF EXISTS update_parent_builder_cost() CASCADE;

-- Create trigger to update parent builder_cost
CREATE OR REPLACE FUNCTION update_parent_builder_cost()
RETURNS TRIGGER AS $$
DECLARE
    parent_record RECORD;
BEGIN
    -- If this is a level 2 item, update its builder_cost based on quantity and unit_cost
    IF NEW.level = 2 THEN
        NEW.builder_cost = COALESCE(NEW.quantity * NEW.unit_cost, 0);
    END IF;

    -- Update parent's builder_cost
    IF NEW.parent_id IS NOT NULL THEN
        -- Calculate sum of children's builder_cost
        WITH RECURSIVE children AS (
            SELECT id, builder_cost, parent_id
            FROM public.estimate_items
            WHERE parent_id = NEW.parent_id
            UNION ALL
            SELECT e.id, e.builder_cost, e.parent_id
            FROM public.estimate_items e
            INNER JOIN children c ON c.id = e.parent_id
        )
        UPDATE public.estimate_items
        SET builder_cost = (
            SELECT COALESCE(SUM(builder_cost), 0)
            FROM children
        )
        WHERE id = NEW.parent_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_builder_cost
    BEFORE INSERT OR UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_builder_cost();