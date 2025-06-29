import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { level, parentCode } = await request.json()

    // Validate required fields
    if (!level || level < 1 || level > 4) {
      return NextResponse.json(
        { error: 'Level must be between 1 and 4' }, 
        { status: 400 }
      )
    }

    if (level > 1 && !parentCode) {
      return NextResponse.json(
        { error: 'Parent code is required for levels > 1' }, 
        { status: 400 }
      )
    }

    // Import code generator
    const { LibraryCodeGenerator } = await import('@/lib/services/libraryCodeGenerator')
    const codeGenerator = new LibraryCodeGenerator()

    let previewCode = ''

    try {
      switch (level) {
        case 1: // Division
          previewCode = await codeGenerator.generateDivisionCode()
          break
        case 2: // Section
          previewCode = await codeGenerator.generateSectionCode(parentCode!)
          break
        case 3: // Assembly
          previewCode = await codeGenerator.generateAssemblyCode(parentCode!)
          break
        case 4: // Item
          previewCode = await codeGenerator.generateItemCode(parentCode!)
          break
      }

      return NextResponse.json({
        success: true,
        code: previewCode,
        level,
        parentCode: parentCode || null
      })

    } catch (error: any) {
      console.error('Code generation error:', error)
      return NextResponse.json(
        { error: `Code generation failed: ${error.message}` }, 
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Unexpected error in preview-code API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}