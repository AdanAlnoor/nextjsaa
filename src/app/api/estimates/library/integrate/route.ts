import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { LibraryIntegrationService } from '@/features/estimates/services/libraryIntegrationService';
import type { LibraryItemSelection } from '@/features/estimates/types/libraryIntegration';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { projectId, structureId, selections } = body;

    // Validate required fields
    if (!projectId || !structureId || !selections || !Array.isArray(selections)) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, structureId, and selections' },
        { status: 400 }
      );
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

    // Validate selections
    for (const selection of selections) {
      if (!selection.item || !selection.structureId || !selection.elementId || !selection.quantity) {
        return NextResponse.json(
          { error: 'Invalid selection format' },
          { status: 400 }
        );
      }
    }

    // Process integration
    const integrationService = LibraryIntegrationService.getInstance();
    const results = await integrationService.createEstimateFromLibraryItems(
      projectId,
      structureId,
      selections as LibraryItemSelection[]
    );

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully integrated ${results.detailItems.length} items`
    });

  } catch (error) {
    console.error('Library integration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { errorMessage, errorStack });
    
    return NextResponse.json(
      { error: `Failed to integrate library items: ${errorMessage}` },
      { status: 500 }
    );
  }
}