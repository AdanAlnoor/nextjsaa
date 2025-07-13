'use client'

import { useState } from 'react'
import { useToast } from '@/shared/components/ui/use-toast'
import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/shared/types/supabase'
import { useRouter } from 'next/navigation'
import { 
  PurchaseOrderStatus, 
  canTransitionTo, 
  getNextStatuses,
  UserPermissions,
  getAvailableActions 
} from '@/features/cost-control/types/purchaseOrder'

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row']
type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row']

interface CreatePOData {
  po_number: string
  name: string
  supplier: string
  supplier_id?: string
  description?: string
  total: number
  status: PurchaseOrderStatus
  items: {
    description: string
    quantity: number
    unit: string
    price: number
    amount: number
    internal_note?: string
    cost_control_item_id?: string
    budget_validation_override?: boolean
    override_reason?: string
    catalog_item_id?: string
  }[]
}

export function usePurchaseOrderActions(projectId: string) {
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Create a new purchase order
  const createPurchaseOrder = async (data: CreatePOData) => {
    try {
      setIsLoading(true)
      
      // Insert the purchase order
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          project_id: projectId,
          po_number: data.po_number,
          name: data.name,
          assigned_to: data.supplier || 'TBD', // Keep for legacy compatibility
          supplier_id: data.supplier_id || null,
          supplier: data.supplier,
          description: data.description || null,
          total: data.total,
          status: data.status,
        })
        .select()
      
      if (poError) throw poError
      if (!poData || poData.length === 0) throw new Error('No purchase order created')
      
      const poId = poData[0].id
      
      // Insert purchase order items
      const itemsToInsert = data.items.map(item => ({
        purchase_order_id: poId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.price,
        amount: item.amount,
        internal_note: item.internal_note || null,
        cost_control_item_id: item.cost_control_item_id || null,
        budget_validation_override: item.budget_validation_override || false,
        override_reason: item.override_reason || null,
        catalog_item_id: item.catalog_item_id || null,
      }))
      
      console.log('Inserting purchase order items:', itemsToInsert)
      
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert)
      
      if (itemsError) throw itemsError
      
      toast({
        title: 'Success',
        description: 'Purchase order created successfully',
      })
      
      return { success: true, id: poId }
    } catch (error) {
      console.error('Error creating purchase order:', error)
      
      // Handle specific error types
      let errorMessage = 'Failed to create purchase order'
      if (error && typeof error === 'object' && 'message' in error) {
        const errorStr = error.message as string
        if (errorStr.includes('foreign key constraint')) {
          errorMessage = 'Invalid catalog item or cost control item selected'
        } else if (errorStr.includes('duplicate key')) {
          errorMessage = 'Purchase order number already exists'
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Update an existing purchase order
  const updatePurchaseOrder = async (poId: string, data: Partial<CreatePOData>) => {
    try {
      setIsLoading(true)
      
      // Update the purchase order
      const updateData: any = {}
      if (data.po_number) updateData.po_number = data.po_number
      if (data.name) updateData.name = data.name
      if (data.supplier) {
        updateData.assigned_to = data.supplier  // Keep for legacy compatibility
        updateData.supplier = data.supplier
      }
      if (data.supplier_id !== undefined) updateData.supplier_id = data.supplier_id
      if (data.description !== undefined) updateData.description = data.description || null
      if (data.total) updateData.total = data.total
      if (data.status) updateData.status = data.status
      
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', poId)
      
      if (poError) throw poError
      
      // If items are provided, handle them
      if (data.items) {
        // First get existing items
        const { data: existingItems, error: fetchError } = await supabase
          .from('purchase_order_items')
          .select('id')
          .eq('purchase_order_id', poId)
        
        if (fetchError) throw fetchError
        
        // Delete existing items
        if (existingItems && existingItems.length > 0) {
          const { error: deleteError } = await supabase
            .from('purchase_order_items')
            .delete()
            .eq('purchase_order_id', poId)
          
          if (deleteError) throw deleteError
        }
        
        // Insert new items
        const itemsToInsert = data.items.map(item => ({
          purchase_order_id: poId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.price,
          amount: item.amount,
          internal_note: item.internal_note || null,
          cost_control_item_id: item.cost_control_item_id || null,
          budget_validation_override: item.budget_validation_override || false,
          override_reason: item.override_reason || null,
          catalog_item_id: item.catalog_item_id || null,
        }))
        
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert)
        
        if (itemsError) throw itemsError
      }
      
      toast({
        title: 'Success',
        description: 'Purchase order updated successfully',
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error updating purchase order:', error)
      toast({
        title: 'Error',
        description: 'Failed to update purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Delete a purchase order
  const deletePurchaseOrder = async (poId: string) => {
    try {
      setIsLoading(true)
      
      // Delete all items first (cascade should handle this, but being explicit)
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', poId)
      
      if (itemsError) throw itemsError
      
      // Delete the purchase order
      const { error: poError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId)
      
      if (poError) throw poError
      
      toast({
        title: 'Success',
        description: 'Purchase order deleted successfully',
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Approve a purchase order
  const approvePurchaseOrder = async (poId: string, notes?: string) => {
    try {
      setIsLoading(true)
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Approved',
          approval_date: now,
          approval_notes: notes || null,
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Purchase Order Approved',
        description: 'The purchase order has been successfully approved',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error approving purchase order:', error)
      toast({
        title: 'Approval Failed',
        description: 'There was an error approving the purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Reject a purchase order
  const rejectPurchaseOrder = async (poId: string, reason: string) => {
    try {
      setIsLoading(true)
      
      if (!reason.trim()) {
        toast({
          title: 'Rejection Reason Required',
          description: 'Please provide a reason for rejecting this purchase order',
          variant: 'destructive',
        })
        return { success: false, error: 'Rejection reason required' }
      }
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Rejected',
          rejection_date: now,
          rejection_reason: reason,
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Purchase Order Rejected',
        description: 'The purchase order has been rejected',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error rejecting purchase order:', error)
      toast({
        title: 'Rejection Failed',
        description: 'There was an error rejecting the purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Resubmit a rejected purchase order
  const resubmitPurchaseOrder = async (poId: string) => {
    try {
      setIsLoading(true)
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Pending',
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Purchase Order Resubmitted',
        description: 'The purchase order has been resubmitted for approval',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error resubmitting purchase order:', error)
      toast({
        title: 'Resubmission Failed',
        description: 'There was an error resubmitting the purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Convert a PO to a bill
  const convertToBill = async (poId: string, _billData?: any) => {
    try {
      setIsLoading(true)
      
      // Navigate to the bills tab with the PO ID as a query parameter
      // This triggers the bill creation flow in the bills tab
      router.push(`/projects/${projectId}/cost-control/bills?po=${poId}`)
      
      return { success: true }
    } catch (error) {
      console.error('Error navigating to convert PO to bill:', error)
      toast({
        title: 'Navigation Error',
        description: 'Failed to navigate to bill creation',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Enhanced status transition methods
  
  // Submit for review (Draft -> Pending Review)
  const submitForReview = async (poId: string) => {
    return await updatePurchaseOrderStatus(
      poId, 
      PurchaseOrderStatus.PENDING_REVIEW,
      'Purchase order submitted for review'
    )
  }
  
  // Approve review (Pending Review -> Pending Approval)
  const approveReview = async (poId: string, reviewerId: string, notes?: string) => {
    try {
      setIsLoading(true)
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: PurchaseOrderStatus.PENDING_APPROVAL,
          reviewer_id: reviewerId,
          review_date: now,
          review_notes: notes || null,
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Review Approved',
        description: 'Purchase order has been approved for final approval',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error approving review:', error)
      toast({
        title: 'Review Approval Failed',
        description: 'There was an error approving the review',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Request revision (Pending Review/Approval -> Revision Required)
  const requestRevision = async (poId: string, reason: string, reviewerId?: string) => {
    try {
      setIsLoading(true)
      
      if (!reason.trim()) {
        toast({
          title: 'Revision Reason Required',
          description: 'Please provide a reason for requesting revision',
          variant: 'destructive',
        })
        return { success: false, error: 'Revision reason required' }
      }
      
      const now = new Date().toISOString()
      const updateData: any = {
        status: PurchaseOrderStatus.REVISION_REQUIRED,
        rejection_reason: reason,
        rejection_date: now,
        updated_at: now
      }
      
      if (reviewerId) {
        updateData.reviewer_id = reviewerId
      }
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Revision Requested',
        description: 'Purchase order has been sent back for revision',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error requesting revision:', error)
      toast({
        title: 'Request Revision Failed',
        description: 'There was an error requesting revision',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Withdraw purchase order
  const withdrawPurchaseOrder = async (poId: string, withdrawnBy: string, reason?: string) => {
    try {
      setIsLoading(true)
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: PurchaseOrderStatus.DRAFT,
          withdrawn_at: now,
          withdrawn_by: withdrawnBy,
          rejection_reason: reason || 'Withdrawn by creator',
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Purchase Order Withdrawn',
        description: 'Purchase order has been withdrawn and returned to draft',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error withdrawing purchase order:', error)
      toast({
        title: 'Withdrawal Failed',
        description: 'There was an error withdrawing the purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Cancel purchase order
  const cancelPurchaseOrder = async (poId: string, cancelledBy: string, reason: string) => {
    try {
      setIsLoading(true)
      
      if (!reason.trim()) {
        toast({
          title: 'Cancellation Reason Required',
          description: 'Please provide a reason for cancelling this purchase order',
          variant: 'destructive',
        })
        return { success: false, error: 'Cancellation reason required' }
      }
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: PurchaseOrderStatus.CANCELLED,
          cancelled_at: now,
          cancelled_by: cancelledBy,
          cancellation_reason: reason,
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Purchase Order Cancelled',
        description: 'Purchase order has been cancelled',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error cancelling purchase order:', error)
      toast({
        title: 'Cancellation Failed',
        description: 'There was an error cancelling the purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Generic status update method
  const updatePurchaseOrderStatus = async (
    poId: string, 
    newStatus: PurchaseOrderStatus, 
    notes?: string
  ) => {
    try {
      setIsLoading(true)
      
      // Get current status first
      const { data: currentPO, error: fetchError } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('id', poId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Validate transition
      if (!canTransitionTo(currentPO.status, newStatus)) {
        toast({
          title: 'Invalid Status Transition',
          description: `Cannot transition from ${currentPO.status} to ${newStatus}`,
          variant: 'destructive',
        })
        return { success: false, error: 'Invalid status transition' }
      }
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Status Updated',
        description: `Purchase order status updated to ${newStatus}`,
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error updating purchase order status:', error)
      toast({
        title: 'Status Update Failed',
        description: 'There was an error updating the purchase order status',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Get available actions for a purchase order
  const getActionsForPO = (status: string, permissions: UserPermissions): string[] => {
    return getAvailableActions(status, permissions)
  }
  
  // Get next possible statuses
  const getNextPossibleStatuses = (currentStatus: string): string[] => {
    return getNextStatuses(currentStatus)
  }
  
  // Enhanced approve method (update existing)
  const enhancedApprovePurchaseOrder = async (poId: string, approverId: string, notes?: string) => {
    try {
      setIsLoading(true)
      
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: PurchaseOrderStatus.APPROVED,
          approval_date: now,
          approval_notes: notes || null,
          approver_id: approverId,
          updated_at: now
        })
        .eq('id', poId)
        .select()
      
      if (error) throw error
      
      toast({
        title: 'Purchase Order Approved',
        description: 'The purchase order has been successfully approved',
      })
      
      return { success: true, data }
    } catch (error) {
      console.error('Error approving purchase order:', error)
      toast({
        title: 'Approval Failed',
        description: 'There was an error approving the purchase order',
        variant: 'destructive',
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    approvePurchaseOrder,
    enhancedApprovePurchaseOrder,
    rejectPurchaseOrder,
    resubmitPurchaseOrder,
    convertToBill,
    
    // Enhanced status methods
    submitForReview,
    approveReview,
    requestRevision,
    withdrawPurchaseOrder,
    cancelPurchaseOrder,
    updatePurchaseOrderStatus,
    
    // Utility methods
    getActionsForPO,
    getNextPossibleStatuses,
    
    isLoading,
  }
} 