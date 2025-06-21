-- Enable the exec_sql function
CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 