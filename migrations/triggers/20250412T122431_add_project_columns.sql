-- Migrated from: add_project_columns.sql (root directory)
-- Created: 2025-04-12T12:24:31.698Z

-- Modified script to add new columns to projects table while ensuring UUID primary key
-- and adding a project_code column for codes like PR-003

-- First, drop existing constraints if they exist
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;

-- Ensure projects.id is UUID type if it's not already
DO $$
BEGIN
    -- Check if the id column is already UUID type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        -- If not UUID, convert it to UUID
        ALTER TABLE public.projects 
        ALTER COLUMN id TYPE UUID USING id::uuid;
    END IF;
END
$$;

-- Update projects table schema by adding new columns
ALTER TABLE public.projects 
DROP COLUMN IF EXISTS reviewer;

-- Add project_code column for codes like PR-003
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
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Add unique constraint on project_code
ALTER TABLE public.projects
ADD CONSTRAINT projects_project_code_unique UNIQUE (project_code);

-- Ensure tasks.project_id is UUID type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'project_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.tasks 
        ALTER COLUMN project_id TYPE UUID USING project_id::uuid;
    END IF;
END
$$;

-- Ensure project_members.project_id is UUID type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_members' 
        AND column_name = 'project_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.project_members 
        ALTER COLUMN project_id TYPE UUID USING project_id::uuid;
    END IF;
END
$$;

-- Re-add foreign key constraints
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_members
ADD CONSTRAINT project_members_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

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