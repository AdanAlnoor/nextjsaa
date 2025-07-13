/**
 * API Routes for Project Rates Management
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

    const projectRatesService = ProjectRatesService.getInstance();
    
    // Get effective date from query params if provided
    const url = new URL(request.url);
    const effectiveDateParam = url.searchParams.get('effective_date');
    const effectiveDate = effectiveDateParam ? new Date(effectiveDateParam) : undefined;

    const rates = await projectRatesService.getCurrentRates(params.projectId, effectiveDate);
    const statistics = await projectRatesService.getRateStatistics(params.projectId);

    return NextResponse.json({
      rates,
      statistics
    });

  } catch (error) {
    console.error('Error fetching project rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project rates' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access to the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember || !['owner', 'admin'].includes(projectMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { materials, labour, equipment, effectiveDate, expiryDate } = body;

    const projectRatesService = ProjectRatesService.getInstance();
    
    const newRates = await projectRatesService.setProjectRates(params.projectId, {
      materials: materials || {},
      labour: labour || {},
      equipment: equipment || {},
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined
    });

    return NextResponse.json({ success: true, rates: newRates });

  } catch (error) {
    console.error('Error setting project rates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set project rates' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access to the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !projectMember || !['owner', 'admin'].includes(projectMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { category, itemCode, rate, reason } = body;

    if (!category || !itemCode || rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: category, itemCode, rate' },
        { status: 400 }
      );
    }

    const projectRatesService = ProjectRatesService.getInstance();
    
    await projectRatesService.updateRateOverride(
      params.projectId,
      category,
      itemCode,
      rate,
      reason
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating rate override:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update rate' },
      { status: 500 }
    );
  }
}