import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import type { ConfirmLibraryItemRequest } from '@/library/types/library'

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
    const { confirmationNotes }: ConfirmLibraryItemRequest = await request.json()

    // Use the database function to confirm the item
    const { data: result, error: confirmError } = await supabase.rpc('confirm_library_item', {
      p_library_item_id: itemId,
      p_confirmed_by: user.email || user.id,
      p_confirmation_notes: confirmationNotes || null
    })

    if (confirmError) {
      console.error('Error confirming library item:', confirmError)
      
      // Handle specific error messages from the function
      if (confirmError.message?.includes('not found')) {
        return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
      }
      
      if (confirmError.message?.includes('complete status')) {
        return NextResponse.json(
          { error: 'Item must be in complete status to confirm' }, 
          { status: 400 }
        )
      }
      
      if (confirmError.message?.includes('without any factors')) {
        return NextResponse.json(
          { error: 'Cannot confirm item without any factors' }, 
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to confirm library item' }, 
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
        confirmed_at,
        confirmed_by,
        last_modified
      `)
      .eq('id', itemId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated item:', fetchError)
      return NextResponse.json(
        { error: 'Item confirmed but failed to retrieve updated data' }, 
        { status: 207 } // Multi-status - partial success
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Library item confirmed successfully',
      item: updatedItem
    })

  } catch (error) {
    console.error('Unexpected error in library item confirmation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}