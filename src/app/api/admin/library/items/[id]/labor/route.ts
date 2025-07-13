import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateLaborFactorRequest } from '@/library/types/library'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = params.id
    const { laborCatalogueId, hoursPerUnit }: CreateLaborFactorRequest = await request.json()

    // Validate input
    if (!laborCatalogueId || hoursPerUnit <= 0) {
      return NextResponse.json(
        { error: 'Labor catalogue ID and positive hours per unit are required' },
        { status: 400 }
      )
    }

    // Verify library item exists and is active
    const { data: libraryItem, error: itemError } = await supabase
      .from('library_items')
      .select('id, code, name')
      .eq('id', itemId)
      .eq('is_active', true)
      .single()

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
      }
      console.error('Error verifying library item:', itemError)
      return NextResponse.json(
        { error: 'Failed to verify library item' }, 
        { status: 500 }
      )
    }

    // Get labor catalogue item details
    const { data: laborCatalogue, error: catalogueError } = await supabase
      .from('labor_catalogue')
      .select('id, code, name, category, skill_level, trade_type, qualifications')
      .eq('id', laborCatalogueId)
      .eq('is_active', true)
      .single()

    if (catalogueError) {
      if (catalogueError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Labor catalogue item not found' }, { status: 404 })
      }
      console.error('Error fetching labor catalogue:', catalogueError)
      return NextResponse.json(
        { error: 'Failed to fetch labor catalogue item' }, 
        { status: 500 }
      )
    }

    // Check if this labor is already added to the item
    const { data: existingFactor, error: existingError } = await supabase
      .from('labor_factors')
      .select('id')
      .eq('library_item_id', itemId)
      .eq('labor_catalogue_id', laborCatalogueId)
      .single()

    if (existingFactor) {
      return NextResponse.json(
        { error: 'This labor is already added to the item' },
        { status: 409 }
      )
    }

    // Create labor factor
    const { data: newFactor, error: createError } = await supabase
      .from('labor_factors')
      .insert({
        library_item_id: itemId,
        labor_catalogue_id: laborCatalogueId,
        labor_code: laborCatalogue.code,
        labor_name: laborCatalogue.name,
        trade: laborCatalogue.trade_type,
        skill_level: laborCatalogue.skill_level,
        hours_per_unit: hoursPerUnit,
        qualifications: laborCatalogue.qualifications
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating labor factor:', createError)
      return NextResponse.json(
        { error: 'Failed to add labor factor' }, 
        { status: 500 }
      )
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: itemId,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ 
        action: 'add_labor_factor',
        labor_code: laborCatalogue.code,
        labor_name: laborCatalogue.name
      })
    })

    // Transform response to match TypeScript interface
    const transformedFactor = {
      id: newFactor.id,
      laborCatalogueId: newFactor.labor_catalogue_id,
      laborCode: newFactor.labor_code,
      laborName: newFactor.labor_name,
      trade: newFactor.trade,
      skillLevel: newFactor.skill_level,
      hoursPerUnit: newFactor.hours_per_unit,
      qualifications: newFactor.qualifications || undefined,
      createdAt: newFactor.created_at,
      updatedAt: newFactor.updated_at
    }

    return NextResponse.json(transformedFactor, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in labor factor creation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}