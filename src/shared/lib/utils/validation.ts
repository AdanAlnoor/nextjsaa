// Validation utilities for the application

import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
export const requiredStringSchema = z.string().min(1, 'This field is required')
export const optionalStringSchema = z.string().optional()
export const numberSchema = z.number().min(0, 'Must be a positive number')
export const positiveNumberSchema = z.number().positive('Must be a positive number')

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success
}

export const validatePassword = (password: string): boolean => {
  return passwordSchema.safeParse(password).success
}

export const validateRequired = (value: string): boolean => {
  return requiredStringSchema.safeParse(value).success
}

export const validateNumber = (value: number): boolean => {
  return numberSchema.safeParse(value).success
}

// Form validation helpers
export const getValidationError = (result: z.SafeParseReturnType<any, any>): string | null => {
  if (!result.success) {
    return result.error.issues[0]?.message || 'Validation error'
  }
  return null
}

export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { 
    success: false, 
    error: result.error.issues[0]?.message || 'Validation failed' 
  }
}

// Library validation class for backward compatibility
export class LibraryValidator {
  static validateDivision(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Division name is required')
    }
    
    if (data.name && data.name.length > 100) {
      errors.push('Division name must be less than 100 characters')
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  static validateSection(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Section name is required')
    }
    
    if (!data.division_code) {
      errors.push('Division code is required')
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  static validateAssembly(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Assembly name is required')
    }
    
    if (!data.section_code) {
      errors.push('Section code is required')
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  static validateItem(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Item name is required')
    }
    
    if (!data.assembly_code) {
      errors.push('Assembly code is required')
    }
    
    if (!data.unit || data.unit.trim().length === 0) {
      errors.push('Unit is required')
    }
    
    if (data.base_rate && isNaN(parseFloat(data.base_rate))) {
      errors.push('Base rate must be a valid number')
    }
    
    return { valid: errors.length === 0, errors }
  }
}