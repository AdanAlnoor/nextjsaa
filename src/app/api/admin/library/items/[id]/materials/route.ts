import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateMaterialFactorRequest } from '@/library/types/library'

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
    const { materialCatalogueId, quantityPerUnit, wastagePercentage }: CreateMaterialFactorRequest = await request.json()

    // Validate input
    if (!materialCatalogueId || quantityPerUnit <= 0) {
      return NextResponse.json(
        { error: 'Material catalogue ID and positive quantity per unit are required' },
        { status: 400 }
      )
    }

    if (wastagePercentage < 0 || wastagePercentage > 100) {
      return NextResponse.json(
        { error: 'Wastage percentage must be between 0 and 100' },
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

    // Get material catalogue item details
    const { data: materialCatalogue, error: catalogueError } = await supabase
      .from('material_catalogue')
      .select('id, code, name, unit, specifications, grade_standard')
      .eq('id', materialCatalogueId)
      .eq('is_active', true)
      .single()

    if (catalogueError) {
      if (catalogueError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Material catalogue item not found' }, { status: 404 })
      }
      console.error('Error fetching material catalogue:', catalogueError)
      return NextResponse.json(
        { error: 'Failed to fetch material catalogue item' }, 
        { status: 500 }
      )
    }

    // Check if this material is already added to the item
    const { data: existingFactor, error: existingError } = await supabase
      .from('material_factors')
      .select('id')
      .eq('library_item_id', itemId)
      .eq('material_catalogue_id', materialCatalogueId)
      .single()

    if (existingFactor) {
      return NextResponse.json(
        { error: 'This material is already added to the item' },
        { status: 409 }
      )
    }

    // Create material factor
    const { data: newFactor, error: createError } = await supabase
      .from('material_factors')
      .insert({
        library_item_id: itemId,
        material_catalogue_id: materialCatalogueId,
        material_code: materialCatalogue.code,
        material_name: materialCatalogue.name,
        unit: materialCatalogue.unit,
        quantity_per_unit: quantityPerUnit,
        wastage_percentage: wastagePercentage,
        specifications: materialCatalogue.specifications,
        grade_standard: materialCatalogue.grade_standard
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating material factor:', createError)
      return NextResponse.json(
        { error: 'Failed to add material factor' }, 
        { status: 500 }
      )
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: itemId,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ 
        action: 'add_material_factor',
        material_code: materialCatalogue.code,
        material_name: materialCatalogue.name
      })
    })

    // Transform response to match TypeScript interface
    const transformedFactor = {
      id: newFactor.id,
      materialCatalogueId: newFactor.material_catalogue_id,
      materialCode: newFactor.material_code,
      materialName: newFactor.material_name,
      unit: newFactor.unit,
      quantityPerUnit: newFactor.quantity_per_unit,
      wastagePercentage: newFactor.wastage_percentage,
      specifications: newFactor.specifications || undefined,
      gradeStandard: newFactor.grade_standard || undefined,
      createdAt: newFactor.created_at,
      updatedAt: newFactor.updated_at
    }

    return NextResponse.json(transformedFactor, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in material factor creation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}