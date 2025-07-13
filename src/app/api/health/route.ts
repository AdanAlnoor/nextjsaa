import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Test database connection
    const { data, error } = await supabase
      .from('library_items')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      services: {
        database: 'operational',
        application: 'operational',
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}