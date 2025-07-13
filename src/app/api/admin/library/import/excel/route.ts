import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import * as XLSX from 'xlsx'
import { LibraryValidator } from '@/lib/utils/validation'

interface ExcelImportRow {
  Division_Code?: string
  Division_Name?: string
  Division_Description?: string
  Section_Code?: string
  Section_Name?: string
  Section_Description?: string
  Assembly_Code?: string
  Assembly_Name?: string
  Assembly_Description?: string
  Item_Code?: string
  Item_Name?: string
  Item_Description?: string
  Item_Unit?: string
  Item_Specifications?: string
  Item_Wastage_Percentage?: string
}

interface ProcessedRow {
  level: number
  code: string
  name: string
  description?: string
  unit?: string
  specifications?: string
  wastagePercentage?: number
  parentCode?: string
  parentId?: string
}

interface ImportResult {
  success: boolean
  created: {
    divisions: number
    sections: number
    assemblies: number
    items: number
  }
  errors: Array<{
    row: number
    message: string
    data?: any
  }>
  skipped: Array<{
    row: number
    reason: string
    code: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.' }, 
        { status: 400 }
      )
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Get the first sheet (template sheet)
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json(
        { error: 'No data sheets found in the file' }, 
        { status: 400 }
      )
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData: ExcelImportRow[] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: ''
    }).slice(1) // Skip header row
      .map((row: any) => {
        if (!Array.isArray(row)) return null;
        return {
          Division_Code: row[0]?.toString().trim() || '',
          Division_Name: row[1]?.toString().trim() || '',
          Division_Description: row[2]?.toString().trim() || '',
          Section_Code: row[3]?.toString().trim() || '',
          Section_Name: row[4]?.toString().trim() || '',
          Section_Description: row[5]?.toString().trim() || '',
          Assembly_Code: row[6]?.toString().trim() || '',
          Assembly_Name: row[7]?.toString().trim() || '',
          Assembly_Description: row[8]?.toString().trim() || '',
          Item_Code: row[9]?.toString().trim() || '',
          Item_Name: row[10]?.toString().trim() || '',
          Item_Description: row[11]?.toString().trim() || '',
          Item_Unit: row[12]?.toString().trim() || '',
          Item_Specifications: row[13]?.toString().trim() || '',
          Item_Wastage_Percentage: row[14]?.toString().trim() || ''
        };
      })
      .filter(row => row !== null)
      .filter(row => 
        // Filter out completely empty rows
        row.Division_Code || row.Division_Name || row.Section_Code || 
        row.Section_Name || row.Assembly_Code || row.Assembly_Name || 
        row.Item_Code || row.Item_Name
      )

    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in the file' }, 
        { status: 400 }
      )
    }

    // Import code generator
    const { LibraryCodeGenerator } = await import('@/lib/services/libraryCodeGenerator')
    const codeGenerator = new LibraryCodeGenerator()

    const result: ImportResult = {
      success: false,
      created: {
        divisions: 0,
        sections: 0,
        assemblies: 0,
        items: 0
      },
      errors: [],
      skipped: []
    }

    // Pre-validate all rows
    const allCodes: string[] = []
    for (let i = 0; i < jsonData.length; i++) {
      const rowIndex = i + 2
      const row = jsonData[i]

      // Validate row data
      const validation = LibraryValidator.validateExcelRow(row, rowIndex)
      if (!validation.isValid) {
        result.errors.push(...validation.errors.map((error: string) => ({
          row: rowIndex,
          message: error
        })))
      }

      // Collect codes for duplicate checking
      if (row.Division_Code) allCodes.push(row.Division_Code)
      if (row.Section_Code) allCodes.push(row.Section_Code)
      if (row.Assembly_Code) allCodes.push(row.Assembly_Code)
      if (row.Item_Code) allCodes.push(row.Item_Code)
    }

    // Check for duplicate codes in the import file
    const duplicateValidation = LibraryValidator.validateCodeUniqueness(allCodes)
    if (!duplicateValidation.isValid) {
      result.errors.push(...duplicateValidation.errors.map(error => ({
        row: 0,
        message: `Duplicate codes in file: ${error}`
      })))
    }

    // If there are validation errors, return early
    if (result.errors.length > 0) {
      return NextResponse.json(result)
    }

    // Process data in a transaction
    const { data: transactionResult, error: transactionError } = await supabase.rpc('begin_transaction')
    
    try {
      // Track existing codes to avoid duplicates within the import
      const createdCodes = new Set<string>()
      const existingIds = new Map<string, string>() // code -> id mapping

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const rowIndex = i + 2 // Account for header row and 0-based index
        const row = jsonData[i]

        try {
          // Process Division
          if (row.Division_Code || row.Division_Name) {
            if (!row.Division_Name) {
              result.errors.push({
                row: rowIndex,
                message: 'Division name is required when division code is provided'
              })
              continue
            }

            let divisionCode = row.Division_Code
            if (!divisionCode) {
              divisionCode = await codeGenerator.generateDivisionCode()
            } else if (!codeGenerator.validateDivisionCode(divisionCode)) {
              result.errors.push({
                row: rowIndex,
                message: `Invalid division code format: ${divisionCode}`
              })
              continue
            }

            // Check if already created in this import or exists in DB
            if (!createdCodes.has(divisionCode)) {
              const exists = await codeGenerator.codeExists(divisionCode, 1)
              if (!exists) {
                const sortOrder = codeGenerator.generateSortOrder(divisionCode)
                const { data: newDivision, error: divisionError } = await supabase
                  .from('divisions')
                  .insert({
                    code: divisionCode,
                    name: row.Division_Name,
                    description: row.Division_Description || null,
                    sort_order: sortOrder,
                    total_items: 0,
                    completed_items: 0,
                    confirmed_items: 0,
                    actual_library_items: 0,
                    is_active: true
                  })
                  .select('id')
                  .single()

                if (divisionError) {
                  result.errors.push({
                    row: rowIndex,
                    message: `Failed to create division: ${divisionError.message}`
                  })
                  continue
                }

                createdCodes.add(divisionCode)
                existingIds.set(divisionCode, newDivision.id)
                result.created.divisions++
              } else {
                // Get existing division ID
                const { data: existingDivision } = await supabase
                  .from('divisions')
                  .select('id')
                  .eq('code', divisionCode)
                  .eq('is_active', true)
                  .single()

                if (existingDivision) {
                  existingIds.set(divisionCode, existingDivision.id)
                }
                
                result.skipped.push({
                  row: rowIndex,
                  reason: 'Division already exists',
                  code: divisionCode
                })
              }
            }
          }

          // Process Section
          if (row.Section_Code || row.Section_Name) {
            if (!row.Section_Name) {
              result.errors.push({
                row: rowIndex,
                message: 'Section name is required when section code is provided'
              })
              continue
            }

            // Determine parent division
            const parentDivisionCode = row.Division_Code || codeGenerator.getParentCode(row.Section_Code || '')
            if (!parentDivisionCode) {
              result.errors.push({
                row: rowIndex,
                message: 'Cannot determine parent division for section'
              })
              continue
            }

            const parentDivisionId = existingIds.get(parentDivisionCode)
            if (!parentDivisionId) {
              result.errors.push({
                row: rowIndex,
                message: `Parent division ${parentDivisionCode} not found`
              })
              continue
            }

            let sectionCode = row.Section_Code
            if (!sectionCode) {
              sectionCode = await codeGenerator.generateSectionCode(parentDivisionCode)
            } else if (!codeGenerator.validateSectionCode(sectionCode) || 
                      !codeGenerator.validateHierarchy(sectionCode, parentDivisionCode)) {
              result.errors.push({
                row: rowIndex,
                message: `Invalid section code or hierarchy: ${sectionCode}`
              })
              continue
            }

            // Check if already created in this import or exists in DB
            if (!createdCodes.has(sectionCode)) {
              const exists = await codeGenerator.codeExists(sectionCode, 2)
              if (!exists) {
                const sortOrder = codeGenerator.generateSortOrder(sectionCode)
                const { data: newSection, error: sectionError } = await supabase
                  .from('sections')
                  .insert({
                    division_id: parentDivisionId,
                    code: sectionCode,
                    name: row.Section_Name,
                    description: row.Section_Description || null,
                    sort_order: sortOrder,
                    total_items: 0,
                    completed_items: 0,
                    confirmed_items: 0,
                    actual_library_items: 0,
                    is_active: true
                  })
                  .select('id')
                  .single()

                if (sectionError) {
                  result.errors.push({
                    row: rowIndex,
                    message: `Failed to create section: ${sectionError.message}`
                  })
                  continue
                }

                createdCodes.add(sectionCode)
                existingIds.set(sectionCode, newSection.id)
                result.created.sections++
              } else {
                // Get existing section ID
                const { data: existingSection } = await supabase
                  .from('sections')
                  .select('id')
                  .eq('code', sectionCode)
                  .eq('is_active', true)
                  .single()

                if (existingSection) {
                  existingIds.set(sectionCode, existingSection.id)
                }

                result.skipped.push({
                  row: rowIndex,
                  reason: 'Section already exists',
                  code: sectionCode
                })
              }
            }
          }

          // Process Assembly
          if (row.Assembly_Code || row.Assembly_Name) {
            if (!row.Assembly_Name) {
              result.errors.push({
                row: rowIndex,
                message: 'Assembly name is required when assembly code is provided'
              })
              continue
            }

            // Determine parent section
            const parentSectionCode = row.Section_Code || codeGenerator.getParentCode(row.Assembly_Code || '')
            if (!parentSectionCode) {
              result.errors.push({
                row: rowIndex,
                message: 'Cannot determine parent section for assembly'
              })
              continue
            }

            const parentSectionId = existingIds.get(parentSectionCode)
            if (!parentSectionId) {
              result.errors.push({
                row: rowIndex,
                message: `Parent section ${parentSectionCode} not found`
              })
              continue
            }

            let assemblyCode = row.Assembly_Code
            if (!assemblyCode) {
              assemblyCode = await codeGenerator.generateAssemblyCode(parentSectionCode)
            } else if (!codeGenerator.validateAssemblyCode(assemblyCode) || 
                      !codeGenerator.validateHierarchy(assemblyCode, parentSectionCode)) {
              result.errors.push({
                row: rowIndex,
                message: `Invalid assembly code or hierarchy: ${assemblyCode}`
              })
              continue
            }

            // Check if already created in this import or exists in DB
            if (!createdCodes.has(assemblyCode)) {
              const exists = await codeGenerator.codeExists(assemblyCode, 3)
              if (!exists) {
                const sortOrder = codeGenerator.generateSortOrder(assemblyCode)
                const { data: newAssembly, error: assemblyError } = await supabase
                  .from('assemblies')
                  .insert({
                    section_id: parentSectionId,
                    code: assemblyCode,
                    name: row.Assembly_Name,
                    description: row.Assembly_Description || null,
                    sort_order: sortOrder,
                    total_items: 0,
                    completed_items: 0,
                    confirmed_items: 0,
                    actual_library_items: 0,
                    is_active: true
                  })
                  .select('id')
                  .single()

                if (assemblyError) {
                  result.errors.push({
                    row: rowIndex,
                    message: `Failed to create assembly: ${assemblyError.message}`
                  })
                  continue
                }

                createdCodes.add(assemblyCode)
                existingIds.set(assemblyCode, newAssembly.id)
                result.created.assemblies++
              } else {
                // Get existing assembly ID
                const { data: existingAssembly } = await supabase
                  .from('assemblies')
                  .select('id')
                  .eq('code', assemblyCode)
                  .eq('is_active', true)
                  .single()

                if (existingAssembly) {
                  existingIds.set(assemblyCode, existingAssembly.id)
                }

                result.skipped.push({
                  row: rowIndex,
                  reason: 'Assembly already exists',
                  code: assemblyCode
                })
              }
            }
          }

          // Process Library Item
          if (row.Item_Code || row.Item_Name) {
            if (!row.Item_Name) {
              result.errors.push({
                row: rowIndex,
                message: 'Item name is required when item code is provided'
              })
              continue
            }

            if (!row.Item_Unit) {
              result.errors.push({
                row: rowIndex,
                message: 'Item unit is required'
              })
              continue
            }

            // Determine parent assembly
            const parentAssemblyCode = row.Assembly_Code || codeGenerator.getParentCode(row.Item_Code || '')
            if (!parentAssemblyCode) {
              result.errors.push({
                row: rowIndex,
                message: 'Cannot determine parent assembly for item'
              })
              continue
            }

            const parentAssemblyId = existingIds.get(parentAssemblyCode)
            if (!parentAssemblyId) {
              result.errors.push({
                row: rowIndex,
                message: `Parent assembly ${parentAssemblyCode} not found`
              })
              continue
            }

            let itemCode = row.Item_Code
            if (!itemCode) {
              itemCode = await codeGenerator.generateItemCode(parentAssemblyCode)
            } else if (!codeGenerator.validateItemCode(itemCode) || 
                      !codeGenerator.validateHierarchy(itemCode, parentAssemblyCode)) {
              result.errors.push({
                row: rowIndex,
                message: `Invalid item code or hierarchy: ${itemCode}`
              })
              continue
            }

            // Validate wastage percentage
            let wastagePercentage = 0
            if (row.Item_Wastage_Percentage) {
              const wastage = parseFloat(row.Item_Wastage_Percentage)
              if (isNaN(wastage) || wastage < 0 || wastage > 100) {
                result.errors.push({
                  row: rowIndex,
                  message: 'Invalid wastage percentage. Must be between 0 and 100'
                })
                continue
              }
              wastagePercentage = wastage
            }

            // Check if already created in this import or exists in DB
            if (!createdCodes.has(itemCode)) {
              const exists = await codeGenerator.codeExists(itemCode, 4)
              if (!exists) {
                const { data: newItem, error: itemError } = await supabase
                  .from('library_items')
                  .insert({
                    assembly_id: parentAssemblyId,
                    code: itemCode,
                    name: row.Item_Name,
                    description: row.Item_Description || '',
                    unit: row.Item_Unit,
                    specifications: row.Item_Specifications || null,
                    wastage_percentage: wastagePercentage,
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
                  .select('id')
                  .single()

                if (itemError) {
                  result.errors.push({
                    row: rowIndex,
                    message: `Failed to create item: ${itemError.message}`
                  })
                  continue
                }

                createdCodes.add(itemCode)
                result.created.items++

                // Track creation usage
                await supabase.rpc('track_library_item_usage', {
                  p_library_item_id: newItem.id,
                  p_user_id: user.id,
                  p_usage_type: 'edit',
                  p_metadata: JSON.stringify({ action: 'imported' })
                })
              } else {
                result.skipped.push({
                  row: rowIndex,
                  reason: 'Item already exists',
                  code: itemCode
                })
              }
            }
          }

        } catch (rowError) {
          console.error(`Error processing row ${rowIndex}:`, rowError)
          result.errors.push({
            row: rowIndex,
            message: `Unexpected error: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`
          })
        }
      }

      // Commit transaction if no critical errors
      if (result.errors.length === 0) {
        await supabase.rpc('commit_transaction')
        result.success = true
      } else {
        await supabase.rpc('rollback_transaction')
        result.success = false
      }

    } catch (error) {
      console.error('Transaction error:', error)
      await supabase.rpc('rollback_transaction')
      result.errors.push({
        row: 0,
        message: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error processing Excel import:', error)
    return NextResponse.json(
      { error: 'Failed to process Excel file' }, 
      { status: 500 }
    )
  }
}