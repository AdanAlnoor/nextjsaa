-- Migrated from: supabase_ready_script.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- Script to add project_code and additional columns to projects table
-- Optimized for Supabase SQL Editor

-- Begin transaction for safety
BEGIN;

-- First, drop ALL existing constraints that reference the projects table
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;

ALTER TABLE public.cost_control_items
DROP CONSTRAINT IF EXISTS cost_control_items_project_id_fkey;

ALTER TABLE public.estimate_items
DROP CONSTRAINT IF EXISTS estimate_items_project_id_fkey;

ALTER TABLE public.purchase_orders
DROP CONSTRAINT IF EXISTS purchase_orders_project_id_fkey;

-- Ensure projects.id is UUID type if it's not already
DO $$
DECLARE
    column_type TEXT;
BEGIN
    -- Check the current data type of the id column
    SELECT data_type INTO column_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'id';
    
    -- Only convert if it's not already UUID
    IF column_type != 'uuid' THEN
        -- For safety, create a backup of the projects table first
        CREATE TABLE IF NOT EXISTS public.projects_backup AS 
        SELECT * FROM public.projects;
        
        -- If the column is TEXT, we need to handle the conversion differently
        IF column_type = 'text' OR column_type = 'character varying' THEN
            -- First add a temporary UUID column
            ALTER TABLE public.projects ADD COLUMN temp_uuid UUID;
            
            -- Update it with converted values
            UPDATE public.projects SET temp_uuid = id::uuid WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            
            -- For any rows that couldn't be converted, generate new UUIDs
            UPDATE public.projects SET temp_uuid = gen_random_uuid() 
            WHERE temp_uuid IS NULL;
            
            -- Drop the primary key constraint
            ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_pkey;
            
            -- Rename the old id column
            ALTER TABLE public.projects RENAME COLUMN id TO old_id;
            
            -- Rename the temp column to id
            ALTER TABLE public.projects RENAME COLUMN temp_uuid TO id;
            
            -- Make it the primary key
            ALTER TABLE public.projects ADD PRIMARY KEY (id);
        END IF;
    END IF;
END
$$;

-- Update projects table schema by adding new columns
ALTER TABLE public.projects 
DROP COLUMN IF EXISTS reviewer;

-- Add project_code column for codes like PR-003 and other new columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_code TEXT,
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS client TEXT,
ADD COLUMN IF NOT EXISTS calendar TEXT,
ADD COLUMN IF NOT EXISTS project_color TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL,
ADD COLUMN IF NOT EXISTS area DECIMAL,
ADD COLUMN IF NOT EXISTS unit TEXT;

-- Add created_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
    END IF;
END
$$;

-- Add unique constraint on project_code if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'projects_project_code_unique' 
        AND conrelid = 'public.projects'::regclass
    ) THEN
        ALTER TABLE public.projects
        ADD CONSTRAINT projects_project_code_unique UNIQUE (project_code);
    END IF;
END
$$;

