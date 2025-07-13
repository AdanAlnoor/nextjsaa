'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { usePurchaseOrderActions } from '../hooks/usePurchaseOrderActions'

interface ApprovePurchaseOrderDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  poId: string
  poNumber: string
  projectId: string
}

export function ApprovePurchaseOrderDialog({
  isOpen,
  onClose,
  onSuccess,
  poId,
  poNumber,
  projectId
}: ApprovePurchaseOrderDialogProps) {
  const [approvalNotes, setApprovalNotes] = useState('')
  const { approvePurchaseOrder, isLoading } = usePurchaseOrderActions(projectId)
  
  const handleApprove = async () => {
    const result = await approvePurchaseOrder(poId, approvalNotes)
    
    if (result.success) {
      setApprovalNotes('')
      onSuccess()
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Purchase Order</DialogTitle>
          <DialogDescription>
            You are about to approve purchase order <strong>{poNumber}</strong>.
            This will allow the purchase to proceed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 my-4">
          <div className="grid gap-2">
            <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
            <Textarea
              id="approval-notes"
              placeholder="Add any notes or comments about this approval"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              'Confirm Approval'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 