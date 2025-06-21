-- Migrated from: fix_schema.sql (root directory)
-- Created: 2025-04-12T12:24:31.705Z

-- SQL script to fix any potential issues with the cost_control_items table

-- First, check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_control_items'
    ) THEN
        -- Create the table if it doesn't exist
        CREATE TABLE public.cost_control_items (
            id UUID PRIMARY KEY,
            project_id TEXT NOT NULL,
            parent_id UUID,
            name TEXT NOT NULL,
            bo_amount NUMERIC DEFAULT 0,
            actual_amount NUMERIC DEFAULT 0,
            paid_bills NUMERIC DEFAULT 0,
            external_bills NUMERIC DEFAULT 0,
            pending_bills NUMERIC DEFAULT 0,
            wages NUMERIC DEFAULT 0,
            is_parent BOOLEAN DEFAULT false,
            level INTEGER DEFAULT 0,
            order_index INTEGER DEFAULT 0,
            imported_from_estimate BOOLEAN DEFAULT false,
            import_date TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add a foreign key constraint if the projects table exists
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'projects'
        ) THEN
            ALTER TABLE public.cost_control_items
            ADD CONSTRAINT fk_cost_control_items_project
            FOREIGN KEY (project_id)
            REFERENCES public.projects(id);
        END IF;
        
        RAISE NOTICE 'Created cost_control_items table';
    ELSE
        RAISE NOTICE 'cost_control_items table already exists';
    END IF;
END
$$;

-- Check for missing columns and add them if needed
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check for actual_amount column
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_control_items' 
        AND column_name = 'actual_amount'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.cost_control_items ADD COLUMN actual_amount NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added missing column: actual_amount';
    END IF;
    
    -- Check for imported_from_estimate column
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_control_items' 
        AND column_name = 'imported_from_estimate'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.cost_control_items ADD COLUMN imported_from_estimate BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added missing column: imported_from_estimate';
    END IF;
    
    -- Check for import_date column
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cost_control_items' 
        AND column_name = 'import_date'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.cost_control_items ADD COLUMN import_date TIMESTAMPTZ;
        RAISE NOTICE 'Added missing column: import_date';
    END IF;
END
$$;

-- Enable Row Level Security (RLS) for the table
ALTER TABLE public.cost_control_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'cost_control_items' 
        AND policyname = 'cost_control_items_policy'
    ) THEN
        CREATE POLICY cost_control_items_policy ON public.cost_control_items
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE 'Created RLS policy for cost_control_items';
    ELSE
        RAISE NOTICE 'RLS policy for cost_control_items already exists';
    END IF;
END
$$;

-- Create an index on project_id for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'cost_control_items' 
        AND indexname = 'idx_cost_control_items_project_id'
    ) THEN
        CREATE INDEX idx_cost_control_items_project_id ON public.cost_control_items(project_id);
        RAISE NOTICE 'Created index on project_id';
    ELSE
        RAISE NOTICE 'Index on project_id already exists';
    END IF;
END
$$;

-- Create an index on parent_id for faster parent-child lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'cost_control_items' 
        AND indexname = 'idx_cost_control_items_parent_id'
    ) THEN
        CREATE INDEX idx_cost_control_items_parent_id ON public.cost_control_items(parent_id);
        RAISE NOTICE 'Created index on parent_id';
    ELSE
        RAISE NOTICE 'Index on parent_id already exists';
    END IF;
END
$$;
