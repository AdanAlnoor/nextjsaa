import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateEquipmentFactorRequest } from '@/library/types/library'

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
    const { equipmentCatalogueId, hoursPerUnit }: CreateEquipmentFactorRequest = await request.json()

    // Validate input
    if (!equipmentCatalogueId || hoursPerUnit <= 0) {
      return NextResponse.json(
        { error: 'Equipment catalogue ID and positive hours per unit are required' },
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

    // Get equipment catalogue item details
    const { data: equipmentCatalogue, error: catalogueError } = await supabase
      .from('equipment_catalogue')
      .select('id, code, name, category, capacity, specifications, power_requirements')
      .eq('id', equipmentCatalogueId)
      .eq('is_active', true)
      .single()

    if (catalogueError) {
      if (catalogueError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Equipment catalogue item not found' }, { status: 404 })
      }
      console.error('Error fetching equipment catalogue:', catalogueError)
      return NextResponse.json(
        { error: 'Failed to fetch equipment catalogue item' }, 
        { status: 500 }
      )
    }

    // Check if this equipment is already added to the item
    const { data: existingFactor, error: existingError } = await supabase
      .from('equipment_factors')
      .select('id')
      .eq('library_item_id', itemId)
      .eq('equipment_catalogue_id', equipmentCatalogueId)
      .single()

    if (existingFactor) {
      return NextResponse.json(
        { error: 'This equipment is already added to the item' },
        { status: 409 }
      )
    }

    // Create equipment factor
    const { data: newFactor, error: createError } = await supabase
      .from('equipment_factors')
      .insert({
        library_item_id: itemId,
        equipment_catalogue_id: equipmentCatalogueId,
        equipment_code: equipmentCatalogue.code,
        equipment_name: equipmentCatalogue.name,
        category: equipmentCatalogue.category,
        capacity: equipmentCatalogue.capacity,
        hours_per_unit: hoursPerUnit,
        specifications: equipmentCatalogue.specifications,
        power_requirements: equipmentCatalogue.power_requirements
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating equipment factor:', createError)
      return NextResponse.json(
        { error: 'Failed to add equipment factor' }, 
        { status: 500 }
      )
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: itemId,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ 
        action: 'add_equipment_factor',
        equipment_code: equipmentCatalogue.code,
        equipment_name: equipmentCatalogue.name
      })
    })

    // Transform response to match TypeScript interface
    const transformedFactor = {
      id: newFactor.id,
      equipmentCatalogueId: newFactor.equipment_catalogue_id,
      equipmentCode: newFactor.equipment_code,
      equipmentName: newFactor.equipment_name,
      category: newFactor.category,
      capacity: newFactor.capacity || undefined,
      hoursPerUnit: newFactor.hours_per_unit,
      specifications: newFactor.specifications || undefined,
      powerRequirements: newFactor.power_requirements || undefined,
      createdAt: newFactor.created_at,
      updatedAt: newFactor.updated_at
    }

    return NextResponse.json(transformedFactor, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in equipment factor creation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}