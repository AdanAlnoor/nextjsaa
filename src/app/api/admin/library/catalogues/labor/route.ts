import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { LaborCatalogueItem } from '@/library/types/library'

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
    const skillLevel = searchParams.get('skillLevel')
    const tradeType = searchParams.get('tradeType')
    const isActive = searchParams.get('isActive')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
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

    if (skillLevel) {
      query = query.eq('skill_level', skillLevel)
    }

    if (tradeType) {
      query = query.eq('trade_type', tradeType)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,trade_type.ilike.%${search}%,qualifications.ilike.%${search}%`)
    }

    // Apply pagination and ordering
    query = query
      .order('category')
      .order('skill_level')
      .order('name')
      .range(offset, offset + limit - 1)

    const { data: labor, error: laborError } = await query

    if (laborError) {
      console.error('Error fetching labor catalogue:', laborError)
      return NextResponse.json(
        { error: 'Failed to fetch labor catalogue' }, 
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('labor_catalogue')
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

    if (skillLevel) {
      countQuery = countQuery.eq('skill_level', skillLevel)
    }

    if (tradeType) {
      countQuery = countQuery.eq('trade_type', tradeType)
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,trade_type.ilike.%${search}%,qualifications.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting labor catalogue count:', countError)
      // Continue without count if there's an error
    }

    // Transform the data to match our TypeScript interface
    const transformedLabor: LaborCatalogueItem[] = labor?.map(laborItem => ({
      id: laborItem.id,
      code: laborItem.code,
      name: laborItem.name,
      category: laborItem.category,
      skillLevel: laborItem.skill_level,
      tradeType: laborItem.trade_type,
      qualifications: laborItem.qualifications || undefined,
      workCategory: laborItem.work_category || undefined,
      createdAt: laborItem.created_at,
      updatedAt: laborItem.updated_at,
      isActive: laborItem.is_active
    })) || []

    // Get filter options
    const [categoriesResult, skillLevelsResult, tradeTypesResult, workCategoriesResult] = await Promise.all([
      supabase
        .from('labor_catalogue')
        .select('category')
        .eq('is_active', true)
        .neq('category', null),
      supabase
        .from('labor_catalogue')
        .select('skill_level')
        .eq('is_active', true)
        .neq('skill_level', null),
      supabase
        .from('labor_catalogue')
        .select('trade_type')
        .eq('is_active', true)
        .neq('trade_type', null),
      supabase
        .from('labor_catalogue')
        .select('work_category')
        .eq('is_active', true)
        .neq('work_category', null)
    ])

    const uniqueCategories = [...new Set(categoriesResult.data?.map(c => c.category) || [])]
    const uniqueSkillLevels = [...new Set(skillLevelsResult.data?.map(s => s.skill_level) || [])]
    const uniqueTradeTypes = [...new Set(tradeTypesResult.data?.map(t => t.trade_type) || [])]
    const uniqueWorkCategories = [...new Set(workCategoriesResult.data?.map(w => w.work_category) || [])]

    return NextResponse.json({
      data: transformedLabor,
      pagination: {
        total: count || 0,
        offset,
        limit,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        categories: uniqueCategories,
        skillLevels: uniqueSkillLevels,
        tradeTypes: uniqueTradeTypes,
        workCategories: uniqueWorkCategories
      }
    })

  } catch (error) {
    console.error('Unexpected error in labor catalogue API:', error)
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
      skillLevel,
      tradeType,
      qualifications,
      workCategory
    } = body

    // Validate required fields
    if (!name || !category || !skillLevel || !tradeType) {
      return NextResponse.json(
        { error: 'Name, category, skill level, and trade type are required' },
        { status: 400 }
      )
    }

    // Check if code is unique (if provided)
    if (code) {
      const { data: existingLabor } = await supabase
        .from('labor_catalogue')
        .select('id')
        .eq('code', code)
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
      .insert({
        code: code || `LAB-${Date.now()}`, // Generate code if not provided
        name,
        category,
        skill_level: skillLevel,
        trade_type: tradeType,
        qualifications: qualifications || null,
        work_category: workCategory || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating labor:', error)
      return NextResponse.json(
        { error: 'Failed to create labor' },
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
      message: 'Labor created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error creating labor:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}