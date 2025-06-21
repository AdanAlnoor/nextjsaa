-- Create user roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user role assignments table to link users to roles
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role_id, project_id)
);

-- Insert default roles
INSERT INTO public.user_roles (name, description) VALUES 
  ('admin', 'System administrator with full access'),
  ('project_manager', 'Can manage projects and approve purchase orders'),
  ('purchaser', 'Can create purchase orders'),
  ('finance', 'Can approve purchase orders and convert to bills'),
  ('viewer', 'Read-only access to projects')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_project_id ON public.user_role_assignments(project_id);

-- Row-level security policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.user_role_assignments TO service_role;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_role_assignments TO authenticated;

-- Policies for user_roles
CREATE POLICY "Anyone can view roles" 
ON public.user_roles
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify roles" 
ON public.user_roles
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

-- Policies for user_role_assignments
CREATE POLICY "Users can view their own role assignments" 
ON public.user_role_assignments
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all role assignments" 
ON public.user_role_assignments
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

CREATE POLICY "Admins can modify role assignments" 
ON public.user_role_assignments
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.user_has_role(
  user_id UUID,
  role_name TEXT,
  project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF project_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = user_has_role.user_id 
      AND ur.name = user_has_role.role_name
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = user_has_role.user_id 
      AND ur.name = user_has_role.role_name
      AND (ura.project_id = user_has_role.project_id OR ura.project_id IS NULL)
    );
  END IF;
END;
$$; 