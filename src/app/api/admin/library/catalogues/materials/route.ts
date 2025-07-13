import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { MaterialCatalogueItem, CatalogueSearchFilters } from '@/library/types/library'

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
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,specifications.ilike.%${search}%`)
    }

    // Apply pagination and ordering
    query = query
      .order('category')
      .order('name')
      .range(offset, offset + limit - 1)

    const { data: materials, error: materialsError } = await query

    if (materialsError) {
      console.error('Error fetching material catalogue:', materialsError)
      return NextResponse.json(
        { error: 'Failed to fetch material catalogue' }, 
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('material_catalogue')
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
      countQuery = countQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,specifications.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting material catalogue count:', countError)
      // Continue without count if there's an error
    }

    // Transform the data to match our TypeScript interface
    const transformedMaterials: MaterialCatalogueItem[] = materials?.map(material => ({
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
    })) || []

    // Get categories and work categories for filter options
    const { data: categories, error: categoriesError } = await supabase
      .from('material_catalogue')
      .select('category, work_category')
      .eq('is_active', true)
      .neq('category', null)

    const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])]
    const uniqueWorkCategories = [...new Set(categories?.map(c => c.work_category).filter(Boolean) || [])]

    return NextResponse.json({
      data: transformedMaterials,
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
    console.error('Unexpected error in material catalogue API:', error)
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
      unit,
      specifications,
      gradeStandard,
      workCategory
    } = body

    // Validate required fields
    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: 'Name, category, and unit are required' },
        { status: 400 }
      )
    }

    // Check if code is unique (if provided)
    if (code) {
      const { data: existingMaterial } = await supabase
        .from('material_catalogue')
        .select('id')
        .eq('code', code)
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
      .insert({
        code: code || `MAT-${Date.now()}`, // Generate code if not provided
        name,
        category,
        unit,
        specifications: specifications || null,
        grade_standard: gradeStandard || null,
        work_category: workCategory || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating material:', error)
      return NextResponse.json(
        { error: 'Failed to create material' },
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
      message: 'Material created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error creating material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}