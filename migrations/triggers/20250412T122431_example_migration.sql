-- Migrated from: example_migration.sql (root directory)
-- Created: 2025-04-12T12:24:31.701Z

-- Example migration file
-- This would typically be placed in supabase/migrations/[timestamp]_example_migration.sql

-- Create a new table
CREATE TABLE IF NOT EXISTS public.example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes
CREATE INDEX IF NOT EXISTS example_table_name_idx ON public.example_table(name);

-- Create a trigger for updated_at
CREATE OR REPLACE FUNCTION update_example_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_example_table_updated_at ON public.example_table;
CREATE TRIGGER update_example_table_updated_at
  BEFORE UPDATE ON public.example_table
  FOR EACH ROW
  EXECUTE FUNCTION update_example_table_updated_at();

-- Enable Row Level Security
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON public.example_table
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.example_table
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.example_table
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.example_table
  FOR DELETE
  USING (auth.role() = 'authenticated'); 