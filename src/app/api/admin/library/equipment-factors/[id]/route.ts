import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const factorId = params.id

    // Verify factor exists and get library item info for tracking
    const { data: factor, error: factorError } = await supabase
      .from('equipment_factors')
      .select('id, library_item_id, equipment_code, equipment_name')
      .eq('id', factorId)
      .single()

    if (factorError) {
      if (factorError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Equipment factor not found' }, { status: 404 })
      }
      console.error('Error verifying equipment factor:', factorError)
      return NextResponse.json(
        { error: 'Failed to verify equipment factor' }, 
        { status: 500 }
      )
    }

    // Delete the factor
    const { error: deleteError } = await supabase
      .from('equipment_factors')
      .delete()
      .eq('id', factorId)

    if (deleteError) {
      console.error('Error deleting equipment factor:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete equipment factor' }, 
        { status: 500 }
      )
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: factor.library_item_id,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ 
        action: 'remove_equipment_factor',
        equipment_code: factor.equipment_code,
        equipment_name: factor.equipment_name
      })
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error in equipment factor deletion API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}