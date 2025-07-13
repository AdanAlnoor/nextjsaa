import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ScheduleAggregationService } from '@/features/estimates/services/scheduleAggregationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get export parameters from query
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as 'csv' | 'excel' | 'pdf' || 'excel';
    const type = searchParams.get('type') as 'material' | 'labour' | 'equipment' || 'material';

    const scheduleService = ScheduleAggregationService.getInstance();

    // Generate export
    const blob = await scheduleService.exportSchedule(projectId, format, type);
    const buffer = await blob.arrayBuffer();

    // Set appropriate headers based on format
    const headers = new Headers();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${project.name}-${type}-schedule-${timestamp}`;

    switch (format) {
      case 'csv':
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
        break;
      case 'excel':
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        headers.set('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        break;
      case 'pdf':
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        break;
    }

    return new NextResponse(buffer, { headers });

  } catch (error) {
    console.error('Schedule export error:', error);
    return NextResponse.json(
      { error: 'Failed to export schedule' },
      { status: 500 }
    );
  }
}