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

    // Check if migration is already applied
    const { data: checkData, error: checkError } = await supabase
      .from('material_catalogue')
      .select('*')
      .limit(1)

    if (checkError) {
      return NextResponse.json({ 
        error: 'Cannot access material_catalogue table. Please ensure library foundation migration is applied first.' 
      }, { status: 500 })
    }

    // Check if work_category column exists
    const firstRow = checkData?.[0]
    if (firstRow && 'work_category' in firstRow) {
      return NextResponse.json({ 
        success: true, 
        message: 'Migration already applied',
        details: ['work_category columns already exist in catalogue tables']
      })
    }

    // Apply migration using ALTER TABLE statements
    const migrationSteps = []

    try {
      // Step 1: Add work_category columns
      migrationSteps.push('Adding work_category column to material_catalogue')
      await supabase.rpc('exec_raw_sql', { 
        query: 'ALTER TABLE material_catalogue ADD COLUMN work_category VARCHAR(50)' 
      })

      migrationSteps.push('Adding work_category column to labor_catalogue')
      await supabase.rpc('exec_raw_sql', { 
        query: 'ALTER TABLE labor_catalogue ADD COLUMN work_category VARCHAR(50)' 
      })

      migrationSteps.push('Adding work_category column to equipment_catalogue')
      await supabase.rpc('exec_raw_sql', { 
        query: 'ALTER TABLE equipment_catalogue ADD COLUMN work_category VARCHAR(50)' 
      })

      // Step 2: Create indexes
      migrationSteps.push('Creating performance indexes')
      await supabase.rpc('exec_raw_sql', { 
        query: 'CREATE INDEX idx_material_catalogue_work_category ON material_catalogue(work_category)' 
      })
      await supabase.rpc('exec_raw_sql', { 
        query: 'CREATE INDEX idx_labor_catalogue_work_category ON labor_catalogue(work_category)' 
      })
      await supabase.rpc('exec_raw_sql', { 
        query: 'CREATE INDEX idx_equipment_catalogue_work_category ON equipment_catalogue(work_category)' 
      })

      // Step 3: Set default values
      migrationSteps.push('Setting default values for existing records')
      await supabase
        .from('material_catalogue')
        .update({ work_category: 'General Construction' })
        .is('work_category', null)

      await supabase
        .from('labor_catalogue')
        .update({ work_category: 'General Construction' })
        .is('work_category', null)

      await supabase
        .from('equipment_catalogue')
        .update({ work_category: 'General Construction' })
        .is('work_category', null)

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        details: [
          'Added work_category column to all catalogue tables',
          'Created performance indexes for filtering',
          'Set default values for existing records',
          'Catalogue management now supports work categories'
        ]
      })

    } catch (migrationError: any) {
      return NextResponse.json({
        success: false,
        error: `Migration failed at step: ${migrationSteps[migrationSteps.length - 1]}`,
        details: [migrationError.message],
        suggestion: 'Try applying the migration manually via Supabase dashboard'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      suggestion: 'Check server logs for details'
    }, { status: 500 })
  }
}