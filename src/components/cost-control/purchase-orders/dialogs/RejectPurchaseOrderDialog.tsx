'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { usePurchaseOrderActions } from '../hooks/usePurchaseOrderActions'

interface RejectPurchaseOrderDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  poId: string
  poNumber: string
  projectId: string
}

export function RejectPurchaseOrderDialog({
  isOpen,
  onClose,
  onSuccess,
  poId,
  poNumber,
  projectId
}: RejectPurchaseOrderDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')
  const { rejectPurchaseOrder, isLoading } = usePurchaseOrderActions(projectId)
  
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }
    
    const result = await rejectPurchaseOrder(poId, rejectionReason)
    
    if (result.success) {
      setRejectionReason('')
      setError('')
      onSuccess()
      onClose()
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Purchase Order</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to reject purchase order <strong>{poNumber}</strong>.
            This will prevent the purchase from proceeding until it is revised and resubmitted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 my-4">
          <div className="grid gap-2">
            <Label htmlFor="rejection-reason" className="text-red-700">
              Reason for Rejection <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Please provide a reason for rejecting this purchase order"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value)
                if (e.target.value.trim()) {
                  setError('')
                }
              }}
              className={`min-h-[100px] ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`}
            />
            {error && (
              <p className="text-sm font-medium text-red-500">
                {error}
              </p>
            )}
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleReject()
            }}
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading || !rejectionReason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              'Confirm Rejection'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 