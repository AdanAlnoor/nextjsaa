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

    const { name, description, code, sectionId, sectionCode } = await request.json()

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Assembly name is required' }, 
        { status: 400 }
      )
    }

    if (!sectionId && !sectionCode) {
      return NextResponse.json(
        { error: 'Section ID or section code is required' }, 
        { status: 400 }
      )
    }

    // Import code generator
    const { LibraryCodeGenerator } = await import('@/lib/services/libraryCodeGenerator')
    const codeGenerator = new LibraryCodeGenerator()

    // Find section if only code provided
    let targetSectionId = sectionId
    let targetSectionCode = sectionCode

    if (!targetSectionId && targetSectionCode) {
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('id, code')
        .eq('code', targetSectionCode)
        .eq('is_active', true)
        .single()

      if (sectionError || !section) {
        return NextResponse.json(
          { error: `Section with code ${targetSectionCode} not found` }, 
          { status: 404 }
        )
      }

      targetSectionId = section.id
      targetSectionCode = section.code
    } else if (targetSectionId) {
      // Get section code for code generation
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('code')
        .eq('id', targetSectionId)
        .eq('is_active', true)
        .single()

      if (sectionError || !section) {
        return NextResponse.json(
          { error: 'Section not found' }, 
          { status: 404 }
        )
      }

      targetSectionCode = section.code
    }

    // Generate code if not provided
    let assemblyCode = code
    if (!assemblyCode) {
      assemblyCode = await codeGenerator.generateAssemblyCode(targetSectionCode!)
    } else {
      // Validate provided code
      if (!codeGenerator.validateAssemblyCode(assemblyCode)) {
        return NextResponse.json(
          { error: 'Invalid assembly code format. Must be XX.XX.XX (e.g., 02.10.10)' }, 
          { status: 400 }
        )
      }

      // Validate hierarchy
      if (!codeGenerator.validateHierarchy(assemblyCode, targetSectionCode!)) {
        return NextResponse.json(
          { error: `Assembly code ${assemblyCode} does not belong to section ${targetSectionCode}` }, 
          { status: 400 }
        )
      }

      // Check if code already exists
      const exists = await codeGenerator.codeExists(assemblyCode, 3)
      if (exists) {
        return NextResponse.json(
          { error: `Assembly code ${assemblyCode} already exists` }, 
          { status: 409 }
        )
      }
    }

    // Generate sort order
    const sortOrder = codeGenerator.generateSortOrder(assemblyCode)

    // Create assembly
    const { data: newAssembly, error: createError } = await supabase
      .from('assemblies')
      .insert({
        section_id: targetSectionId,
        code: assemblyCode,
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
      console.error('Error creating assembly:', createError)
      return NextResponse.json(
        { error: 'Failed to create assembly' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newAssembly.id,
        sectionId: newAssembly.section_id,
        code: newAssembly.code,
        name: newAssembly.name,
        description: newAssembly.description,
        sortOrder: newAssembly.sort_order
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in create assembly API:', error)
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
    const assemblyId = searchParams.get('id')
    const force = searchParams.get('force') === 'true'

    if (!assemblyId) {
      return NextResponse.json(
        { error: 'Assembly ID is required' }, 
        { status: 400 }
      )
    }

    // Check if assembly exists and get its details
    const { data: assembly, error: assemblyError } = await supabase
      .from('assemblies')
      .select(`
        id, code, name, section_id, is_active,
        items:library_items(
          id, code, name, status
        )
      `)
      .eq('id', assemblyId)
      .eq('is_active', true)
      .single()

    if (assemblyError || !assembly) {
      return NextResponse.json(
        { error: 'Assembly not found' }, 
        { status: 404 }
      )
    }

    // Calculate impact
    let totalItems = 0
    let confirmedItems = 0
    let actualItems = 0

    assembly.items.forEach(item => {
      totalItems++
      if (item.status === 'confirmed') confirmedItems++
      if (item.status === 'actual') actualItems++
    })

    // Safety checks - prevent deletion if there are confirmed or actual items
    if ((confirmedItems > 0 || actualItems > 0) && !force) {
      return NextResponse.json({
        error: 'Cannot delete assembly with confirmed or actual library items',
        canForceDelete: false,
        impact: {
          assembly: { code: assembly.code, name: assembly.name },
          items: totalItems,
          confirmedItems,
          actualItems
        }
      }, { status: 400 })
    }

    // Return impact for confirmation if not forcing
    if (totalItems > 0 && !force) {
      return NextResponse.json({
        error: 'Assembly contains child items',
        canForceDelete: true,
        impact: {
          assembly: { code: assembly.code, name: assembly.name },
          items: totalItems,
          confirmedItems,
          actualItems
        },
        message: `This will delete ${totalItems} library items.`
      }, { status: 409 })
    }

    // Perform cascade soft delete
    const { error: deleteError } = await supabase
      .from('assemblies')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', assemblyId)

    if (deleteError) {
      console.error('Error deleting assembly:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assembly' }, 
        { status: 500 }
      )
    }

    // Also soft delete all children (cascade)
    if (totalItems > 0) {
      await supabase
        .from('library_items')
        .update({ is_active: false, last_modified: new Date().toISOString() })
        .eq('assembly_id', assemblyId)
    }

    return NextResponse.json({
      success: true,
      message: 'Assembly deleted successfully',
      impact: {
        assembly: { code: assembly.code, name: assembly.name },
        items: totalItems,
        confirmedItems,
        actualItems
      }
    })

  } catch (error) {
    console.error('Unexpected error in delete assembly API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}