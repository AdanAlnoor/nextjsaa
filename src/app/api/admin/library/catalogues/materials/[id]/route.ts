import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { MaterialCatalogueItem } from '@/library/types/library'

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

    const { data: material, error } = await supabase
      .from('material_catalogue')
      .select(`
        id,
        code,
        name,
        category,
        unit,
        specifications,
        grade_standard,
        work_category,
        created_at,
        updated_at,
        is_active
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching material:', error)
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    // Transform to match TypeScript interface
    const transformedMaterial: MaterialCatalogueItem = {
      id: material.id,
      code: material.code,
      name: material.name,
      category: material.category,
      unit: material.unit,
      specifications: material.specifications || undefined,
      gradeStandard: material.grade_standard || undefined,
      workCategory: material.work_category || undefined,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
      isActive: material.is_active
    }

    return NextResponse.json({ data: transformedMaterial })

  } catch (error) {
    console.error('Unexpected error in material API:', error)
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
      unit,
      specifications,
      gradeStandard,
      workCategory,
      isActive
    } = body

    // Validate required fields
    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: 'Name, category, and unit are required' },
        { status: 400 }
      )
    }

    // Check if code is unique (if provided and different from current)
    if (code) {
      const { data: existingMaterial } = await supabase
        .from('material_catalogue')
        .select('id')
        .eq('code', code)
        .neq('id', params.id)
        .single()

      if (existingMaterial) {
        return NextResponse.json(
          { error: 'Material code already exists' },
          { status: 409 }
        )
      }
    }

    const { data: material, error } = await supabase
      .from('material_catalogue')
      .update({
        ...(code && { code }),
        name,
        category,
        unit,
        specifications: specifications || null,
        grade_standard: gradeStandard || null,
        work_category: workCategory || null,
        ...(isActive !== undefined && { is_active: isActive }),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating material:', error)
      return NextResponse.json(
        { error: 'Failed to update material' },
        { status: 500 }
      )
    }

    // Transform response
    const transformedMaterial: MaterialCatalogueItem = {
      id: material.id,
      code: material.code,
      name: material.name,
      category: material.category,
      unit: material.unit,
      specifications: material.specifications || undefined,
      gradeStandard: material.grade_standard || undefined,
      workCategory: material.work_category || undefined,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
      isActive: material.is_active
    }

    return NextResponse.json({ 
      data: transformedMaterial,
      message: 'Material updated successfully' 
    })

  } catch (error) {
    console.error('Unexpected error updating material:', error)
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

    // Check if material is being used in any factors
    const { data: factors, error: factorsError } = await supabase
      .from('material_factors')
      .select('id')
      .eq('material_catalogue_id', params.id)
      .limit(1)

    if (factorsError) {
      console.error('Error checking material usage:', factorsError)
      return NextResponse.json(
        { error: 'Failed to check material usage' },
        { status: 500 }
      )
    }

    if (factors && factors.length > 0) {
      // Soft delete - mark as inactive instead of hard delete
      const { error: updateError } = await supabase
        .from('material_catalogue')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Error deactivating material:', updateError)
        return NextResponse.json(
          { error: 'Failed to deactivate material' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Material deactivated (in use by library items)',
        soft_delete: true
      })
    }

    // Hard delete if not in use
    const { error } = await supabase
      .from('material_catalogue')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting material:', error)
      return NextResponse.json(
        { error: 'Failed to delete material' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Material deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error deleting material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}