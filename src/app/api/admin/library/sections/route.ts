import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, code, divisionId, divisionCode } = await request.json()

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Section name is required' }, 
        { status: 400 }
      )
    }

    if (!divisionId && !divisionCode) {
      return NextResponse.json(
        { error: 'Division ID or division code is required' }, 
        { status: 400 }
      )
    }

    // Import code generator
    const { LibraryCodeGenerator } = await import('@/shared/lib/services/libraryCodeGenerator')
    const codeGenerator = new LibraryCodeGenerator()

    // Find division if only code provided
    let targetDivisionId = divisionId
    let targetDivisionCode = divisionCode

    if (!targetDivisionId && targetDivisionCode) {
      const { data: division, error: divisionError } = await supabase
        .from('divisions')
        .select('id, code')
        .eq('code', targetDivisionCode)
        .eq('is_active', true)
        .single()

      if (divisionError || !division) {
        return NextResponse.json(
          { error: `Division with code ${targetDivisionCode} not found` }, 
          { status: 404 }
        )
      }

      targetDivisionId = division.id
      targetDivisionCode = division.code
    } else if (targetDivisionId) {
      // Get division code for code generation
      const { data: division, error: divisionError } = await supabase
        .from('divisions')
        .select('code')
        .eq('id', targetDivisionId)
        .eq('is_active', true)
        .single()

      if (divisionError || !division) {
        return NextResponse.json(
          { error: 'Division not found' }, 
          { status: 404 }
        )
      }

      targetDivisionCode = division.code
    }

    // Generate code if not provided
    let sectionCode = code
    if (!sectionCode) {
      sectionCode = codeGenerator.generateSectionCode(targetDivisionCode!, name, {}).code
    } else {
      // Validate provided code
      if (!codeGenerator.validateSectionCode(sectionCode)) {
        return NextResponse.json(
          { error: 'Invalid section code format. Must be XX.XX (e.g., 02.10)' }, 
          { status: 400 }
        )
      }

      // Validate hierarchy
      if (!codeGenerator.validateHierarchy(sectionCode, targetDivisionCode!)) {
        return NextResponse.json(
          { error: `Section code ${sectionCode} does not belong to division ${targetDivisionCode}` }, 
          { status: 400 }
        )
      }

      // Check if code already exists
      const exists = await codeGenerator.codeExists(sectionCode, 'sections', supabase)
      if (exists) {
        return NextResponse.json(
          { error: `Section code ${sectionCode} already exists` }, 
          { status: 409 }
        )
      }
    }

    // Generate sort order
    const sortOrder = codeGenerator.generateSortOrder(sectionCode)

    // Create section
    const { data: newSection, error: createError } = await supabase
      .from('sections')
      .insert({
        division_id: targetDivisionId,
        code: sectionCode,
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
      console.error('Error creating section:', createError)
      return NextResponse.json(
        { error: 'Failed to create section' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newSection.id,
        divisionId: newSection.division_id,
        code: newSection.code,
        name: newSection.name,
        description: newSection.description,
        sortOrder: newSection.sort_order
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in create section API:', error)
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
    const sectionId = searchParams.get('id')
    const force = searchParams.get('force') === 'true'

    if (!sectionId) {
      return NextResponse.json(
        { error: 'Section ID is required' }, 
        { status: 400 }
      )
    }

    // Check if section exists and get its details
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select(`
        id, code, name, division_id, is_active,
        assemblies:assemblies(
          id, code, name,
          items:library_items(
            id, code, name, status
          )
        )
      `)
      .eq('id', sectionId)
      .eq('is_active', true)
      .single()

    if (sectionError || !section) {
      return NextResponse.json(
        { error: 'Section not found' }, 
        { status: 404 }
      )
    }

    // Calculate impact
    let totalAssemblies = 0
    let totalItems = 0
    let confirmedItems = 0
    let actualItems = 0

    section.assemblies.forEach(assembly => {
      totalAssemblies++
      if (assembly.items) {
        totalItems += assembly.items.length
        assembly.items.forEach(item => {
          if (item.status === 'confirmed') confirmedItems++
          if (item.status === 'actual') actualItems++
        })
      }
    })

    // Safety checks - prevent deletion if there are confirmed or actual items
    if ((confirmedItems > 0 || actualItems > 0) && !force) {
      return NextResponse.json({
        error: 'Cannot delete section with confirmed or actual library items',
        canForceDelete: false,
        impact: {
          section: { code: section.code, name: section.name },
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
        error: 'Section contains child items',
        canForceDelete: true,
        impact: {
          section: { code: section.code, name: section.name },
          assemblies: totalAssemblies,
          items: totalItems,
          confirmedItems,
          actualItems
        },
        message: `This will delete ${totalAssemblies} assemblies and ${totalItems} library items.`
      }, { status: 409 })
    }

    // Perform cascade soft delete
    const { error: deleteError } = await supabase
      .from('sections')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)

    if (deleteError) {
      console.error('Error deleting section:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete section' }, 
        { status: 500 }
      )
    }

    // Also soft delete all children (cascade)
    if (totalItems > 0) {
      // Delete all assemblies in this section
      await supabase
        .from('assemblies')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('section_id', sectionId)

      // Delete all items in these assemblies
      const assemblyIds = section.assemblies.map(a => a.id)
      if (assemblyIds.length > 0) {
        await supabase
          .from('library_items')
          .update({ is_active: false, last_modified: new Date().toISOString() })
          .in('assembly_id', assemblyIds)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
      impact: {
        section: { code: section.code, name: section.name },
        assemblies: totalAssemblies,
        items: totalItems,
        confirmedItems,
        actualItems
      }
    })

  } catch (error) {
    console.error('Unexpected error in delete section API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}