import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { cookies } from 'next/headers';
import { importEstimateDataToCostControl } from '@/lib/estimateImport';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // Create authenticated Supabase client
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Verify user authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { recalculateParents = true } = await request.json();
    const projectId = params.projectId;
    
    // Verify project access permission
    const { data: projectAccess } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .single();
      
    if (!projectAccess) {
      return NextResponse.json(
        { success: false, error: "You don't have access to this project" },
        { status: 403 }
      );
    }
    
    // Perform the import
    const result = await importEstimateDataToCostControl(projectId, recalculateParents);
    
    // Return response based on import result
    if (result.success) {
      return NextResponse.json({
        success: true,
        warning: result.warning,
        message: result.warning 
          ? 'Import completed with warnings' 
          : 'Import completed successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error?.message || 'Unknown error during import'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in estimate import API:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message || 'Unexpected error during import'
    }, { status: 500 });
  }
} 