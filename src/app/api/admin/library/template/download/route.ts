import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Excel template with proper structure
    const templateData = [
      {
        'Division_Code': '02',
        'Division_Name': 'Sitework',
        'Division_Description': 'Site preparation and earthwork',
        'Section_Code': '02.10',
        'Section_Name': 'Site Preparation',
        'Section_Description': 'Basic site preparation activities',
        'Assembly_Code': '02.10.10',
        'Assembly_Name': 'Excavation',
        'Assembly_Description': 'Various types of excavation work',
        'Item_Code': '02.10.10.01',
        'Item_Name': 'Manual Excavation',
        'Item_Description': 'Hand excavation for small areas',
        'Item_Unit': 'm³',
        'Item_Specifications': 'Depth up to 1.5m, loose soil',
        'Item_Wastage_Percentage': '5'
      },
      {
        'Division_Code': '02',
        'Division_Name': 'Sitework',
        'Division_Description': '',
        'Section_Code': '02.10',
        'Section_Name': 'Site Preparation',
        'Section_Description': '',
        'Assembly_Code': '02.10.10',
        'Assembly_Name': 'Excavation',
        'Assembly_Description': '',
        'Item_Code': '02.10.10.02',
        'Item_Name': 'Machine Excavation',
        'Item_Description': 'Mechanical excavation using excavator',
        'Item_Unit': 'm³',
        'Item_Specifications': 'Depth up to 3m, all soil types',
        'Item_Wastage_Percentage': '2'
      },
      {
        'Division_Code': '02',
        'Division_Name': 'Sitework',
        'Division_Description': '',
        'Section_Code': '02.20',
        'Section_Name': 'Utilities',
        'Section_Description': 'Underground utility installations',
        'Assembly_Code': '02.20.10',
        'Assembly_Name': 'Water Lines',
        'Assembly_Description': 'Water supply line installation',
        'Item_Code': '02.20.10.01',
        'Item_Name': 'Pipe Installation',
        'Item_Description': 'Install water supply pipes',
        'Item_Unit': 'm',
        'Item_Specifications': 'PVC pipe, various diameters',
        'Item_Wastage_Percentage': '3'
      },
      {
        'Division_Code': '03',
        'Division_Name': 'Concrete',
        'Division_Description': 'Cast-in-place concrete',
        'Section_Code': '03.10',
        'Section_Name': 'Concrete Forming',
        'Section_Description': 'Formwork for concrete structures',
        'Assembly_Code': '03.10.10',
        'Assembly_Name': 'Foundation Forms',
        'Assembly_Description': 'Formwork for foundations',
        'Item_Code': '03.10.10.01',
        'Item_Name': 'Strip Footing Forms',
        'Item_Description': 'Formwork for strip footings',
        'Item_Unit': 'm²',
        'Item_Specifications': 'Plywood forms, reusable',
        'Item_Wastage_Percentage': '0'
      }
    ]

    // Instructions data for separate sheet
    const instructionsData = [
      ['LIBRARY IMPORT TEMPLATE INSTRUCTIONS', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['HIERARCHY STRUCTURE:', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Level 1: Division (XX)', 'Example: 02', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Level 2: Section (XX.XX)', 'Example: 02.10', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Level 3: Assembly (XX.XX.XX)', 'Example: 02.10.10', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Level 4: Library Item (XX.XX.XX.XX)', 'Example: 02.10.10.01', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['COLUMN RULES:', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Division_Code', 'Required for new divisions. Format: XX (e.g., 02, 03)', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Division_Name', 'Required when creating new divisions', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Division_Description', 'Optional description for divisions', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Section_Code', 'Required for new sections. Format: XX.XX (e.g., 02.10)', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Section_Name', 'Required when creating new sections', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Section_Description', 'Optional description for sections', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Assembly_Code', 'Required for new assemblies. Format: XX.XX.XX (e.g., 02.10.10)', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Assembly_Name', 'Required when creating new assemblies', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Assembly_Description', 'Optional description for assemblies', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Item_Code', 'Required for new items. Format: XX.XX.XX.XX (e.g., 02.10.10.01)', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Item_Name', 'Required for all library items', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Item_Description', 'Optional but recommended description', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Item_Unit', 'Required unit of measurement (m³, m², m, kg, etc.)', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Item_Specifications', 'Optional technical specifications', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Item_Wastage_Percentage', 'Optional wastage percentage (0-100)', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['IMPORTANT NOTES:', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['1. Codes will be auto-generated if left blank', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['2. Parent levels must exist before children', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['3. Duplicate codes will be skipped', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['4. Empty rows will be ignored', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['5. All data will be validated before import', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ]

    // Common units for validation sheet
    const commonUnitsData = [
      ['COMMON UNITS', ''],
      ['', ''],
      ['Area Units:', ''],
      ['m²', 'Square meters'],
      ['ft²', 'Square feet'],
      ['', ''],
      ['Volume Units:', ''],
      ['m³', 'Cubic meters'],
      ['ft³', 'Cubic feet'],
      ['L', 'Liters'],
      ['', ''],
      ['Length Units:', ''],
      ['m', 'Meters'],
      ['ft', 'Feet'],
      ['mm', 'Millimeters'],
      ['', ''],
      ['Weight Units:', ''],
      ['kg', 'Kilograms'],
      ['t', 'Tonnes'],
      ['lb', 'Pounds'],
      ['', ''],
      ['Count Units:', ''],
      ['pcs', 'Pieces'],
      ['each', 'Each'],
      ['set', 'Set'],
      ['lot', 'Lot']
    ]

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new()

    // Create main template sheet
    const templateSheet = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths for better readability
    const templateCols = [
      { wch: 12 }, // Division_Code
      { wch: 20 }, // Division_Name
      { wch: 30 }, // Division_Description
      { wch: 12 }, // Section_Code
      { wch: 20 }, // Section_Name
      { wch: 30 }, // Section_Description
      { wch: 15 }, // Assembly_Code
      { wch: 20 }, // Assembly_Name
      { wch: 30 }, // Assembly_Description
      { wch: 15 }, // Item_Code
      { wch: 25 }, // Item_Name
      { wch: 40 }, // Item_Description
      { wch: 10 }, // Item_Unit
      { wch: 30 }, // Item_Specifications
      { wch: 15 }  // Item_Wastage_Percentage
    ]
    templateSheet['!cols'] = templateCols

    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Library_Template')

    // Create instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
    const instructionsCols = Array(15).fill({ wch: 20 })
    instructionsSheet['!cols'] = instructionsCols
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

    // Create common units reference sheet
    const unitsSheet = XLSX.utils.aoa_to_sheet(commonUnitsData)
    const unitsCols = [{ wch: 15 }, { wch: 25 }]
    unitsSheet['!cols'] = unitsCols
    XLSX.utils.book_append_sheet(workbook, unitsSheet, 'Common_Units')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    })

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD format
    const filename = `Library_Import_Template_${timestamp}.xlsx`

    // Return Excel file as response
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating Excel template:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel template' }, 
      { status: 500 }
    )
  }
}