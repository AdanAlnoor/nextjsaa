'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Database } from '@/types/supabase'
import { format } from 'date-fns'
import { X, Edit, Trash, FileCheck, FileX, FileText } from 'lucide-react'
import { StatusBadge } from '../bills/StatusBadge'
import { BillDetailSkeleton } from '../bills/SkeletonLoaders'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { usePurchaseOrderActions } from './hooks/usePurchaseOrderActions'
import { ApprovePurchaseOrderDialog } from './dialogs/ApprovePurchaseOrderDialog'
import { RejectPurchaseOrderDialog } from './dialogs/RejectPurchaseOrderDialog'
import { createClient } from '@/utils/supabase/client'

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  approval_date: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  rejection_date: string | null;
  linked_bill?: string | null;
  supplier?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  items?: {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    amount: number;
    internal_note?: string | null;
  }[];
}

interface PurchaseOrderDetailViewProps {
  purchaseOrder: PurchaseOrder
  onClose: () => void
  userPermissions: {
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canApprove: boolean
    canConvertToBill: boolean
    isAdmin: boolean
  }
  projectId: string
}

export function PurchaseOrderDetailView({
  purchaseOrder,
  onClose,
  userPermissions,
  projectId
}: PurchaseOrderDetailViewProps) {
  const { toast } = useToast()
  const { resubmitPurchaseOrder, convertToBill, isLoading } = usePurchaseOrderActions(projectId)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [localPurchaseOrder, setLocalPurchaseOrder] = useState<PurchaseOrder>(purchaseOrder)
  
  // Function to refresh PO data
  const refreshPurchaseOrderData = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:assigned_to,
          items:purchase_order_items(*)
        `)
        .eq('id', purchaseOrder.id)
        .single()
        
      if (error) throw error
      if (data) {
        setLocalPurchaseOrder(data as PurchaseOrder)
      }
    } catch (error) {
      console.error('Error refreshing purchase order data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh purchase order data",
        variant: "destructive",
      })
    }
  }
  
  if (!purchaseOrder) {
    return <BillDetailSkeleton />
  }
  
  // Use localPurchaseOrder instead of purchaseOrder for rendering
  const activePO = localPurchaseOrder || purchaseOrder
  
  const handleEditPO = () => {
    // Will be implemented with dialog components
    toast({
      title: "Edit purchase order",
      description: "Edit functionality will be implemented with dialog components",
    })
  }
  
  const handleDeletePO = () => {
    // Will be implemented with dialog components
    toast({
      title: "Delete purchase order",
      description: "Delete functionality will be implemented with dialog components",
    })
  }
  
  const handleApprovePO = () => {
    setIsApproveDialogOpen(true)
  }
  
  const handleRejectPO = () => {
    setIsRejectDialogOpen(true)
  }
  
  const handleResubmitPO = async () => {
    const result = await resubmitPurchaseOrder(activePO.id)
    if (result.success) {
      toast({
        title: "Success",
        description: "Purchase order has been resubmitted for approval",
      })
      await refreshPurchaseOrderData()
    }
  }
  
  const handleConvertToBill = () => {
    convertToBill(activePO.id, {})
  }
  
  // Render approval/rejection history based on status
  const renderStatusHistory = () => {
    if (activePO.status === 'Approved' && activePO.approval_date) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Approval Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Approved Date</p>
              <p className="font-medium">{format(new Date(activePO.approval_date), 'MMM d, yyyy')}</p>
            </div>
            {activePO.approval_notes && (
              <div>
                <p className="text-sm text-muted-foreground">Approval Notes</p>
                <p>{activePO.approval_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )
    }
    
    if (activePO.status === 'Rejected' && activePO.rejection_date) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Rejection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Rejected Date</p>
              <p className="font-medium">{format(new Date(activePO.rejection_date), 'MMM d, yyyy')}</p>
            </div>
            {activePO.rejection_reason && (
              <div>
                <p className="text-sm text-muted-foreground">Rejection Reason</p>
                <p>{activePO.rejection_reason}</p>
              </div>
            )}
            {userPermissions.canEdit && (
              <Button 
                onClick={handleResubmitPO} 
                variant="outline" 
                size="sm"
                className="mt-3"
                disabled={isLoading}
              >
                Revise & Resubmit
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }
    
    return null
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
        <div>
          <h2 className="text-lg font-semibold">{activePO.po_number}</h2>
          <p className="text-sm text-muted-foreground">{activePO.name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Status and actions */}
        <div className="flex justify-between items-center">
          <StatusBadge status={activePO.status} />
          <div className="flex gap-2">
            {userPermissions.canEdit && activePO.status === 'Draft' && (
              <Button size="sm" variant="outline" onClick={handleEditPO}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {userPermissions.canApprove && activePO.status === 'Pending' && (
              <>
                <Button size="sm" variant="default" onClick={handleApprovePO}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={handleRejectPO}>
                  <FileX className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {userPermissions.canConvertToBill && activePO.status === 'Approved' && !activePO.linked_bill && (
              <Button size="sm" variant="default" onClick={handleConvertToBill} disabled={isLoading}>
                <FileText className="h-4 w-4 mr-2" />
                Convert to Bill
              </Button>
            )}
            {userPermissions.isAdmin && (
              <Button size="sm" variant="destructive" onClick={handleDeletePO}>
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
        
        {/* General information */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{activePO.supplier?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Created</p>
                <p className="font-medium">
                  {activePO.created_at ? format(new Date(activePO.created_at), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">{formatCurrency(activePO.total || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={activePO.status} />
              </div>
            </div>
            
            {activePO.description && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{activePO.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Status history */}
        {renderStatusHistory()}
        
        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            {activePO.items && activePO.items.length > 0 ? (
              <div className="space-y-4">
                {activePO.items.map((item) => (
                  <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × {formatCurrency(item.price)}
                        </p>
                        {item.internal_note && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Note: {item.internal_note}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No items found for this purchase order.</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <p className="font-medium">Total</p>
            <p className="font-bold">{formatCurrency(activePO.total || 0)}</p>
          </CardFooter>
        </Card>
        
        {/* Linked Bill Information */}
        {activePO.linked_bill && (
          <Card>
            <CardHeader>
              <CardTitle>Linked Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bill Reference</p>
                  <p className="font-medium">{activePO.linked_bill}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: "View bill",
                    description: "Navigate to bill functionality will be implemented",
                  })
                }}>
                  View Bill
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Approval Dialog */}
      <ApprovePurchaseOrderDialog 
        isOpen={isApproveDialogOpen}
        onClose={() => setIsApproveDialogOpen(false)}
        onSuccess={() => {
          toast({
            title: "Success",
            description: "Purchase order has been approved",
          })
          refreshPurchaseOrderData()
        }}
        poId={activePO.id}
        poNumber={activePO.po_number}
        projectId={projectId}
      />
      
      {/* Rejection Dialog */}
      <RejectPurchaseOrderDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onSuccess={() => {
          toast({
            title: "Success",
            description: "Purchase order has been rejected",
          })
          refreshPurchaseOrderData()
        }}
        poId={activePO.id}
        poNumber={activePO.po_number}
        projectId={projectId}
      />
    </div>
  )
} 