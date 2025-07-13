import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { ScheduleAggregationService } from '@/features/estimates/services/scheduleAggregationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const { projectId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get schedule type from query params
    const { searchParams } = new URL(request.url);
    const scheduleType = searchParams.get('type') || 'all';

    const scheduleService = ScheduleAggregationService.getInstance();

    // Fetch schedules based on type
    let data;
    switch (scheduleType) {
      case 'materials':
        data = await scheduleService.getMaterialSchedule(projectId);
        break;
      case 'labour':
        data = await scheduleService.getLabourSchedule(projectId);
        break;
      case 'equipment':
        data = await scheduleService.getEquipmentSchedule(projectId);
        break;
      case 'all':
      default:
        const [materials, labour, equipment] = await Promise.all([
          scheduleService.getMaterialSchedule(projectId),
          scheduleService.getLabourSchedule(projectId),
          scheduleService.getEquipmentSchedule(projectId)
        ]);
        data = { materials, labour, equipment };
        break;
    }

    return NextResponse.json({
      success: true,
      data,
      projectId
    });

  } catch (error) {
    console.error('Schedule fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}