-- Migrated from: enable_exec_sql.sql (root directory)
-- Created: 2025-04-12T12:24:31.701Z

-- Enable the exec_sql function
CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 