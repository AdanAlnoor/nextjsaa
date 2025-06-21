-- Migrated from: create_pgexecute_function.sql (root directory)
-- Created: 2025-04-12T12:24:31.700Z

-- Create a function to execute arbitrary SQL (requires admin privileges)
CREATE OR REPLACE FUNCTION pgexecute(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This will run with the privileges of the function creator
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the query and capture the result
  EXECUTE query;
  result := jsonb_build_object('success', true, 'message', 'SQL executed successfully');
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error information if the query fails
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$$; 