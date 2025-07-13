import { createClient } from '@/shared/lib/supabase/client'
import fs from 'fs'
import path from 'path'

/**
 * Executes an SQL script to install database objects like triggers and functions
 * Note: This requires database admin privileges
 * @param scriptName The name of the script to execute (from the sql directory)
 * @returns Result of the operation
 */
export async function executeSqlScript(scriptName: string): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const supabase = createClient()
  
  try {
    // Read the SQL file
    const scriptPath = path.join(process.cwd(), 'src', 'sql', scriptName)
    const sqlContent = fs.readFileSync(scriptPath, 'utf8')
    
    // Execute the SQL using rpc function (requires a stored procedure on Supabase)
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_statement: sqlContent
    })
    
    if (error) {
      throw new Error(`Failed to execute SQL: ${error.message}`)
    }
    
    return {
      success: true,
      message: `Successfully executed SQL script: ${scriptName}`
    }
  } catch (error) {
    console.error(`Failed to execute SQL script ${scriptName}:`, error)
    return {
      success: false,
      message: `Failed to execute SQL script: ${scriptName}`,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Calls a database stored procedure to set up the triggers for preventing duplicates
 * This is an alternative to executeSqlScript that doesn't require reading files on the client
 * @returns Result of the operation
 */
export async function setupDedupeTriggers(): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const supabase = createClient()
  
  try {
    // Call the stored procedure that sets up the triggers
    const { data, error } = await supabase.rpc('setup_dedupe_triggers')
    
    if (error) {
      throw new Error(`Failed to set up dedupe triggers: ${error.message}`)
    }
    
    return {
      success: true,
      message: 'Successfully set up deduplication triggers'
    }
  } catch (error) {
    console.error('Failed to set up dedupe triggers:', error)
    return {
      success: false,
      message: 'Failed to set up deduplication triggers',
      error: error instanceof Error ? error.message : String(error)
    }
  }
} 