-- Update related tables to use the new UUID primary key
DO $$
DECLARE
    tasks_exists BOOLEAN;
    project_members_exists BOOLEAN;
    cost_control_items_exists BOOLEAN;
    estimate_items_exists BOOLEAN;
    purchase_orders_exists BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
    ) INTO tasks_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'project_members'
    ) INTO project_members_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_control_items'
    ) INTO cost_control_items_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_items'
    ) INTO estimate_items_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'purchase_orders'
    ) INTO purchase_orders_exists;
    
    -- Only proceed with updates if old_id column exists (indicating migration is in progress)
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'old_id'
    ) THEN
        -- Update tasks table if it exists
        IF tasks_exists THEN
            -- Add temporary column
            ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS temp_project_id UUID;
            
            -- Update with new UUIDs
            UPDATE public.tasks t
            SET temp_project_id = p.id
            FROM public.projects p
            WHERE t.project_id::text = p.old_id::text;
            
            -- Rename columns
            ALTER TABLE public.tasks DROP COLUMN IF EXISTS project_id;
            ALTER TABLE public.tasks RENAME COLUMN temp_project_id TO project_id;
        END IF;
        
        -- Update project_members table if it exists
        IF project_members_exists THEN
            -- Add temporary column
            ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS temp_project_id UUID;
            
            -- Update with new UUIDs
            UPDATE public.project_members pm
            SET temp_project_id = p.id
            FROM public.projects p
            WHERE pm.project_id::text = p.old_id::text;
            
            -- Rename columns
            ALTER TABLE public.project_members DROP COLUMN IF EXISTS project_id;
            ALTER TABLE public.project_members RENAME COLUMN temp_project_id TO project_id;
        END IF;
        
        -- Update cost_control_items table if it exists
        IF cost_control_items_exists THEN
            -- Add temporary column
            ALTER TABLE public.cost_control_items ADD COLUMN IF NOT EXISTS temp_project_id UUID;
            
            -- Update with new UUIDs
            UPDATE public.cost_control_items cci
            SET temp_project_id = p.id
            FROM public.projects p
            WHERE cci.project_id::text = p.old_id::text;
            
            -- Rename columns
            ALTER TABLE public.cost_control_items DROP COLUMN IF EXISTS project_id;
            ALTER TABLE public.cost_control_items RENAME COLUMN temp_project_id TO project_id;
        END IF;
        
        -- Update estimate_items table if it exists
        IF estimate_items_exists THEN
            -- Add temporary column
            ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS temp_project_id UUID;
            
            -- Update with new UUIDs
            UPDATE public.estimate_items ei
            SET temp_project_id = p.id
            FROM public.projects p
            WHERE ei.project_id::text = p.old_id::text;
            
            -- Rename columns
            ALTER TABLE public.estimate_items DROP COLUMN IF EXISTS project_id;
            ALTER TABLE public.estimate_items RENAME COLUMN temp_project_id TO project_id;
        END IF;
        
        -- Update purchase_orders table if it exists
        IF purchase_orders_exists THEN
            -- Add temporary column
            ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS temp_project_id UUID;
            
            -- Update with new UUIDs
            UPDATE public.purchase_orders po
            SET temp_project_id = p.id
            FROM public.projects p
            WHERE po.project_id::text = p.old_id::text;
            
            -- Rename columns
            ALTER TABLE public.purchase_orders DROP COLUMN IF EXISTS project_id;
            ALTER TABLE public.purchase_orders RENAME COLUMN temp_project_id TO project_id;
        END IF;
    END IF;
END
$$;

-- Re-add foreign key constraints
DO $$
DECLARE
    tasks_exists BOOLEAN;
    project_members_exists BOOLEAN;
    cost_control_items_exists BOOLEAN;
    estimate_items_exists BOOLEAN;
    purchase_orders_exists BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
    ) INTO tasks_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'project_members'
    ) INTO project_members_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_control_items'
    ) INTO cost_control_items_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_items'
    ) INTO estimate_items_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'purchase_orders'
    ) INTO purchase_orders_exists;
    
    -- Add constraints if tables exist
    IF tasks_exists THEN
        ALTER TABLE public.tasks
        ADD CONSTRAINT tasks_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    IF project_members_exists THEN
        ALTER TABLE public.project_members
        ADD CONSTRAINT project_members_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    IF cost_control_items_exists THEN
        ALTER TABLE public.cost_control_items
        ADD CONSTRAINT cost_control_items_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    IF estimate_items_exists THEN
        ALTER TABLE public.estimate_items
        ADD CONSTRAINT estimate_items_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    IF purchase_orders_exists THEN
        ALTER TABLE public.purchase_orders
        ADD CONSTRAINT purchase_orders_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Create a function to generate the next project code
CREATE OR REPLACE FUNCTION generate_next_project_code()
RETURNS TEXT AS $$
DECLARE
    last_code TEXT;
    code_number INTEGER;
    next_code TEXT;
BEGIN
    -- Get the highest project code
    SELECT project_code INTO last_code
    FROM public.projects
    WHERE project_code ~ '^PR-\d{3}$'
    ORDER BY project_code DESC
    LIMIT 1;
    
    -- If no codes exist yet, start with PR-001
    IF last_code IS NULL THEN
        RETURN 'PR-001';
    END IF;
    
    -- Extract the number part and increment it
    code_number := CAST(SUBSTRING(last_code FROM 4) AS INTEGER) + 1;
    
    -- Format the new code with leading zeros
    next_code := 'PR-' || LPAD(code_number::TEXT, 3, '0');
    
    RETURN next_code;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set project_code if not provided
