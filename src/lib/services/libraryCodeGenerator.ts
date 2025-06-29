import { createClient } from '@/utils/supabase/server'

export class LibraryCodeGenerator {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Generate next available division code (XX format)
   * @returns Promise<string> Next division code (e.g., "01", "02", "03")
   */
  async generateDivisionCode(): Promise<string> {
    const { data: divisions, error } = await this.supabase
      .from('divisions')
      .select('code')
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch divisions: ${error.message}`)
    }

    // Find the highest numeric code and increment
    let maxCode = 0
    if (divisions && divisions.length > 0) {
      for (const division of divisions) {
        const numericCode = parseInt(division.code, 10)
        if (!isNaN(numericCode) && numericCode > maxCode) {
          maxCode = numericCode
        }
      }
    }

    const nextCode = maxCode + 1
    return nextCode.toString().padStart(2, '0')
  }

  /**
   * Generate next available section code (XX.XX format)
   * @param divisionCode Parent division code (e.g., "02")
   * @returns Promise<string> Next section code (e.g., "02.10", "02.20")
   */
  async generateSectionCode(divisionCode: string): Promise<string> {
    console.log(`[CodeGenerator] Generating section code for division: ${divisionCode}`)
    
    // Validate division code format
    if (!this.validateDivisionCode(divisionCode)) {
      console.error(`[CodeGenerator] Invalid division code format: ${divisionCode}`)
      throw new Error(`Invalid division code format: ${divisionCode}`)
    }

    try {
      // Get existing sections for this division
      console.log(`[CodeGenerator] Querying sections with pattern: ${divisionCode}.%`)
      const { data: sections, error } = await this.supabase
        .from('sections')
        .select('code')
        .like('code', `${divisionCode}.%`)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) {
        console.error(`[CodeGenerator] Database error fetching sections:`, error)
        throw new Error(`Failed to fetch sections: ${error.message}`)
      }

      console.log(`[CodeGenerator] Found ${sections?.length || 0} existing sections:`, sections?.map(s => s.code) || [])

      // Find the highest section number within this division
      let maxSectionNumber = 0
      if (sections && sections.length > 0) {
        for (const section of sections) {
          const sectionMatch = section.code.match(/^(\d{2})\.(\d{2})$/)
          if (sectionMatch && sectionMatch[1] === divisionCode) {
            const sectionNumber = parseInt(sectionMatch[2], 10)
            console.log(`[CodeGenerator] Processing section ${section.code}, parsed number: ${sectionNumber}`)
            if (!isNaN(sectionNumber) && sectionNumber > maxSectionNumber) {
              maxSectionNumber = sectionNumber
            }
          } else {
            console.log(`[CodeGenerator] Section ${section.code} does not match pattern or division`)
          }
        }
      }

      console.log(`[CodeGenerator] Maximum section number found: ${maxSectionNumber}`)

      // Generate next section code (increment by 10: 10, 20, 30, etc.)
      const nextSectionNumber = maxSectionNumber === 0 ? 10 : maxSectionNumber + 10
      const generatedCode = `${divisionCode}.${nextSectionNumber.toString().padStart(2, '0')}`
      
      console.log(`[CodeGenerator] Generated section code: ${generatedCode}`)
      return generatedCode
    } catch (error) {
      console.error(`[CodeGenerator] Unexpected error in generateSectionCode:`, error)
      throw error
    }
  }

  /**
   * Generate next available assembly code (XX.XX.XX format)
   * @param sectionCode Parent section code (e.g., "02.10")
   * @returns Promise<string> Next assembly code (e.g., "02.10.10", "02.10.20")
   */
  async generateAssemblyCode(sectionCode: string): Promise<string> {
    console.log(`[CodeGenerator] Generating assembly code for section: ${sectionCode}`)
    
    // Validate section code format
    if (!this.validateSectionCode(sectionCode)) {
      console.error(`[CodeGenerator] Invalid section code format: ${sectionCode}`)
      throw new Error(`Invalid section code format: ${sectionCode}`)
    }

    try {
      // Get existing assemblies for this section
      console.log(`[CodeGenerator] Querying assemblies with pattern: ${sectionCode}.%`)
      const { data: assemblies, error } = await this.supabase
        .from('assemblies')
        .select('code')
        .like('code', `${sectionCode}.%`)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) {
        console.error(`[CodeGenerator] Database error fetching assemblies:`, error)
        throw new Error(`Failed to fetch assemblies: ${error.message}`)
      }

      console.log(`[CodeGenerator] Found ${assemblies?.length || 0} existing assemblies:`, assemblies?.map(a => a.code) || [])

      // Find the highest assembly number within this section
      let maxAssemblyNumber = 0
      if (assemblies && assemblies.length > 0) {
        for (const assembly of assemblies) {
          const assemblyMatch = assembly.code.match(/^(\d{2})\.(\d{2})\.(\d{2})$/)
          if (assemblyMatch && `${assemblyMatch[1]}.${assemblyMatch[2]}` === sectionCode) {
            const assemblyNumber = parseInt(assemblyMatch[3], 10)
            console.log(`[CodeGenerator] Processing assembly ${assembly.code}, parsed number: ${assemblyNumber}`)
            if (!isNaN(assemblyNumber) && assemblyNumber > maxAssemblyNumber) {
              maxAssemblyNumber = assemblyNumber
            }
          } else {
            console.log(`[CodeGenerator] Assembly ${assembly.code} does not match pattern or section`)
          }
        }
      }

      console.log(`[CodeGenerator] Maximum assembly number found: ${maxAssemblyNumber}`)

      // Generate next assembly code (increment by 10: 10, 20, 30, etc.)
      const nextAssemblyNumber = maxAssemblyNumber === 0 ? 10 : maxAssemblyNumber + 10
      const generatedCode = `${sectionCode}.${nextAssemblyNumber.toString().padStart(2, '0')}`
      
      console.log(`[CodeGenerator] Generated assembly code: ${generatedCode}`)
      return generatedCode
    } catch (error) {
      console.error(`[CodeGenerator] Unexpected error in generateAssemblyCode:`, error)
      throw error
    }
  }

  /**
   * Generate next available item code (XX.XX.XX.XX format)
   * @param assemblyCode Parent assembly code (e.g., "02.10.10")
   * @returns Promise<string> Next item code (e.g., "02.10.10.01", "02.10.10.02")
   */
  async generateItemCode(assemblyCode: string): Promise<string> {
    console.log(`[CodeGenerator] Generating item code for assembly: ${assemblyCode}`)
    
    // Validate assembly code format
    if (!this.validateAssemblyCode(assemblyCode)) {
      console.error(`[CodeGenerator] Invalid assembly code format: ${assemblyCode}`)
      throw new Error(`Invalid assembly code format: ${assemblyCode}`)
    }

    try {
      // Get existing items for this assembly
      console.log(`[CodeGenerator] Querying items with pattern: ${assemblyCode}.%`)
      const { data: items, error } = await this.supabase
        .from('library_items')
        .select('code')
        .like('code', `${assemblyCode}.%`)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) {
        console.error(`[CodeGenerator] Database error fetching items:`, error)
        throw new Error(`Failed to fetch library items: ${error.message}`)
      }

      console.log(`[CodeGenerator] Found ${items?.length || 0} existing items:`, items?.map(i => i.code) || [])

      // Find the highest item number within this assembly
      let maxItemNumber = 0
      if (items && items.length > 0) {
        for (const item of items) {
          const itemMatch = item.code.match(/^(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/)
          if (itemMatch && `${itemMatch[1]}.${itemMatch[2]}.${itemMatch[3]}` === assemblyCode) {
            const itemNumber = parseInt(itemMatch[4], 10)
            console.log(`[CodeGenerator] Processing item ${item.code}, parsed number: ${itemNumber}`)
            if (!isNaN(itemNumber) && itemNumber > maxItemNumber) {
              maxItemNumber = itemNumber
            }
          } else {
            console.log(`[CodeGenerator] Item ${item.code} does not match pattern or assembly`)
          }
        }
      }

      console.log(`[CodeGenerator] Maximum item number found: ${maxItemNumber}`)

      // Generate next item code (increment by 1: 01, 02, 03, etc.)
      const nextItemNumber = maxItemNumber + 1
      const generatedCode = `${assemblyCode}.${nextItemNumber.toString().padStart(2, '0')}`
      
      console.log(`[CodeGenerator] Generated item code: ${generatedCode}`)
      return generatedCode
    } catch (error) {
      console.error(`[CodeGenerator] Unexpected error in generateItemCode:`, error)
      throw error
    }
  }

  /**
   * Validate division code format (XX)
   * @param code Division code to validate
   * @returns boolean True if valid format
   */
  validateDivisionCode(code: string): boolean {
    return /^\d{2}$/.test(code)
  }

  /**
   * Validate section code format (XX.XX)
   * @param code Section code to validate
   * @returns boolean True if valid format
   */
  validateSectionCode(code: string): boolean {
    return /^\d{2}\.\d{2}$/.test(code)
  }

  /**
   * Validate assembly code format (XX.XX.XX)
   * @param code Assembly code to validate
   * @returns boolean True if valid format
   */
  validateAssemblyCode(code: string): boolean {
    return /^\d{2}\.\d{2}\.\d{2}$/.test(code)
  }

  /**
   * Validate item code format (XX.XX.XX.XX)
   * @param code Item code to validate
   * @returns boolean True if valid format
   */
  validateItemCode(code: string): boolean {
    return /^\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(code)
  }

  /**
   * Validate hierarchy relationship between child and parent codes
   * @param childCode Child code to validate
   * @param parentCode Parent code to validate against
   * @returns boolean True if valid hierarchy
   */
  validateHierarchy(childCode: string, parentCode: string): boolean {
    // Remove trailing dots and normalize
    const child = childCode.trim()
    const parent = parentCode.trim()

    // Child code should start with parent code followed by a dot
    if (!child.startsWith(parent + '.')) {
      return false
    }

    // Validate the level progression
    const childParts = child.split('.')
    const parentParts = parent.split('.')

    // Child should have exactly one more level than parent
    if (childParts.length !== parentParts.length + 1) {
      return false
    }

    // Validate format for each level
    switch (parentParts.length) {
      case 1: // Parent is division, child should be section
        return this.validateSectionCode(child)
      case 2: // Parent is section, child should be assembly
        return this.validateAssemblyCode(child)
      case 3: // Parent is assembly, child should be item
        return this.validateItemCode(child)
      default:
        return false
    }
  }

  /**
   * Check if a code already exists in the database
   * @param code Code to check
   * @param level Hierarchy level (1=division, 2=section, 3=assembly, 4=item)
   * @returns Promise<boolean> True if code exists
   */
  async codeExists(code: string, level: number): Promise<boolean> {
    let tableName: string
    switch (level) {
      case 1:
        tableName = 'divisions'
        break
      case 2:
        tableName = 'sections'
        break
      case 3:
        tableName = 'assemblies'
        break
      case 4:
        tableName = 'library_items'
        break
      default:
        throw new Error(`Invalid hierarchy level: ${level}`)
    }

    const { data, error } = await this.supabase
      .from(tableName)
      .select('id')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check code existence: ${error.message}`)
    }

    return data !== null
  }

  /**
   * Get the hierarchy level from a code
   * @param code Code to analyze
   * @returns number Hierarchy level (1-4) or 0 if invalid
   */
  getCodeLevel(code: string): number {
    const parts = code.split('.')
    if (parts.length >= 1 && parts.length <= 4) {
      // Validate each part is numeric
      for (const part of parts) {
        if (!/^\d{2}$/.test(part)) {
          return 0
        }
      }
      return parts.length
    }
    return 0
  }

  /**
   * Get parent code from a child code
   * @param childCode Child code
   * @returns string Parent code or empty string if no parent
   */
  getParentCode(childCode: string): string {
    const parts = childCode.split('.')
    if (parts.length > 1) {
      return parts.slice(0, -1).join('.')
    }
    return ''
  }

  /**
   * Generate sort order based on code
   * @param code Hierarchy code
   * @returns number Sort order value
   */
  generateSortOrder(code: string): number {
    const parts = code.split('.').map(part => parseInt(part, 10))
    let sortOrder = 0
    
    // Create a composite sort order: XXYYZZAA (where XX=div, YY=sec, ZZ=ass, AA=item)
    for (let i = 0; i < parts.length && i < 4; i++) {
      sortOrder += parts[i] * Math.pow(100, 3 - i)
    }
    
    return sortOrder
  }
}