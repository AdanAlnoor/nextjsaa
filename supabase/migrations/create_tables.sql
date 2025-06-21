-- Create users table (if not already created by Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'planned')) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT CHECK (status IN ('pending', 'completed')) NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('comment', 'pull_request', 'edit')) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  user_name TEXT NOT NULL,
  user_avatar TEXT
);

-- Create project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- Add some sample data
INSERT INTO public.activities (type, title, user_name, user_avatar) VALUES
  ('comment', 'Left a comment on "Landing page redesign"', 'Sarah Miller', '/avatars/sarah.png'),
  ('pull_request', 'Created PR for feature/auth-improvements', 'John Doe', '/avatars/john.png'),
  ('edit', 'Updated documentation for API endpoints', 'Emily Chen', '/avatars/emily.png'); 