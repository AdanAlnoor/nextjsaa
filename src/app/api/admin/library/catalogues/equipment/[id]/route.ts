import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { EquipmentCatalogueItem } from '@/library/types/library'

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

    const { data: equipment, error } = await supabase
      .from('equipment_catalogue')
      .select(`
        id,
        code,
        name,
        category,
        capacity,
        specifications,
        power_requirements,
        work_category,
        created_at,
        updated_at,
        is_active
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }

    // Transform to match TypeScript interface
    const transformedEquipment: EquipmentCatalogueItem = {
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      category: equipment.category,
      capacity: equipment.capacity || undefined,
      specifications: equipment.specifications || undefined,
      powerRequirements: equipment.power_requirements || undefined,
      workCategory: equipment.work_category || undefined,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at,
      isActive: equipment.is_active
    }

    return NextResponse.json({ data: transformedEquipment })

  } catch (error) {
    console.error('Unexpected error in equipment API:', error)
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

    const body = await request.json()
    const {
      code,
      name,
      category,
      capacity,
      specifications,
      powerRequirements,
      workCategory,
      isActive
    } = body

    // Validate required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Check if code is unique (if provided and different from current)
    if (code) {
      const { data: existingEquipment } = await supabase
        .from('equipment_catalogue')
        .select('id')
        .eq('code', code)
        .neq('id', params.id)
        .single()

      if (existingEquipment) {
        return NextResponse.json(
          { error: 'Equipment code already exists' },
          { status: 409 }
        )
      }
    }

    const { data: equipment, error } = await supabase
      .from('equipment_catalogue')
      .update({
        ...(code && { code }),
        name,
        category,
        capacity: capacity || null,
        specifications: specifications || null,
        power_requirements: powerRequirements || null,
        work_category: workCategory || null,
        ...(isActive !== undefined && { is_active: isActive }),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment:', error)
      return NextResponse.json(
        { error: 'Failed to update equipment' },
        { status: 500 }
      )
    }

    // Transform response
    const transformedEquipment: EquipmentCatalogueItem = {
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      category: equipment.category,
      capacity: equipment.capacity || undefined,
      specifications: equipment.specifications || undefined,
      powerRequirements: equipment.power_requirements || undefined,
      workCategory: equipment.work_category || undefined,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at,
      isActive: equipment.is_active
    }

    return NextResponse.json({ 
      data: transformedEquipment,
      message: 'Equipment updated successfully' 
    })

  } catch (error) {
    console.error('Unexpected error updating equipment:', error)
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

    // Check if equipment is being used in any factors
    const { data: factors, error: factorsError } = await supabase
      .from('equipment_factors')
      .select('id')
      .eq('equipment_catalogue_id', params.id)
      .limit(1)

    if (factorsError) {
      console.error('Error checking equipment usage:', factorsError)
      return NextResponse.json(
        { error: 'Failed to check equipment usage' },
        { status: 500 }
      )
    }

    if (factors && factors.length > 0) {
      // Soft delete - mark as inactive instead of hard delete
      const { error: updateError } = await supabase
        .from('equipment_catalogue')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Error deactivating equipment:', updateError)
        return NextResponse.json(
          { error: 'Failed to deactivate equipment' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Equipment deactivated (in use by library items)',
        soft_delete: true
      })
    }

    // Hard delete if not in use
    const { error } = await supabase
      .from('equipment_catalogue')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting equipment:', error)
      return NextResponse.json(
        { error: 'Failed to delete equipment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Equipment deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error deleting equipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}