/**
 * API Route for Project Rates History
 * Phase 1: Project-Specific Pricing Services
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { ProjectRatesService } from '@/features/library/services/projectRatesService';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const url = new URL(request.url);
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');
    const limitParam = url.searchParams.get('limit');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const projectRatesService = ProjectRatesService.getInstance();
    
    const history = await projectRatesService.getRateHistory(
      params.projectId,
      startDate,
      endDate,
      limit
    );

    return NextResponse.json({
      history,
      pagination: {
        total: history.length,
        limit,
        hasMore: history.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching project rates history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate history' },
      { status: 500 }
    );
  }
}