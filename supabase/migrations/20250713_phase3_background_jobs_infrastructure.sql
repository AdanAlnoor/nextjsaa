-- Phase 3: Background Jobs & Edge Functions Infrastructure
-- Creates database tables and functions to support background job processing

-- Price snapshots table for historical pricing data
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_rates JSONB NOT NULL DEFAULT '{}',
  item_prices JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background job logs for monitoring execution
CREATE TABLE IF NOT EXISTS background_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Library item popularity tracking
CREATE TABLE IF NOT EXISTS library_item_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  usage_count_30d INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  popularity_score DECIMAL(5,2) DEFAULT 0,
  commonly_paired_with UUID[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(library_item_id)
);

-- Usage tracking for intelligent suggestions
CREATE TABLE IF NOT EXISTS estimate_library_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID,
  element_id UUID,
  quantity DECIMAL(15,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_price_snapshots_project_date ON price_snapshots(project_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_date ON price_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_background_job_logs_job_name ON background_job_logs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_job_logs_status ON background_job_logs(status);
CREATE INDEX IF NOT EXISTS idx_background_job_logs_started_at ON background_job_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_item_popularity_score ON library_item_popularity(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_library_item_popularity_updated ON library_item_popularity(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimate_usage_item_date ON estimate_library_usage(library_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimate_usage_project_date ON estimate_library_usage(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimate_usage_date ON estimate_library_usage(created_at DESC);

-- Row Level Security
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_item_popularity ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_library_usage ENABLE ROW LEVEL SECURITY;

-- Policies for price_snapshots
CREATE POLICY "Users can view their project snapshots"
  ON price_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = price_snapshots.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage price snapshots"
  ON price_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies for background_job_logs
CREATE POLICY "Authenticated users can view job logs"
  ON background_job_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage job logs"
  ON background_job_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies for library_item_popularity
CREATE POLICY "Anyone can view popularity data"
  ON library_item_popularity FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage popularity data"
  ON library_item_popularity FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies for estimate_library_usage
CREATE POLICY "Users can view their project usage"
  ON estimate_library_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = estimate_library_usage.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert usage for their projects"
  ON estimate_library_usage FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = estimate_library_usage.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage usage data"
  ON estimate_library_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to clean old job logs (older than 30 days)
CREATE OR REPLACE FUNCTION clean_old_job_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM background_job_logs
  WHERE started_at < NOW() - INTERVAL '30 days';
  
  -- Log the cleanup
  INSERT INTO background_job_logs (job_name, status, completed_at, metadata)
  VALUES (
    'cleanup-old-logs',
    'completed',
    NOW(),
    jsonb_build_object('cleaned_records', (SELECT COUNT(*) FROM background_job_logs WHERE started_at < NOW() - INTERVAL '30 days'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popularity statistics
CREATE OR REPLACE FUNCTION get_library_item_statistics(item_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'usage_count_30d', COALESCE(p.usage_count_30d, 0),
    'popularity_score', COALESCE(p.popularity_score, 0),
    'last_used', p.last_used_at,
    'total_usage_all_time', (
      SELECT COUNT(*) FROM estimate_library_usage 
      WHERE library_item_id = item_id
    ),
    'projects_used_in', (
      SELECT COUNT(DISTINCT project_id) FROM estimate_library_usage 
      WHERE library_item_id = item_id
    ),
    'commonly_paired_with', COALESCE(p.commonly_paired_with, '{}')
  )
  INTO result
  FROM library_item_popularity p
  WHERE p.library_item_id = item_id;
  
  -- If no popularity record exists, return default values
  IF result IS NULL THEN
    result := jsonb_build_object(
      'usage_count_30d', 0,
      'popularity_score', 0,
      'last_used', NULL,
      'total_usage_all_time', 0,
      'projects_used_in', 0,
      'commonly_paired_with', '[]'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track library item usage (called when items are added to estimates)
CREATE OR REPLACE FUNCTION track_library_item_usage(
  p_library_item_id UUID,
  p_project_id UUID,
  p_estimate_id UUID DEFAULT NULL,
  p_element_id UUID DEFAULT NULL,
  p_quantity DECIMAL DEFAULT 1
)
RETURNS void AS $$
BEGIN
  -- Insert usage record
  INSERT INTO estimate_library_usage (
    library_item_id,
    project_id,
    estimate_id,
    element_id,
    quantity
  ) VALUES (
    p_library_item_id,
    p_project_id,
    p_estimate_id,
    p_element_id,
    p_quantity
  );
  
  -- Update popularity immediately (will be aggregated properly by background job)
  INSERT INTO library_item_popularity (
    library_item_id,
    usage_count_30d,
    last_used_at,
    popularity_score
  ) VALUES (
    p_library_item_id,
    1,
    NOW(),
    1
  )
  ON CONFLICT (library_item_id) DO UPDATE SET
    last_used_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get job execution summary
CREATE OR REPLACE FUNCTION get_job_execution_summary(days_back INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_jobs', COUNT(*),
    'successful_jobs', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed_jobs', COUNT(*) FILTER (WHERE status = 'failed'),
    'running_jobs', COUNT(*) FILTER (WHERE status = 'running'),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'completed')) * 100.0 / NULLIF(COUNT(*), 0), 2
    ),
    'avg_duration_seconds', ROUND(
      AVG(EXTRACT(EPOCH FROM completed_at - started_at)) FILTER (WHERE completed_at IS NOT NULL), 2
    ),
    'by_job_name', jsonb_object_agg(
      job_name,
      jsonb_build_object(
        'total', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed')
      )
    )
  )
  INTO result
  FROM background_job_logs
  WHERE started_at > NOW() - INTERVAL '1 day' * days_back;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for easy access to recent job performance
CREATE OR REPLACE VIEW job_performance_summary AS
SELECT 
  job_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'running') as currently_running,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')) * 100.0 / NULLIF(COUNT(*), 0), 2
  ) as success_rate_percent,
  AVG(EXTRACT(EPOCH FROM completed_at - started_at)) FILTER (WHERE completed_at IS NOT NULL) as avg_duration_seconds,
  MAX(started_at) as last_execution,
  MIN(started_at) as first_execution
FROM background_job_logs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY job_name
ORDER BY last_execution DESC NULLS LAST;

-- Grant necessary permissions
GRANT SELECT ON job_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_library_item_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_library_item_usage(UUID, UUID, UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_execution_summary(INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE price_snapshots IS 'Historical pricing data captured at regular intervals for trend analysis';
COMMENT ON TABLE background_job_logs IS 'Execution logs for all background jobs and edge functions';
COMMENT ON TABLE library_item_popularity IS 'Aggregated popularity scores and usage statistics for library items';
COMMENT ON TABLE estimate_library_usage IS 'Raw usage tracking data for generating intelligent suggestions';

COMMENT ON FUNCTION track_library_item_usage IS 'Call this function whenever a library item is used in an estimate';
COMMENT ON FUNCTION get_library_item_statistics IS 'Get comprehensive usage statistics for a library item';
COMMENT ON FUNCTION clean_old_job_logs IS 'Maintenance function to remove old job logs';
COMMENT ON FUNCTION get_job_execution_summary IS 'Get summary statistics for job execution over specified period';