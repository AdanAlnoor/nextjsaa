import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { Division } from '@/library/types/library'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, code } = await request.json()

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Division name is required' }, 
        { status: 400 }
      )
    }

    // Import code generator
    const { LibraryCodeGenerator } = await import('@/lib/services/libraryCodeGenerator')
    const codeGenerator = new LibraryCodeGenerator()

    // Generate code if not provided
    let divisionCode = code
    if (!divisionCode) {
      divisionCode = await codeGenerator.generateDivisionCode()
    } else {
      // Validate provided code
      if (!codeGenerator.validateDivisionCode(divisionCode)) {
        return NextResponse.json(
          { error: 'Invalid division code format. Must be XX (e.g., 02)' }, 
          { status: 400 }
        )
      }

      // Check if code already exists
      const exists = await codeGenerator.codeExists(divisionCode, 1)
      if (exists) {
        return NextResponse.json(
          { error: `Division code ${divisionCode} already exists` }, 
          { status: 409 }
        )
      }
    }

    // Generate sort order
    const sortOrder = codeGenerator.generateSortOrder(divisionCode)

    // Create division
    const { data: newDivision, error: createError } = await supabase
      .from('divisions')
      .insert({
        code: divisionCode,
        name: name.trim(),
        description: description?.trim() || null,
        sort_order: sortOrder,
        total_items: 0,
        completed_items: 0,
        confirmed_items: 0,
        actual_library_items: 0,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating division:', createError)
      return NextResponse.json(
        { error: 'Failed to create division' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newDivision.id,
        code: newDivision.code,
        name: newDivision.name,
        description: newDivision.description,
        sortOrder: newDivision.sort_order
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in create division API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch divisions with nested hierarchy
    const { data: divisions, error: divisionsError } = await supabase
      .from('divisions')
      .select(`
        id,
        code,
        name,
        description,
        sort_order,
        total_items,
        completed_items,
        confirmed_items,
        actual_library_items,
        is_active,
        sections:sections(
          id,
          code,
          name,
          description,
          sort_order,
          total_items,
          completed_items,
          confirmed_items,
          actual_library_items,
          is_active,
          assemblies:assemblies(
            id,
            code,
            name,
            description,
            sort_order,
            total_items,
            completed_items,
            confirmed_items,
            actual_library_items,
            is_active,
            items:library_items(
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
            )
          )
        )
      `)
      .eq('is_active', true)
      .order('sort_order')

    if (divisionsError) {
      console.error('Error fetching divisions:', divisionsError)
      return NextResponse.json(
        { error: 'Failed to fetch divisions' }, 
        { status: 500 }
      )
    }

    // Transform the data to match our TypeScript interfaces
    const transformedDivisions: Division[] = divisions?.map(division => ({
      id: division.id,
      code: division.code,
      name: division.name,
      description: division.description || undefined,
      sortOrder: division.sort_order,
      totalItems: division.total_items,
      completedItems: division.completed_items,
      confirmedItems: division.confirmed_items,
      actualLibraryItems: division.actual_library_items,
      sections: division.sections
        ?.filter(section => section.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(section => ({
          id: section.id,
          code: section.code,
          name: section.name,
          description: section.description || undefined,
          sortOrder: section.sort_order,
          totalItems: section.total_items,
          completedItems: section.completed_items,
          confirmedItems: section.confirmed_items,
          actualLibraryItems: section.actual_library_items,
          assemblies: section.assemblies
            ?.filter(assembly => assembly.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(assembly => ({
              id: assembly.id,
              code: assembly.code,
              name: assembly.name,
              description: assembly.description || undefined,
              sortOrder: assembly.sort_order,
              totalItems: assembly.total_items,
              completedItems: assembly.completed_items,
              confirmedItems: assembly.confirmed_items,
              actualLibraryItems: assembly.actual_library_items,
              items: assembly.items
                ?.filter(item => item.is_active)
                .map(item => ({
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
                })) || []
            })) || []
        })) || []
    })) || []

    return NextResponse.json(transformedDivisions)

  } catch (error) {
    console.error('Unexpected error in divisions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const divisionId = searchParams.get('id')
    const force = searchParams.get('force') === 'true'

    if (!divisionId) {
      return NextResponse.json(
        { error: 'Division ID is required' }, 
        { status: 400 }
      )
    }

    // Check if division exists and get its details
    const { data: division, error: divisionError } = await supabase
      .from('divisions')
      .select(`
        id, code, name, is_active,
        sections:sections(
          id, code, name,
          assemblies:assemblies(
            id, code, name,
            items:library_items(
              id, code, name, status
            )
          )
        )
      `)
      .eq('id', divisionId)
      .eq('is_active', true)
      .single()

    if (divisionError || !division) {
      return NextResponse.json(
        { error: 'Division not found' }, 
        { status: 404 }
      )
    }

    // Calculate impact
    let totalSections = 0
    let totalAssemblies = 0
    let totalItems = 0
    let confirmedItems = 0
    let actualItems = 0

    division.sections.forEach(section => {
      if (section.assemblies) {
        totalSections++
        totalAssemblies += section.assemblies.length
        
        section.assemblies.forEach(assembly => {
          if (assembly.items) {
            totalItems += assembly.items.length
            assembly.items.forEach(item => {
              if (item.status === 'confirmed') confirmedItems++
              if (item.status === 'actual') actualItems++
            })
          }
        })
      }
    })

    // Safety checks - prevent deletion if there are confirmed or actual items
    if ((confirmedItems > 0 || actualItems > 0) && !force) {
      return NextResponse.json({
        error: 'Cannot delete division with confirmed or actual library items',
        canForceDelete: false,
        impact: {
          division: { code: division.code, name: division.name },
          sections: totalSections,
          assemblies: totalAssemblies,
          items: totalItems,
          confirmedItems,
          actualItems
        }
      }, { status: 400 })
    }

    // Return impact for confirmation if not forcing
    if (totalItems > 0 && !force) {
      return NextResponse.json({
        error: 'Division contains child items',
        canForceDelete: true,
        impact: {
          division: { code: division.code, name: division.name },
          sections: totalSections,
          assemblies: totalAssemblies,
          items: totalItems,
          confirmedItems,
          actualItems
        },
        message: `This will delete ${totalSections} sections, ${totalAssemblies} assemblies, and ${totalItems} library items.`
      }, { status: 409 })
    }

    // Perform cascade soft delete
    const { error: deleteError } = await supabase
      .from('divisions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', divisionId)

    if (deleteError) {
      console.error('Error deleting division:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete division' }, 
        { status: 500 }
      )
    }

    // Also soft delete all children (cascade)
    if (totalItems > 0) {
      // Delete all sections in this division
      await supabase
        .from('sections')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('division_id', divisionId)

      // Delete all assemblies in these sections
      const sectionIds = division.sections.map(s => s.id)
      if (sectionIds.length > 0) {
        await supabase
          .from('assemblies')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('section_id', sectionIds)

        // Delete all items in these assemblies
        const assemblyIds = division.sections.flatMap(s => s.assemblies?.map(a => a.id) || [])
        if (assemblyIds.length > 0) {
          await supabase
            .from('library_items')
            .update({ is_active: false, last_modified: new Date().toISOString() })
            .in('assembly_id', assemblyIds)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Division deleted successfully',
      impact: {
        division: { code: division.code, name: division.name },
        sections: totalSections,
        assemblies: totalAssemblies,
        items: totalItems,
        confirmedItems,
        actualItems
      }
    })

  } catch (error) {
    console.error('Unexpected error in delete division API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}