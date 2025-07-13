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
      .from('labor_factors')
      .select('id, library_item_id, labor_code, labor_name')
      .eq('id', factorId)
      .single()

    if (factorError) {
      if (factorError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Labor factor not found' }, { status: 404 })
      }
      console.error('Error verifying labor factor:', factorError)
      return NextResponse.json(
        { error: 'Failed to verify labor factor' }, 
        { status: 500 }
      )
    }

    // Delete the factor
    const { error: deleteError } = await supabase
      .from('labor_factors')
      .delete()
      .eq('id', factorId)

    if (deleteError) {
      console.error('Error deleting labor factor:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete labor factor' }, 
        { status: 500 }
      )
    }

    // Track usage
    await supabase.rpc('track_library_item_usage', {
      p_library_item_id: factor.library_item_id,
      p_user_id: user.id,
      p_usage_type: 'edit',
      p_metadata: JSON.stringify({ 
        action: 'remove_labor_factor',
        labor_code: factor.labor_code,
        labor_name: factor.labor_name
      })
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Unexpected error in labor factor deletion API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}