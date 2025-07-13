-- Performance indexes for production deployment
-- Phase 6: Production Deployment

-- Library items search optimization
CREATE INDEX IF NOT EXISTS idx_library_items_search 
ON library_items USING gin(
  to_tsvector('english', coalesce(code, '') || ' ' || coalesce(name, '') || ' ' || coalesce(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_library_items_status_active 
ON library_items(status, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_library_items_assembly 
ON library_items(assembly_id) 
INCLUDE (code, name, unit);

-- Factor queries optimization
CREATE INDEX IF NOT EXISTS idx_materials_library_item 
ON materials(library_item_id) 
INCLUDE (item_id, quantity);

CREATE INDEX IF NOT EXISTS idx_labour_library_item 
ON labour(library_item_id) 
INCLUDE (item_id, quantity);

CREATE INDEX IF NOT EXISTS idx_equipment_library_item 
ON equipment(library_item_id) 
INCLUDE (item_id, quantity);

-- Estimate calculations optimization  
CREATE INDEX IF NOT EXISTS idx_estimate_items_project 
ON estimate_items(project_id, element_id) 
INCLUDE (library_item_id, quantity);

-- Project rates lookup
CREATE INDEX IF NOT EXISTS idx_project_rates_effective 
ON project_rates(project_id, effective_date DESC) 
WHERE expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP;

-- Popularity tracking
CREATE INDEX IF NOT EXISTS idx_library_usage_date 
ON estimate_library_usage(created_at DESC, library_item_id);

-- Audit trail
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource_type, resource_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(user_id, timestamp DESC);

-- Health check functions
CREATE OR REPLACE FUNCTION test_connection()
RETURNS boolean AS $$
BEGIN
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Database stats function
CREATE OR REPLACE FUNCTION get_db_connections()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'active', count(*) FILTER (WHERE state = 'active'),
    'idle', count(*) FILTER (WHERE state = 'idle'),
    'total', count(*)
  ) INTO result
  FROM pg_stat_activity
  WHERE datname = current_database();
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Slow queries function
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'query', query,
      'duration', total_time,
      'calls', calls
    )
  ) INTO result
  FROM pg_stat_statements
  WHERE total_time > 1000  -- queries taking more than 1 second
  ORDER BY total_time DESC
  LIMIT 10;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Materialized view for popular items
DROP MATERIALIZED VIEW IF EXISTS mv_popular_library_items;
CREATE MATERIALIZED VIEW mv_popular_library_items AS
SELECT 
  li.id,
  li.code,
  li.name,
  li.unit,
  li.assembly_id,
  COUNT(DISTINCT elu.estimate_id) as usage_count,
  COUNT(DISTINCT elu.project_id) as project_count,
  MAX(elu.created_at) as last_used_at
FROM library_items li
LEFT JOIN estimate_library_usage elu ON li.id = elu.library_item_id
WHERE li.is_active = true
  AND li.status = 'confirmed'
GROUP BY li.id, li.code, li.name, li.unit, li.assembly_id;

CREATE UNIQUE INDEX idx_mv_popular_items_id ON mv_popular_library_items(id);
CREATE INDEX idx_mv_popular_items_usage ON mv_popular_library_items(usage_count DESC);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_popular_items_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_library_items;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh via pg_cron (if available)
-- SELECT cron.schedule('refresh-popular-items', '0 */6 * * *', 'SELECT refresh_popular_items_mv();');

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id serial PRIMARY KEY,
  metric_name varchar(100) NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit varchar(20),
  recorded_at timestamp with time zone DEFAULT NOW(),
  additional_data jsonb
);

CREATE INDEX idx_performance_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_metric_name varchar(100),
  p_metric_value numeric,
  p_metric_unit varchar(20) DEFAULT 'ms',
  p_additional_data jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, additional_data)
  VALUES (p_metric_name, p_metric_value, p_metric_unit, p_additional_data);
END;
$$ LANGUAGE plpgsql;

-- API Keys table for secure API access
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash varchar(64) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  scopes text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT NOW(),
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  is_active boolean DEFAULT true
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE is_active = true;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;