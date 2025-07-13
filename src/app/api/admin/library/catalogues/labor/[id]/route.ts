import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { LaborCatalogueItem } from '@/library/types/library'

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

    const { data: labor, error } = await supabase
      .from('labor_catalogue')
      .select(`
        id,
        code,
        name,
        category,
        skill_level,
        trade_type,
        qualifications,
        work_category,
        created_at,
        updated_at,
        is_active
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching labor:', error)
      return NextResponse.json(
        { error: 'Labor not found' },
        { status: 404 }
      )
    }

    // Transform to match TypeScript interface
    const transformedLabor: LaborCatalogueItem = {
      id: labor.id,
      code: labor.code,
      name: labor.name,
      category: labor.category,
      skillLevel: labor.skill_level,
      tradeType: labor.trade_type,
      qualifications: labor.qualifications || undefined,
      workCategory: labor.work_category || undefined,
      createdAt: labor.created_at,
      updatedAt: labor.updated_at,
      isActive: labor.is_active
    }

    return NextResponse.json({ data: transformedLabor })

  } catch (error) {
    console.error('Unexpected error in labor API:', error)
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
      skillLevel,
      tradeType,
      qualifications,
      workCategory,
      isActive
    } = body

    // Validate required fields
    if (!name || !category || !skillLevel || !tradeType) {
      return NextResponse.json(
        { error: 'Name, category, skill level, and trade type are required' },
        { status: 400 }
      )
    }

    // Check if code is unique (if provided and different from current)
    if (code) {
      const { data: existingLabor } = await supabase
        .from('labor_catalogue')
        .select('id')
        .eq('code', code)
        .neq('id', params.id)
        .single()

      if (existingLabor) {
        return NextResponse.json(
          { error: 'Labor code already exists' },
          { status: 409 }
        )
      }
    }

    const { data: labor, error } = await supabase
      .from('labor_catalogue')
      .update({
        ...(code && { code }),
        name,
        category,
        skill_level: skillLevel,
        trade_type: tradeType,
        qualifications: qualifications || null,
        work_category: workCategory || null,
        ...(isActive !== undefined && { is_active: isActive }),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating labor:', error)
      return NextResponse.json(
        { error: 'Failed to update labor' },
        { status: 500 }
      )
    }

    // Transform response
    const transformedLabor: LaborCatalogueItem = {
      id: labor.id,
      code: labor.code,
      name: labor.name,
      category: labor.category,
      skillLevel: labor.skill_level,
      tradeType: labor.trade_type,
      qualifications: labor.qualifications || undefined,
      workCategory: labor.work_category || undefined,
      createdAt: labor.created_at,
      updatedAt: labor.updated_at,
      isActive: labor.is_active
    }

    return NextResponse.json({ 
      data: transformedLabor,
      message: 'Labor updated successfully' 
    })

  } catch (error) {
    console.error('Unexpected error updating labor:', error)
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

    // Check if labor is being used in any factors
    const { data: factors, error: factorsError } = await supabase
      .from('labor_factors')
      .select('id')
      .eq('labor_catalogue_id', params.id)
      .limit(1)

    if (factorsError) {
      console.error('Error checking labor usage:', factorsError)
      return NextResponse.json(
        { error: 'Failed to check labor usage' },
        { status: 500 }
      )
    }

    if (factors && factors.length > 0) {
      // Soft delete - mark as inactive instead of hard delete
      const { error: updateError } = await supabase
        .from('labor_catalogue')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Error deactivating labor:', updateError)
        return NextResponse.json(
          { error: 'Failed to deactivate labor' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Labor deactivated (in use by library items)',
        soft_delete: true
      })
    }

    // Hard delete if not in use
    const { error } = await supabase
      .from('labor_catalogue')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting labor:', error)
      return NextResponse.json(
        { error: 'Failed to delete labor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Labor deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error deleting labor:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}