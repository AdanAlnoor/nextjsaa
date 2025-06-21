-- Create a function to list all users (only accessible by admins)
CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user has admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Return list of users
  RETURN QUERY
  SELECT au.id, au.email::text, au.created_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.list_users() TO authenticated; 