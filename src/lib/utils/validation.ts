/**
 * Validation utilities for the library system
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export class LibraryValidator {
  /**
   * Validate division data
   */
  static validateDivision(data: { name?: string; code?: string; description?: string }): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Division name is required')
    } else if (data.name.trim().length > 255) {
      errors.push('Division name must be 255 characters or less')
    }

    // Code format validation (if provided)
    if (data.code) {
      if (!/^\d{2}$/.test(data.code.trim())) {
        errors.push('Division code must be exactly 2 digits (e.g., 02)')
      }
    }

    // Description length validation
    if (data.description && data.description.length > 1000) {
      warnings.push('Description is very long. Consider keeping it under 1000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate section data
   */
  static validateSection(data: { name?: string; code?: string; description?: string; divisionCode?: string }): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Section name is required')
    } else if (data.name.trim().length > 255) {
      errors.push('Section name must be 255 characters or less')
    }

    // Code format validation (if provided)
    if (data.code) {
      if (!/^\d{2}\.\d{2}$/.test(data.code.trim())) {
        errors.push('Section code must be in format XX.XX (e.g., 02.10)')
      } else if (data.divisionCode) {
        const expectedPrefix = data.divisionCode.trim()
        if (!data.code.startsWith(expectedPrefix + '.')) {
          errors.push(`Section code must start with division code ${expectedPrefix}`)
        }
      }
    }

    // Description length validation
    if (data.description && data.description.length > 1000) {
      warnings.push('Description is very long. Consider keeping it under 1000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate assembly data
   */
  static validateAssembly(data: { name?: string; code?: string; description?: string; sectionCode?: string }): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Assembly name is required')
    } else if (data.name.trim().length > 255) {
      errors.push('Assembly name must be 255 characters or less')
    }

    // Code format validation (if provided)
    if (data.code) {
      if (!/^\d{2}\.\d{2}\.\d{2}$/.test(data.code.trim())) {
        errors.push('Assembly code must be in format XX.XX.XX (e.g., 02.10.10)')
      } else if (data.sectionCode) {
        const expectedPrefix = data.sectionCode.trim()
        if (!data.code.startsWith(expectedPrefix + '.')) {
          errors.push(`Assembly code must start with section code ${expectedPrefix}`)
        }
      }
    }

    // Description length validation
    if (data.description && data.description.length > 1000) {
      warnings.push('Description is very long. Consider keeping it under 1000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate library item data
   */
  static validateLibraryItem(data: { 
    name?: string; 
    code?: string; 
    description?: string; 
    unit?: string;
    specifications?: string;
    wastagePercentage?: number;
    productivityNotes?: string;
    assemblyCode?: string;
  }): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Item name is required')
    } else if (data.name.trim().length > 255) {
      errors.push('Item name must be 255 characters or less')
    }

    if (!data.unit || data.unit.trim().length === 0) {
      errors.push('Unit is required')
    } else if (data.unit.trim().length > 50) {
      errors.push('Unit must be 50 characters or less')
    }

    // Code format validation (if provided)
    if (data.code) {
      if (!/^\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(data.code.trim())) {
        errors.push('Item code must be in format XX.XX.XX.XX (e.g., 02.10.10.01)')
      } else if (data.assemblyCode) {
        const expectedPrefix = data.assemblyCode.trim()
        if (!data.code.startsWith(expectedPrefix + '.')) {
          errors.push(`Item code must start with assembly code ${expectedPrefix}`)
        }
      }
    }

    // Wastage percentage validation
    if (data.wastagePercentage !== undefined) {
      if (data.wastagePercentage < 0 || data.wastagePercentage > 100) {
        errors.push('Wastage percentage must be between 0 and 100')
      }
    }

    // Field length validations
    if (data.description && data.description.length > 1000) {
      warnings.push('Description is very long. Consider keeping it under 1000 characters')
    }

    if (data.specifications && data.specifications.length > 2000) {
      warnings.push('Specifications are very long. Consider keeping them under 2000 characters')
    }

    if (data.productivityNotes && data.productivityNotes.length > 2000) {
      warnings.push('Productivity notes are very long. Consider keeping them under 2000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate Excel import row data
   */
  static validateExcelRow(rowData: any, rowIndex: number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if row has any meaningful data
    const hasData = Object.values(rowData).some(value => 
      value && typeof value === 'string' && value.trim().length > 0
    )

    if (!hasData) {
      warnings.push(`Row ${rowIndex}: Empty row will be skipped`)
      return { isValid: true, errors, warnings }
    }

    // Validate based on what data is present
    if (rowData.Division_Code || rowData.Division_Name) {
      const divisionValidation = this.validateDivision({
        name: rowData.Division_Name,
        code: rowData.Division_Code,
        description: rowData.Division_Description
      })
      if (!divisionValidation.isValid) {
        errors.push(...divisionValidation.errors.map(err => `Row ${rowIndex} (Division): ${err}`))
      }
    }

    if (rowData.Section_Code || rowData.Section_Name) {
      const sectionValidation = this.validateSection({
        name: rowData.Section_Name,
        code: rowData.Section_Code,
        description: rowData.Section_Description,
        divisionCode: rowData.Division_Code
      })
      if (!sectionValidation.isValid) {
        errors.push(...sectionValidation.errors.map(err => `Row ${rowIndex} (Section): ${err}`))
      }
    }

    if (rowData.Assembly_Code || rowData.Assembly_Name) {
      const assemblyValidation = this.validateAssembly({
        name: rowData.Assembly_Name,
        code: rowData.Assembly_Code,
        description: rowData.Assembly_Description,
        sectionCode: rowData.Section_Code
      })
      if (!assemblyValidation.isValid) {
        errors.push(...assemblyValidation.errors.map(err => `Row ${rowIndex} (Assembly): ${err}`))
      }
    }

    if (rowData.Item_Code || rowData.Item_Name) {
      const itemValidation = this.validateLibraryItem({
        name: rowData.Item_Name,
        code: rowData.Item_Code,
        description: rowData.Item_Description,
        unit: rowData.Item_Unit,
        specifications: rowData.Item_Specifications,
        wastagePercentage: rowData.Item_Wastage_Percentage ? parseFloat(rowData.Item_Wastage_Percentage) : undefined,
        assemblyCode: rowData.Assembly_Code
      })
      if (!itemValidation.isValid) {
        errors.push(...itemValidation.errors.map(err => `Row ${rowIndex} (Item): ${err}`))
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate common units
   */
  static validateUnit(unit: string): boolean {
    const commonUnits = [
      // Area
      'm²', 'ft²', 'sq m', 'sq ft',
      // Volume
      'm³', 'ft³', 'L', 'l', 'gal', 'cu m', 'cu ft',
      // Length
      'm', 'ft', 'mm', 'cm', 'km', 'in', 'yd',
      // Weight
      'kg', 't', 'g', 'lb', 'oz', 'ton',
      // Count
      'pcs', 'each', 'ea', 'set', 'lot', 'box', 'pack',
      // Time
      'hr', 'hrs', 'day', 'days', 'week', 'weeks', 'month', 'months'
    ]

    return commonUnits.includes(unit.toLowerCase()) || unit.trim().length > 0
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\-\.\/\(\)\[\]]/g, '') // Remove special characters except basic ones
  }

  /**
   * Validate code uniqueness in a batch
   */
  static validateCodeUniqueness(codes: string[]): ValidationResult {
    const errors: string[] = []
    const codeMap = new Map<string, number[]>()

    codes.forEach((code, index) => {
      if (code && code.trim().length > 0) {
        const normalizedCode = code.trim()
        if (!codeMap.has(normalizedCode)) {
          codeMap.set(normalizedCode, [])
        }
        codeMap.get(normalizedCode)!.push(index + 1) // 1-based row numbers
      }
    })

    // Check for duplicates
    codeMap.forEach((rows, code) => {
      if (rows.length > 1) {
        errors.push(`Duplicate code "${code}" found in rows: ${rows.join(', ')}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}