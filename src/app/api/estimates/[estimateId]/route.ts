import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/shared/types/supabase-schema';

type Estimate = Database['public']['Tables']['estimates']['Row'];
type EstimateUpdate = Database['public']['Tables']['estimates']['Update'];

export async function GET(
  request: NextRequest,
  { params }: { params: { estimateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { estimateId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch estimate with library item details
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select(`
        *,
        library_item:library_item_id (
          id,
          code,
          description,
          unit,
          rate,
          division_id,
          section_id,
          assembly_id
        ),
        structure_elements!estimates_structure_element_id_fkey (
          id,
          name,
          element_type_id,
          structures!structure_elements_structure_id_fkey (
            id,
            name,
            project_id
          )
        )
      `)
      .eq('id', estimateId)
      .single();

    if (error || !estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the project
    const projectId = estimate.structure_elements?.structures?.project_id;
    if (projectId) {
      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: estimate
    });

  } catch (error) {
    console.error('Estimate fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { estimateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { estimateId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const updates: EstimateUpdate = await request.json();

    // Validate library item reference if provided
    if (updates.library_item_id) {
      const { data: libraryItem } = await supabase
        .from('library_items')
        .select('id')
        .eq('id', updates.library_item_id)
        .single();

      if (!libraryItem) {
        return NextResponse.json(
          { error: 'Invalid library item reference' },
          { status: 400 }
        );
      }
    }

    // Update estimate
    const { data: estimate, error: updateError } = await supabase
      .from('estimates')
      .update(updates)
      .eq('id', estimateId)
      .select()
      .single();

    if (updateError || !estimate) {
      return NextResponse.json(
        { error: 'Failed to update estimate' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estimate
    });

  } catch (error) {
    console.error('Estimate update error:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { estimateId: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { estimateId } = params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete estimate
    const { error: deleteError } = await supabase
      .from('estimates')
      .delete()
      .eq('id', estimateId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete estimate' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Estimate deleted successfully'
    });

  } catch (error) {
    console.error('Estimate delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete estimate' },
      { status: 500 }
    );
  }
}