CREATE OR REPLACE FUNCTION set_project_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set project_code if it's NULL or empty
    IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
        NEW.project_code := generate_next_project_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS set_project_code_trigger ON public.projects;
CREATE TRIGGER set_project_code_trigger
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION set_project_code();

-- Update existing projects that don't have a project_code
DO $$
DECLARE
    project_record RECORD;
    next_code TEXT;
BEGIN
    -- Get all projects without a project_code
    FOR project_record IN 
        SELECT id FROM public.projects 
        WHERE project_code IS NULL OR project_code = ''
    LOOP
        -- Generate a new code for each project
        next_code := generate_next_project_code();
        
        -- Update the project with the new code
        UPDATE public.projects
        SET project_code = next_code
        WHERE id = project_record.id;
    END LOOP;
END
$$;

-- Clean up old_id column if it exists and migration was successful
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'old_id'
    ) THEN
        -- Check if migration was successful
        IF (SELECT COUNT(*) FROM public.projects) > 0 THEN
            -- Drop the old_id column
            ALTER TABLE public.projects DROP COLUMN old_id;
        END IF;
    END IF;
END
$$;

-- Diagnostic and fix for project detail tabs visibility issue
DO $$
DECLARE
    cost_control_tabs_exist BOOLEAN;
    estimate_tabs_exist BOOLEAN;
    cost_control_items_count INTEGER := 0;
    estimate_items_count INTEGER := 0;
    purchase_orders_count INTEGER := 0;
    orphaned_tabs_count INTEGER := 0;
    tab_record RECORD;
BEGIN
    -- Check if project_tabs or similar table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'project_tabs'
    ) INTO cost_control_tabs_exist;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_tabs'
    ) INTO estimate_tabs_exist;
    
    -- Get count of items in each project-related table for diagnostics
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_control_items'
    ) THEN
        SELECT COUNT(*) INTO cost_control_items_count FROM public.cost_control_items;
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_items'
    ) THEN
        SELECT COUNT(*) INTO estimate_items_count FROM public.estimate_items;
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'purchase_orders'
    ) THEN
        SELECT COUNT(*) INTO purchase_orders_count FROM public.purchase_orders;
    END IF;
    
    -- Log diagnostics
    RAISE NOTICE 'Project Detail Tabs Diagnostic';
    RAISE NOTICE '----------------------------';
    RAISE NOTICE 'Cost Control Items: %', cost_control_items_count;
    RAISE NOTICE 'Estimate Items: %', estimate_items_count;
    RAISE NOTICE 'Purchase Orders: %', purchase_orders_count;
    
    -- Check for orphaned project items (items with project_id that doesn't exist in projects)
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_control_items'
    ) THEN
        SELECT COUNT(*) INTO orphaned_tabs_count 
        FROM public.cost_control_items cci
        LEFT JOIN public.projects p ON cci.project_id = p.id
        WHERE p.id IS NULL AND cci.project_id IS NOT NULL;
        
        IF orphaned_tabs_count > 0 THEN
            RAISE WARNING 'Found % orphaned cost control items', orphaned_tabs_count;
        END IF;
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_items'
    ) THEN
        SELECT COUNT(*) INTO orphaned_tabs_count 
        FROM public.estimate_items ei
        LEFT JOIN public.projects p ON ei.project_id = p.id
        WHERE p.id IS NULL AND ei.project_id IS NOT NULL;
        
        IF orphaned_tabs_count > 0 THEN
            RAISE WARNING 'Found % orphaned estimate items', orphaned_tabs_count;
        END IF;
    END IF;
    
    -- Fix: Make sure all project IDs in cost_control_items are valid UUIDs
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_control_items'
    ) THEN
        -- Check if project_id column is UUID type
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'cost_control_items' 
            AND column_name = 'project_id'
            AND data_type = 'uuid'
        ) THEN
            -- Fix any invalid UUIDs by setting them to NULL (will be addressed by frontend)
            UPDATE public.cost_control_items 
            SET project_id = NULL
            WHERE project_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.projects 
                WHERE projects.id = cost_control_items.project_id
            );
            
            RAISE NOTICE 'Fixed invalid project_id references in cost_control_items';
        ELSE
            RAISE WARNING 'cost_control_items.project_id is not UUID type, needs conversion';
        END IF;
    END IF;
    
    -- Fix: Make sure all project IDs in estimate_items are valid UUIDs
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_items'
    ) THEN
        -- Check if project_id column is UUID type
        IF EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'estimate_items' 
            AND column_name = 'project_id'
            AND data_type = 'uuid'
        ) THEN
            -- Fix any invalid UUIDs by setting them to NULL (will be addressed by frontend)
            UPDATE public.estimate_items 
            SET project_id = NULL
            WHERE project_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.projects 
                WHERE projects.id = estimate_items.project_id
            );
            
            RAISE NOTICE 'Fixed invalid project_id references in estimate_items';
        ELSE
            RAISE WARNING 'estimate_items.project_id is not UUID type, needs conversion';
        END IF;
    END IF;
    
    -- Fix: Check for NULL project_code values
    UPDATE public.projects
    SET project_code = generate_next_project_code()
    WHERE project_code IS NULL OR project_code = '';
    
    -- Verify that all projects have a project_code
    IF EXISTS (
        SELECT 1 FROM public.projects
        WHERE project_code IS NULL OR project_code = ''
    ) THEN
        RAISE WARNING 'There are still projects without project_code values';
    ELSE
        RAISE NOTICE 'All projects have valid project_code values';
    END IF;
    
    -- Create index on project_code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'projects' AND indexname = 'projects_project_code_idx'
    ) THEN
        CREATE INDEX IF NOT EXISTS projects_project_code_idx ON public.projects(project_code);
        RAISE NOTICE 'Created index on projects.project_code for better performance';
    END IF;
