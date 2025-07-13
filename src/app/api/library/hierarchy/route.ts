import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/shared/types/supabase-schema';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId');
    const sectionId = searchParams.get('sectionId');
    const assemblyId = searchParams.get('assemblyId');
    const search = searchParams.get('search');

    // Build hierarchy data
    let hierarchyData: any = {};

    // Fetch divisions
    let divisionsQuery = supabase
      .from('divisions')
      .select('id, code, name, description')
      .order('code');

    if (search) {
      divisionsQuery = divisionsQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data: divisions, error: divisionsError } = await divisionsQuery;
    if (divisionsError) throw divisionsError;
    hierarchyData.divisions = divisions;

    // Fetch sections if divisionId is provided
    if (divisionId) {
      let sectionsQuery = supabase
        .from('sections')
        .select('id, code, name, description, division_id')
        .eq('division_id', divisionId)
        .order('code');

      if (search) {
        sectionsQuery = sectionsQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }

      const { data: sections, error: sectionsError } = await sectionsQuery;
      if (sectionsError) throw sectionsError;
      hierarchyData.sections = sections;
    }

    // Fetch assemblies if sectionId is provided
    if (sectionId) {
      let assembliesQuery = supabase
        .from('assemblies')
        .select('id, code, name, description, section_id')
        .eq('section_id', sectionId)
        .order('code');

      if (search) {
        assembliesQuery = assembliesQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }

      const { data: assemblies, error: assembliesError } = await assembliesQuery;
      if (assembliesError) throw assembliesError;
      hierarchyData.assemblies = assemblies;
    }

    // Fetch library items if assemblyId is provided
    if (assemblyId) {
      let itemsQuery = supabase
        .from('library_items')
        .select(`
          id,
          code,
          description,
          unit,
          rate,
          assembly_id,
          material_factors,
          labour_factors,
          equipment_factors
        `)
        .eq('assembly_id', assemblyId)
        .order('code');

      if (search) {
        itemsQuery = itemsQuery.or(`description.ilike.%${search}%,code.ilike.%${search}%`);
      }

      const { data: items, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;
      hierarchyData.items = items;
    }

    return NextResponse.json({
      success: true,
      data: hierarchyData
    });

  } catch (error) {
    console.error('Hierarchy fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hierarchy data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { type, data } = body;

    let result;
    switch (type) {
      case 'division':
        const { data: division, error: divError } = await supabase
          .from('divisions')
          .insert(data)
          .select()
          .single();
        if (divError) throw divError;
        result = division;
        break;

      case 'section':
        const { data: section, error: secError } = await supabase
          .from('sections')
          .insert(data)
          .select()
          .single();
        if (secError) throw secError;
        result = section;
        break;

      case 'assembly':
        const { data: assembly, error: asmError } = await supabase
          .from('assemblies')
          .insert(data)
          .select()
          .single();
        if (asmError) throw asmError;
        result = assembly;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid hierarchy type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Hierarchy create error:', error);
    return NextResponse.json(
      { error: 'Failed to create hierarchy item' },
      { status: 500 }
    );
  }
}