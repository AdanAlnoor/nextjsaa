import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(
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

    const itemId = params.id

    // Use the database function to mark the item as complete
    const { data: result, error: markCompleteError } = await supabase.rpc('mark_library_item_complete', {
      p_library_item_id: itemId,
      p_marked_by: user.email || user.id
    })

    if (markCompleteError) {
      console.error('Error marking library item as complete:', markCompleteError)
      
      // Handle specific error messages from the function
      if (markCompleteError.message?.includes('not found')) {
        return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
      }
      
      if (markCompleteError.message?.includes('draft status')) {
        return NextResponse.json(
          { error: 'Item must be in draft status to mark as complete' }, 
          { status: 400 }
        )
      }
      
      if (markCompleteError.message?.includes('without any factors')) {
        return NextResponse.json(
          { error: 'Cannot mark item as complete without any factors' }, 
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to mark library item as complete' }, 
        { status: 500 }
      )
    }

    // Fetch the updated item to return
    const { data: updatedItem, error: fetchError } = await supabase
      .from('library_items')
      .select(`
        id,
        code,
        name,
        status,
        last_modified
      `)
      .eq('id', itemId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated item:', fetchError)
      return NextResponse.json(
        { error: 'Item marked as complete but failed to retrieve updated data' }, 
        { status: 207 } // Multi-status - partial success
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Library item marked as complete successfully',
      item: updatedItem
    })

  } catch (error) {
    console.error('Unexpected error in mark complete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}