// Library code generation utilities

interface CodeGenerationConfig {
  prefix?: string
  suffix?: string
  length?: number
  includeTimestamp?: boolean
}

interface GeneratedCode {
  code: string
  fullCode: string
  timestamp?: string
}

// Generate codes for library items
export const generateDivisionCode = (name: string, config: CodeGenerationConfig = {}): GeneratedCode => {
  const { prefix = 'DIV', length = 3 } = config
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const nameCode = cleanName.substring(0, length).padEnd(length, '0')
  const code = `${prefix}${nameCode}`
  
  return {
    code: nameCode,
    fullCode: code,
    timestamp: config.includeTimestamp ? new Date().toISOString() : undefined
  }
}

export const generateSectionCode = (divisionCode: string, name: string, config: CodeGenerationConfig = {}): GeneratedCode => {
  const { prefix = 'SEC', length = 3 } = config
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const nameCode = cleanName.substring(0, length).padEnd(length, '0')
  const code = `${divisionCode}-${prefix}${nameCode}`
  
  return {
    code: nameCode,
    fullCode: code,
    timestamp: config.includeTimestamp ? new Date().toISOString() : undefined
  }
}

export const generateAssemblyCode = (sectionCode: string, name: string, config: CodeGenerationConfig = {}): GeneratedCode => {
  const { prefix = 'ASM', length = 3 } = config
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const nameCode = cleanName.substring(0, length).padEnd(length, '0')
  const code = `${sectionCode}-${prefix}${nameCode}`
  
  return {
    code: nameCode,
    fullCode: code,
    timestamp: config.includeTimestamp ? new Date().toISOString() : undefined
  }
}

export const generateItemCode = (assemblyCode: string, name: string, config: CodeGenerationConfig = {}): GeneratedCode => {
  const { prefix = 'ITM', length = 4 } = config
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const nameCode = cleanName.substring(0, length).padEnd(length, '0')
  const code = `${assemblyCode}-${prefix}${nameCode}`
  
  return {
    code: nameCode,
    fullCode: code,
    timestamp: config.includeTimestamp ? new Date().toISOString() : undefined
  }
}

// Auto-increment utilities
export const generateAutoIncrementCode = (prefix: string, lastCode: string): string => {
  const numberPart = lastCode.replace(prefix, '')
  const nextNumber = parseInt(numberPart, 10) + 1
  return `${prefix}${nextNumber.toString().padStart(numberPart.length, '0')}`
}

// Validation utilities
export const validateCodeFormat = (code: string, pattern: RegExp): boolean => {
  return pattern.test(code)
}

export const isCodeUnique = async (code: string, checkFunction: (code: string) => Promise<boolean>): Promise<boolean> => {
  return await checkFunction(code)
}

// Code patterns
export const CODE_PATTERNS = {
  DIVISION: /^DIV[A-Z0-9]{3}$/,
  SECTION: /^DIV[A-Z0-9]{3}-SEC[A-Z0-9]{3}$/,
  ASSEMBLY: /^DIV[A-Z0-9]{3}-SEC[A-Z0-9]{3}-ASM[A-Z0-9]{3}$/,
  ITEM: /^DIV[A-Z0-9]{3}-SEC[A-Z0-9]{3}-ASM[A-Z0-9]{3}-ITM[A-Z0-9]{4}$/
} as const

// Main class for backward compatibility
export class LibraryCodeGenerator {
  generateDivisionCode(name: string, config?: CodeGenerationConfig): GeneratedCode {
    return generateDivisionCode(name, config)
  }

  generateSectionCode(divisionCode: string, name: string, config?: CodeGenerationConfig): GeneratedCode {
    return generateSectionCode(divisionCode, name, config)
  }

  generateAssemblyCode(sectionCode: string, name: string, config?: CodeGenerationConfig): GeneratedCode {
    return generateAssemblyCode(sectionCode, name, config)
  }

  generateItemCode(assemblyCode: string, name: string, config?: CodeGenerationConfig): GeneratedCode {
    return generateItemCode(assemblyCode, name, config)
  }

  generateAutoIncrementCode(prefix: string, lastCode: string): string {
    return generateAutoIncrementCode(prefix, lastCode)
  }

  validateCodeFormat(code: string, pattern: RegExp): boolean {
    return validateCodeFormat(code, pattern)
  }

  async isCodeUnique(code: string, checkFunction: (code: string) => Promise<boolean>): Promise<boolean> {
    return await isCodeUnique(code, checkFunction)
  }

  // Additional methods for backward compatibility
  validateDivisionCode(code: string): boolean {
    return CODE_PATTERNS.DIVISION.test(code)
  }

  validateSectionCode(code: string): boolean {
    return CODE_PATTERNS.SECTION.test(code)
  }

  validateAssemblyCode(code: string): boolean {
    return CODE_PATTERNS.ASSEMBLY.test(code)
  }

  validateItemCode(code: string): boolean {
    return CODE_PATTERNS.ITEM.test(code)
  }

  async codeExists(code: string, tableName: string, supabase: any): Promise<boolean> {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('code', code)
      .single()
    
    return !error && !!data
  }

  validateHierarchy(parentCode: string, childCode: string): boolean {
    // Simple validation - child code should start with parent code
    return childCode.startsWith(parentCode)
  }

  generateSortOrder(items: any[]): number {
    if (!items || items.length === 0) return 1
    const maxOrder = Math.max(...items.map(item => item.sort_order || 0))
    return maxOrder + 1
  }
}