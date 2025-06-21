-- Migrated from: enable_execute_sql.sql (root directory)
-- Created: 2025-04-12T12:24:31.701Z

-- This function allows executing arbitrary SQL from the client
-- WARNING: This is potentially dangerous and should only be used in development
-- or with proper security measures in place
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
BEGIN
  RETURN (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM dblink('dbname=' || current_database(), query) AS t) t);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
-- You may want to restrict this further in production
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;

-- If you want to allow anonymous access (not recommended for production)
-- GRANT EXECUTE ON FUNCTION execute_sql TO anon;

-- Enable the dblink extension if not already enabled
CREATE EXTENSION IF NOT EXISTS dblink; 