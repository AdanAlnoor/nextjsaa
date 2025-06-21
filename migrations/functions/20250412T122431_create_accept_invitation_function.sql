-- Migrated from: create_accept_invitation_function.sql (sql directory)
-- Created: 2025-04-12T12:24:31.707Z

-- Function to accept an invitation and create role assignment in a transaction
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id UUID,
  p_user_id UUID,
  p_role_id UUID,
  p_project_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Update invitation status
    UPDATE public.project_invitations
    SET 
      status = 'accepted',
      updated_at = NOW()
    WHERE id = p_invitation_id;
    
    -- Create role assignment
    INSERT INTO public.user_role_assignments (
      user_id,
      role_id,
      project_id
    ) VALUES (
      p_user_id,
      p_role_id,
      p_project_id
    );
    
    -- If we get here, commit the transaction
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- If anything fails, roll back the transaction
    ROLLBACK;
    RAISE;
  END;
END;
$$; 