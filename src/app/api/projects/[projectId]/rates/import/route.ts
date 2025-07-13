/**
 * API Route for Project Rates Import
 * Phase 1: Project-Specific Pricing Services
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { ProjectRatesService } from '@/features/library/services/projectRatesService';

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

    // Check if user has admin access to the target project
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
    const { 
      sourceProjectId, 
      categories, 
      effectiveDate, 
      conflictResolution = 'overwrite',
      includeInactive = false 
    } = body;

    if (!sourceProjectId) {
      return NextResponse.json(
        { error: 'sourceProjectId is required' },
        { status: 400 }
      );
    }

    // Check if user has access to the source project
    const { data: sourceProjectMember, error: sourceMemberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', sourceProjectId)
      .eq('user_id', user.id)
      .single();

    if (sourceMemberError || !sourceProjectMember) {
      return NextResponse.json({ error: 'Source project not found or access denied' }, { status: 404 });
    }

    const projectRatesService = ProjectRatesService.getInstance();
    
    const importResult = await projectRatesService.importRatesFromProject({
      sourceProjectId,
      targetProjectId: params.projectId,
      categories: categories || ['materials', 'labour', 'equipment'],
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      conflictResolution,
      includeInactive
    });

    return NextResponse.json({
      success: true,
      result: importResult
    });

  } catch (error) {
    console.error('Error importing project rates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import rates' },
      { status: 500 }
    );
  }
}