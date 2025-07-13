import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const supabase = createClient();
    
    // Test database connection with timing
    const { data, error } = await supabase.rpc('test_connection');
    const responseTime = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'error',
          error: error.message,
          responseTime,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Check for slow response
    const status = responseTime > 1000 ? 'degraded' : 'healthy';

    return NextResponse.json({
      status,
      database: 'operational',
      responseTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}