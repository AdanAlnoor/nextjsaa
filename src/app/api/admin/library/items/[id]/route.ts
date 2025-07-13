import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { LibraryItem, UpdateLibraryItemRequest } from '@/library/types/library'

export async function GET(
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

    // Fetch specific library item with all factors
    const { data: item, error: itemError } = await supabase
      .from('library_items')
      .select(`
        id,
        code,
        name,
        description,
        unit,
        specifications,
        wastage_percentage,
        productivity_notes,
        status,
        has_materials,
        has_labor,
        has_equipment,
        is_complete,
        missing_factors,
        last_validated,
        validated_by,
        created_at,
        last_modified,
        confirmed_at,
        confirmed_by,
        actual_library_date,
        is_active,
        materials:material_factors(
          id,
          material_catalogue_id,
          material_code,
          material_name,
          unit,
          quantity_per_unit,
          wastage_percentage,
          specifications,
          grade_standard,
          created_at,
          updated_at
        ),
        labor:labor_factors(
          id,
          labor_catalogue_id,
          labor_code,
          labor_name,
          trade,
          skill_level,
          hours_per_unit,
          qualifications,
          created_at,
          updated_at
        ),
        equipment:equipment_factors(
          id,
          equipment_catalogue_id,
          equipment_code,
          equipment_name,
          category,
          capacity,
          hours_per_unit,
          specifications,
          power_requirements,
          created_at,
          updated_at
        )
      `)
      .eq('id', itemId)
      .eq('is_active', true)
      .single()

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
      }
      console.error('Error fetching library item:', itemError)
      return NextResponse.json(
        { error: 'Failed to fetch library item' }, 
        { status: 500 }
      )
    }

    // Transform the data to match our TypeScript interface
    const transformedItem: LibraryItem = {
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      unit: item.unit,
      specifications: item.specifications || undefined,
      wastagePercentage: item.wastage_percentage,
      productivityNotes: item.productivity_notes || undefined,
      status: item.status,
      validation: {
        hasMaterials: item.has_materials,
        hasLabor: item.has_labor,
        hasEquipment: item.has_equipment,
        isComplete: item.is_complete,
        missingFactors: item.missing_factors || [],
        lastValidated: item.last_validated,
        validatedBy: item.validated_by || undefined
      },
      materials: item.materials?.map(material => ({
        id: material.id,
        materialCatalogueId: material.material_catalogue_id,
        materialCode: material.material_code,
        materialName: material.material_name,
        unit: material.unit,
        quantityPerUnit: material.quantity_per_unit,
        wastagePercentage: material.wastage_percentage,
        specifications: material.specifications || undefined,
        gradeStandard: material.grade_standard || undefined,
        createdAt: material.created_at,
        updatedAt: material.updated_at
      })) || [],
      labor: item.labor?.map(labor => ({
        id: labor.id,
        laborCatalogueId: labor.labor_catalogue_id,
        laborCode: labor.labor_code,
        laborName: labor.labor_name,
        trade: labor.trade,
        skillLevel: labor.skill_level,
        hoursPerUnit: labor.hours_per_unit,
        qualifications: labor.qualifications || undefined,
        createdAt: labor.created_at,
        updatedAt: labor.updated_at
      })) || [],
      equipment: item.equipment?.map(equipment => ({
        id: equipment.id,
        equipmentCatalogueId: equipment.equipment_catalogue_id,
        equipmentCode: equipment.equipment_code,
        equipmentName: equipment.equipment_name,
        category: equipment.category,
        capacity: equipment.capacity || undefined,
        hoursPerUnit: equipment.hours_per_unit,
        specifications: equipment.specifications || undefined,
        powerRequirements: equipment.power_requirements || undefined,
        createdAt: equipment.created_at,
        updatedAt: equipment.updated_at
      })) || [],
      createdAt: item.created_at,
      lastModified: item.last_modified,
      confirmedAt: item.confirmed_at || undefined,
      confirmedBy: item.confirmed_by || undefined,
      actualLibraryDate: item.actual_library_date || undefined,
      isActive: item.is_active
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: itemId,
      p_user_id: user.id,
      p_usage_type: 'view'
    })

    return NextResponse.json(transformedItem)

  } catch (error) {
    console.error('Unexpected error in library item API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const updates: UpdateLibraryItemRequest = await request.json()

    // Validate input
    if (updates.wastagePercentage !== undefined && (updates.wastagePercentage < 0 || updates.wastagePercentage > 100)) {
      return NextResponse.json(
        { error: 'Wastage percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Update library item
    const { data: updatedItem, error: updateError } = await supabase
      .from('library_items')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
        ...(updates.unit && { unit: updates.unit }),
        ...(updates.specifications !== undefined && { specifications: updates.specifications }),
        ...(updates.wastagePercentage !== undefined && { wastage_percentage: updates.wastagePercentage }),
        ...(updates.productivityNotes !== undefined && { productivity_notes: updates.productivityNotes }),
        last_modified: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('is_active', true)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
      }
      console.error('Error updating library item:', updateError)
      return NextResponse.json(
        { error: 'Failed to update library item' }, 
        { status: 500 }
      )
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: itemId,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ updates })
    })

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Unexpected error in library item update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if item exists and is active
    const { data: existingItem, error: checkError } = await supabase
      .from('library_items')
      .select('id, code, name, status')
      .eq('id', itemId)
      .eq('is_active', true)
      .single()

    if (checkError || !existingItem) {
      return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
    }

    // Check if item can be deleted (e.g., not confirmed or in use)
    if (existingItem.status === 'confirmed' || existingItem.status === 'actual') {
      return NextResponse.json(
        { error: 'Cannot delete confirmed or actual library items' }, 
        { status: 400 }
      )
    }

    // Soft delete the library item (set is_active = false)
    const { error: deleteError } = await supabase
      .from('library_items')
      .update({
        is_active: false,
        last_modified: new Date().toISOString()
      })
      .eq('id', itemId)

    if (deleteError) {
      console.error('Error deleting library item:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete library item' }, 
        { status: 500 }
      )
    }

    // Track deletion usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: itemId,
      p_user_id: user.id,
      p_usage_type: 'delete',
      p_metadata: JSON.stringify({ 
        deleted_item: {
          code: existingItem.code,
          name: existingItem.name,
          status: existingItem.status
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Library item deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error in library item deletion API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}