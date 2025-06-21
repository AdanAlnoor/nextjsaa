-- Function to list all users with their assigned roles
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  roles jsonb
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user has admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid() AND ur.name = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role_id', ur.id,
          'role_name', ur.name,
          'project_id', ura.project_id
        )
      )
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = au.id
    ) AS roles
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION get_users_with_roles() TO authenticated; 