-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user role assignments table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role_id, project_id)
);

-- Create project invitations table
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view roles" 
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can modify roles" 
ON public.user_roles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all role assignments"
ON public.user_role_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  )
);

CREATE POLICY "Project managers can manage project role assignments"
ON public.user_role_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() 
    AND ur.name = 'project_manager'
    AND ura.project_id = project_id
  )
);

-- Insert default roles
INSERT INTO public.user_roles (name, description) VALUES 
  ('admin', 'System administrator with full access'),
  ('project_manager', 'Can manage projects and approve purchase orders'),
  ('purchaser', 'Can create purchase orders'),
  ('finance', 'Can approve purchase orders and convert to bills'),
  ('viewer', 'Read-only access to projects')
ON CONFLICT (name) DO NOTHING;

-- Create helper function for checking roles
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