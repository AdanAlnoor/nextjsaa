import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { EquipmentCatalogueItem } from '@/types/library'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const workCategory = searchParams.get('workCategory') || searchParams.get('work_category')
    const isActive = searchParams.get('isActive')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
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

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    } else {
      query = query.eq('is_active', true) // Default to active only
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (workCategory) {
      query = query.eq('work_category', workCategory)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,specifications.ilike.%${search}%,capacity.ilike.%${search}%`)
    }

    // Apply pagination and ordering
    query = query
      .order('category')
      .order('name')
      .range(offset, offset + limit - 1)

    const { data: equipment, error: equipmentError } = await query

    if (equipmentError) {
      console.error('Error fetching equipment catalogue:', equipmentError)
      return NextResponse.json(
        { error: 'Failed to fetch equipment catalogue' }, 
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('equipment_catalogue')
      .select('*', { count: 'exact', head: true })

    if (isActive !== null) {
      countQuery = countQuery.eq('is_active', isActive === 'true')
    } else {
      countQuery = countQuery.eq('is_active', true)
    }

    if (category) {
      countQuery = countQuery.eq('category', category)
    }

    if (workCategory) {
      countQuery = countQuery.eq('work_category', workCategory)
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,specifications.ilike.%${search}%,capacity.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting equipment catalogue count:', countError)
      // Continue without count if there's an error
    }

    // Transform the data to match our TypeScript interface
    const transformedEquipment: EquipmentCatalogueItem[] = equipment?.map(equipmentItem => ({
      id: equipmentItem.id,
      code: equipmentItem.code,
      name: equipmentItem.name,
      category: equipmentItem.category,
      capacity: equipmentItem.capacity || undefined,
      specifications: equipmentItem.specifications || undefined,
      powerRequirements: equipmentItem.power_requirements || undefined,
      workCategory: equipmentItem.work_category || undefined,
      createdAt: equipmentItem.created_at,
      updatedAt: equipmentItem.updated_at,
      isActive: equipmentItem.is_active
    })) || []

    // Get categories and work categories for filter options
    const { data: categories, error: categoriesError } = await supabase
      .from('equipment_catalogue')
      .select('category, work_category')
      .eq('is_active', true)
      .neq('category', null)

    const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])]
    const uniqueWorkCategories = [...new Set(categories?.map(c => c.work_category).filter(Boolean) || [])]

    return NextResponse.json({
      data: transformedEquipment,
      pagination: {
        total: count || 0,
        offset,
        limit,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        categories: uniqueCategories,
        workCategories: uniqueWorkCategories
      }
    })

  } catch (error) {
    console.error('Unexpected error in equipment catalogue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
      workCategory
    } = body

    // Validate required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Check if code is unique (if provided)
    if (code) {
      const { data: existingEquipment } = await supabase
        .from('equipment_catalogue')
        .select('id')
        .eq('code', code)
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
      .insert({
        code: code || `EQP-${Date.now()}`, // Generate code if not provided
        name,
        category,
        capacity: capacity || null,
        specifications: specifications || null,
        power_requirements: powerRequirements || null,
        work_category: workCategory || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating equipment:', error)
      return NextResponse.json(
        { error: 'Failed to create equipment' },
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
      message: 'Equipment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error creating equipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}