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

    const { 
      name, 
      description, 
      unit, 
      specifications, 
      wastagePercentage, 
      productivityNotes,
      code, 
      assemblyId, 
      assemblyCode 
    } = await request.json()

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Item name is required' }, 
        { status: 400 }
      )
    }

    if (!unit || unit.trim().length === 0) {
      return NextResponse.json(
        { error: 'Item unit is required' }, 
        { status: 400 }
      )
    }

    if (!assemblyId && !assemblyCode) {
      return NextResponse.json(
        { error: 'Assembly ID or assembly code is required' }, 
        { status: 400 }
      )
    }

    // Validate wastage percentage if provided
    if (wastagePercentage !== undefined && (wastagePercentage < 0 || wastagePercentage > 100)) {
      return NextResponse.json(
        { error: 'Wastage percentage must be between 0 and 100' }, 
        { status: 400 }
      )
    }

    // Import code generator
    const { LibraryCodeGenerator } = await import('@/shared/lib/services/libraryCodeGenerator')
    const codeGenerator = new LibraryCodeGenerator()

    // Find assembly if only code provided
    let targetAssemblyId = assemblyId
    let targetAssemblyCode = assemblyCode

    if (!targetAssemblyId && targetAssemblyCode) {
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('id, code')
        .eq('code', targetAssemblyCode)
        .eq('is_active', true)
        .single()

      if (assemblyError || !assembly) {
        return NextResponse.json(
          { error: `Assembly with code ${targetAssemblyCode} not found` }, 
          { status: 404 }
        )
      }

      targetAssemblyId = assembly.id
      targetAssemblyCode = assembly.code
    } else if (targetAssemblyId) {
      // Get assembly code for code generation
      const { data: assembly, error: assemblyError } = await supabase
        .from('assemblies')
        .select('code')
        .eq('id', targetAssemblyId)
        .eq('is_active', true)
        .single()

      if (assemblyError || !assembly) {
        return NextResponse.json(
          { error: 'Assembly not found' }, 
          { status: 404 }
        )
      }

      targetAssemblyCode = assembly.code
    }

    // Generate code if not provided
    let itemCode = code
    if (!itemCode) {
      itemCode = await codeGenerator.generateItemCode(targetAssemblyCode!, assemblyId)
    } else {
      // Validate provided code
      if (!codeGenerator.validateItemCode(itemCode)) {
        return NextResponse.json(
          { error: 'Invalid item code format. Must be XX.XX.XX.XX (e.g., 02.10.10.01)' }, 
          { status: 400 }
        )
      }

      // Validate hierarchy
      if (!codeGenerator.validateHierarchy(itemCode, targetAssemblyCode!)) {
        return NextResponse.json(
          { error: `Item code ${itemCode} does not belong to assembly ${targetAssemblyCode}` }, 
          { status: 400 }
        )
      }

      // Check if code already exists
      const exists = await codeGenerator.codeExists(itemCode, '4', assemblyId)
      if (exists) {
        return NextResponse.json(
          { error: `Item code ${itemCode} already exists` }, 
          { status: 409 }
        )
      }
    }

    // Create library item
    const { data: newItem, error: createError } = await supabase
      .from('library_items')
      .insert({
        assembly_id: targetAssemblyId,
        code: itemCode,
        name: name.trim(),
        description: description?.trim() || '',
        unit: unit.trim(),
        specifications: specifications?.trim() || null,
        wastage_percentage: wastagePercentage || 0,
        productivity_notes: productivityNotes?.trim() || null,
        status: 'draft',
        has_materials: false,
        has_labor: false,
        has_equipment: false,
        is_complete: false,
        missing_factors: [],
        last_validated: new Date().toISOString(),
        validated_by: user.email || user.id,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating library item:', createError)
      return NextResponse.json(
        { error: 'Failed to create library item' }, 
        { status: 500 }
      )
    }

    // Track creation usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: newItem.id,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ action: 'created' })
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newItem.id,
        assemblyId: newItem.assembly_id,
        code: newItem.code,
        name: newItem.name,
        description: newItem.description,
        unit: newItem.unit,
        specifications: newItem.specifications,
        wastagePercentage: newItem.wastage_percentage,
        productivityNotes: newItem.productivity_notes,
        status: newItem.status,
        validation: {
          hasMaterials: newItem.has_materials,
          hasLabor: newItem.has_labor,
          hasEquipment: newItem.has_equipment,
          isComplete: newItem.is_complete,
          missingFactors: newItem.missing_factors || [],
          lastValidated: newItem.last_validated,
          validatedBy: newItem.validated_by
        },
        createdAt: newItem.created_at,
        lastModified: newItem.last_modified,
        isActive: newItem.is_active
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in create library item API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}