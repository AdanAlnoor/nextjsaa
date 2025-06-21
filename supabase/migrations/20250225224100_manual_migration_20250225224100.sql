-- Drop existing objects first to avoid conflicts
DROP TRIGGER IF EXISTS update_parent_estimate_items_amount ON public.estimate_items;
DROP TRIGGER IF EXISTS calculate_estimate_items_amount ON public.estimate_items;
DROP TRIGGER IF EXISTS update_estimate_items_updated_at ON public.estimate_items;
DROP FUNCTION IF EXISTS update_parent_amount() CASCADE;
DROP FUNCTION IF EXISTS calculate_amount() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP INDEX IF EXISTS estimate_items_project_id_idx;
DROP INDEX IF EXISTS estimate_items_parent_id_idx;
DROP INDEX IF EXISTS estimate_items_order_idx;
DROP VIEW IF EXISTS estimate_items_hierarchy;
DROP TRIGGER IF EXISTS update_parent_builder_cost ON public.estimate_items;
DROP FUNCTION IF EXISTS update_parent_builder_cost() CASCADE;

-- Alter existing table instead of creating a new one
DO $$ 
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'estimate_items') THEN
        -- Alter existing table
        ALTER TABLE public.estimate_items 
            DROP COLUMN IF EXISTS cost_type,
            DROP COLUMN IF EXISTS unit_cost,
            DROP COLUMN IF EXISTS builder_cost;
            
        -- Add new columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimate_items' AND column_name = 'rate') THEN
            ALTER TABLE public.estimate_items ADD COLUMN rate DECIMAL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimate_items' AND column_name = 'amount') THEN
            ALTER TABLE public.estimate_items ADD COLUMN amount DECIMAL DEFAULT 0;
        END IF;
        
        -- Update status column to use TEXT type with check constraint
        ALTER TABLE public.estimate_items 
            ALTER COLUMN status TYPE TEXT,
            ALTER COLUMN status SET DEFAULT 'Incomplete',
            ADD CONSTRAINT status_check CHECK (status IN ('Incomplete', 'Complete'));
            
        -- Update the constraint for level fields
        ALTER TABLE public.estimate_items DROP CONSTRAINT IF EXISTS valid_level_fields;
        ALTER TABLE public.estimate_items ADD CONSTRAINT valid_level_fields CHECK (
            (level = 2 AND quantity IS NOT NULL AND unit IS NOT NULL AND rate IS NOT NULL) OR
            (level < 2 AND quantity IS NULL AND unit IS NULL AND rate IS NULL)
        );
    ELSE
        -- Create new table if it doesn't exist
        CREATE TABLE public.estimate_items (
            id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
            project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
            parent_id TEXT REFERENCES public.estimate_items(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            level INTEGER NOT NULL CHECK (level IN (0, 1, 2)),
            status TEXT DEFAULT 'Incomplete' CHECK (status IN ('Incomplete', 'Complete')),
            quantity DECIMAL,
            unit TEXT,
            rate DECIMAL,
            amount DECIMAL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            "order" INTEGER NOT NULL,
            index TEXT NOT NULL,
            CONSTRAINT valid_level_fields CHECK (
                (level = 2 AND quantity IS NOT NULL AND unit IS NOT NULL AND rate IS NOT NULL) OR
                (level < 2 AND quantity IS NULL AND unit IS NULL AND rate IS NULL)
            )
        );
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS estimate_items_project_id_idx ON public.estimate_items(project_id);
CREATE INDEX IF NOT EXISTS estimate_items_parent_id_idx ON public.estimate_items(parent_id);
CREATE INDEX IF NOT EXISTS estimate_items_order_idx ON public.estimate_items("order");

-- Enable Row Level Security (RLS)
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first)
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_estimate_items_updated_at
    BEFORE UPDATE ON public.estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Optional: Create a view for hierarchical display of estimate items
CREATE OR REPLACE VIEW estimate_items_hierarchy AS
WITH RECURSIVE item_tree AS (
    -- Base case: get all root items (level 0)
    SELECT 
        id,
        name,
        level,
        parent_id,
        amount,
        status,
        quantity,
        unit,
        rate,
        "order",
        index,
        1 AS depth,
        ARRAY[id] AS path,
        id::text AS path_string
    FROM public.estimate_items
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: get children
    SELECT 
        e.id,
        e.name,
        e.level,
        e.parent_id,
        e.amount,
        e.status,
        e.quantity,
        e.unit,
        e.rate,
        e."order",
        e.index,
        t.depth + 1,
        t.path || e.id,
        t.path_string || '/' || e.id::text
    FROM public.estimate_items e
    INNER JOIN item_tree t ON t.id = e.parent_id
)
SELECT 
    id,
    name,
    level,
    parent_id,
    amount,
    status,
    quantity,
    unit,
    rate,
    "order",
    index,
    depth,
    path,
    path_string
FROM item_tree
ORDER BY path_string;

-- Data migration: Update existing data to use the new schema
DO $$ 
BEGIN
    -- Migrate data from unit_cost to rate if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimate_items' AND column_name = 'unit_cost') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimate_items' AND column_name = 'rate') THEN
        UPDATE public.estimate_items SET rate = unit_cost WHERE unit_cost IS NOT NULL;
    END IF;
    
    -- Migrate data from builder_cost to amount if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimate_items' AND column_name = 'builder_cost') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estimate_items' AND column_name = 'amount') THEN
        UPDATE public.estimate_items SET amount = builder_cost WHERE builder_cost IS NOT NULL;
    END IF;
END $$; 