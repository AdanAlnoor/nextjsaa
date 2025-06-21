-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    project_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    client TEXT,
    text_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create RLS policy
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Enable all access for authenticated users"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS projects_name_idx ON public.projects (name);
CREATE INDEX IF NOT EXISTS projects_project_number_idx ON public.projects (project_number); 