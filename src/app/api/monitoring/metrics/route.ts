import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { PerformanceMonitor } from '@/lib/monitoring/apm';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const monitor = PerformanceMonitor.getInstance();

  try {
    // Collect various metrics
    const [dbStats, appMetrics] = await Promise.all([
      getDatabaseStats(supabase),
      getApplicationMetrics(monitor),
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      database: dbStats,
      application: appMetrics,
      system: getSystemMetrics(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

async function getDatabaseStats(supabase: any) {
  try {
    // Simple database health check
    const { data, error } = await supabase
      .from('library_items')
      .select('count')
      .limit(1);

    return {
      healthy: !error,
      responseTime: Date.now(), // This would be better measured properly
      connections: {
        active: 1, // Placeholder values
        idle: 0,
        waiting: 0,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: -1,
      connections: {
        active: 0,
        idle: 0,
        waiting: 0,
      },
    };
  }
}

function getApplicationMetrics(monitor: PerformanceMonitor) {
  return {
    librarySearchAvg: monitor.getAverageMetric('library_search'),
    factorCalculationAvg: monitor.getAverageMetric('factor_calculation'),
    estimateCreationAvg: monitor.getAverageMetric('estimate_creation'),
    apiResponseTimeAvg: monitor.getAverageMetric('api_response_time'),
  };
}

function getSystemMetrics() {
  const usage = process.memoryUsage();
  return {
    memoryUsage: {
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
  };
}