END
$$;

-- Verify that all tables are properly connected to the projects table
DO $$
DECLARE
    tasks_exists BOOLEAN;
    project_members_exists BOOLEAN;
    cost_control_items_exists BOOLEAN;
    estimate_items_exists BOOLEAN;
    purchase_orders_exists BOOLEAN;
    
    tasks_fkey_exists BOOLEAN;
    project_members_fkey_exists BOOLEAN;
    cost_control_items_fkey_exists BOOLEAN;
    estimate_items_fkey_exists BOOLEAN;
    purchase_orders_fkey_exists BOOLEAN;
    
    tasks_orphaned_count INTEGER;
    project_members_orphaned_count INTEGER;
    cost_control_items_orphaned_count INTEGER;
    estimate_items_orphaned_count INTEGER;
    purchase_orders_orphaned_count INTEGER;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
    ) INTO tasks_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'project_members'
    ) INTO project_members_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cost_control_items'
    ) INTO cost_control_items_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'estimate_items'
    ) INTO estimate_items_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'purchase_orders'
    ) INTO purchase_orders_exists;
    
    -- Check foreign key constraints
    IF tasks_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'tasks' 
            AND ccu.table_name = 'projects'
        ) INTO tasks_fkey_exists;
        
        -- Count orphaned records
        IF tasks_fkey_exists THEN
            SELECT COUNT(*) INTO tasks_orphaned_count
            FROM public.tasks t
            LEFT JOIN public.projects p ON t.project_id = p.id
            WHERE p.id IS NULL AND t.project_id IS NOT NULL;
            
            RAISE NOTICE 'tasks: Foreign key constraint exists. Orphaned records: %', tasks_orphaned_count;
        ELSE
            RAISE WARNING 'tasks: No foreign key constraint to projects table!';
        END IF;
    END IF;
    
    IF project_members_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'project_members' 
            AND ccu.table_name = 'projects'
        ) INTO project_members_fkey_exists;
        
        -- Count orphaned records
        IF project_members_fkey_exists THEN
            SELECT COUNT(*) INTO project_members_orphaned_count
            FROM public.project_members pm
            LEFT JOIN public.projects p ON pm.project_id = p.id
            WHERE p.id IS NULL AND pm.project_id IS NOT NULL;
            
            RAISE NOTICE 'project_members: Foreign key constraint exists. Orphaned records: %', project_members_orphaned_count;
        ELSE
            RAISE WARNING 'project_members: No foreign key constraint to projects table!';
        END IF;
    END IF;
    
    IF cost_control_items_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'cost_control_items' 
            AND ccu.table_name = 'projects'
        ) INTO cost_control_items_fkey_exists;
        
        -- Count orphaned records
        IF cost_control_items_fkey_exists THEN
            SELECT COUNT(*) INTO cost_control_items_orphaned_count
            FROM public.cost_control_items cci
            LEFT JOIN public.projects p ON cci.project_id = p.id
            WHERE p.id IS NULL AND cci.project_id IS NOT NULL;
            
            RAISE NOTICE 'cost_control_items: Foreign key constraint exists. Orphaned records: %', cost_control_items_orphaned_count;
        ELSE
            RAISE WARNING 'cost_control_items: No foreign key constraint to projects table!';
        END IF;
    END IF;
    
    IF estimate_items_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'estimate_items' 
            AND ccu.table_name = 'projects'
        ) INTO estimate_items_fkey_exists;
        
        -- Count orphaned records
        IF estimate_items_fkey_exists THEN
            SELECT COUNT(*) INTO estimate_items_orphaned_count
            FROM public.estimate_items ei
            LEFT JOIN public.projects p ON ei.project_id = p.id
            WHERE p.id IS NULL AND ei.project_id IS NOT NULL;
            
            RAISE NOTICE 'estimate_items: Foreign key constraint exists. Orphaned records: %', estimate_items_orphaned_count;
        ELSE
            RAISE WARNING 'estimate_items: No foreign key constraint to projects table!';
        END IF;
    END IF;
    
    IF purchase_orders_exists THEN
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'purchase_orders' 
            AND ccu.table_name = 'projects'
        ) INTO purchase_orders_fkey_exists;
        
        -- Count orphaned records
        IF purchase_orders_fkey_exists THEN
            SELECT COUNT(*) INTO purchase_orders_orphaned_count
            FROM public.purchase_orders po
            LEFT JOIN public.projects p ON po.project_id = p.id
            WHERE p.id IS NULL AND po.project_id IS NOT NULL;
            
            RAISE NOTICE 'purchase_orders: Foreign key constraint exists. Orphaned records: %', purchase_orders_orphaned_count;
        ELSE
            RAISE WARNING 'purchase_orders: No foreign key constraint to projects table!';
        END IF;
    END IF;
    
    -- Print summary of all connections
    RAISE NOTICE '----- TABLE CONNECTION SUMMARY -----';
    IF tasks_exists THEN
        RAISE NOTICE 'tasks: % (constraint exists: %)', 
            CASE WHEN tasks_fkey_exists AND tasks_orphaned_count = 0 THEN 'CONNECTED' ELSE 'ISSUE DETECTED' END,
            tasks_fkey_exists;
    END IF;
    
    IF project_members_exists THEN
        RAISE NOTICE 'project_members: % (constraint exists: %)', 
            CASE WHEN project_members_fkey_exists AND project_members_orphaned_count = 0 THEN 'CONNECTED' ELSE 'ISSUE DETECTED' END,
            project_members_fkey_exists;
    END IF;
    
    IF cost_control_items_exists THEN
        RAISE NOTICE 'cost_control_items: % (constraint exists: %)', 
            CASE WHEN cost_control_items_fkey_exists AND cost_control_items_orphaned_count = 0 THEN 'CONNECTED' ELSE 'ISSUE DETECTED' END,
            cost_control_items_fkey_exists;
    END IF;
    
    IF estimate_items_exists THEN
        RAISE NOTICE 'estimate_items: % (constraint exists: %)', 
            CASE WHEN estimate_items_fkey_exists AND estimate_items_orphaned_count = 0 THEN 'CONNECTED' ELSE 'ISSUE DETECTED' END,
            estimate_items_fkey_exists;
    END IF;
    
    IF purchase_orders_exists THEN
        RAISE NOTICE 'purchase_orders: % (constraint exists: %)', 
            CASE WHEN purchase_orders_fkey_exists AND purchase_orders_orphaned_count = 0 THEN 'CONNECTED' ELSE 'ISSUE DETECTED' END,
            purchase_orders_fkey_exists;
    END IF;
    
    RAISE NOTICE '-----------------------------------';
END
$$;

-- Commit the transaction
COMMIT; 