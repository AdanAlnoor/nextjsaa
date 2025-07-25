'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/lib/utils'
import { Database } from '@/shared/types/supabase'
import { format } from 'date-fns'
import { X, Edit, Trash, FileCheck, FileX, FileText, ChevronLeft } from 'lucide-react'
import { StatusBadge } from '../bills/StatusBadge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { useToast } from '@/shared/components/ui/use-toast'
import { usePurchaseOrderActions } from './hooks/usePurchaseOrderActions'
import { ApprovePurchaseOrderDialog } from './dialogs/ApprovePurchaseOrderDialog'
import { RejectPurchaseOrderDialog } from './dialogs/RejectPurchaseOrderDialog'
import { createClient } from '@/shared/lib/supabase/client'

// Import the Sheet components or create a simpler mobile view
// For now, we'll create a simpler mobile view without the Sheet component
// to avoid import issues

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
    unit_cost: number;
    amount: number;
    internal_note?: string | null;
    cost_control_item_id?: string;
    catalog_item_id?: string;
    cost_control_item?: {
      id: string;
      name: string;
      level?: number;
    } | null;
  }[];
}

interface PurchaseOrderMobileDetailViewProps {
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

export function PurchaseOrderMobileDetailView({
  purchaseOrder,
  onClose,
  userPermissions,
  projectId
}: PurchaseOrderMobileDetailViewProps) {
  const { toast } = useToast()
  const { resubmitPurchaseOrder, convertToBill, isLoading } = usePurchaseOrderActions(projectId)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
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
          items:purchase_order_items(
            *,
            cost_control_item:cost_control_items(
              id,
              name,
              level
            )
          )
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
  
  // Use localPurchaseOrder instead of purchaseOrder for rendering
  const activePO = localPurchaseOrder || purchaseOrder
  
  // Action handlers
  const handleEditPO = () => {
    toast({
      title: "Edit purchase order",
      description: "Edit functionality will be implemented with dialog components",
    })
  }
  
  const handleDeletePO = () => {
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
                className="mt-3 w-full"
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">{activePO.po_number}</h2>
        </div>
        <div className="w-9"></div> {/* Empty space for balance */}
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status and quick actions */}
        <div className="flex justify-between items-center">
          <StatusBadge status={activePO.status} />
          <div className="flex gap-2">
            {userPermissions.canEdit && activePO.status === 'Draft' && (
              <Button size="sm" variant="outline" onClick={handleEditPO}>
                Edit
              </Button>
            )}
            {userPermissions.canApprove && activePO.status === 'Pending' && (
              <Button size="sm" variant="default" onClick={handleApprovePO}>
                Approve
              </Button>
            )}
          </div>
        </div>
        
        {/* General information */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            {activePO.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{activePO.description}</p>
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
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          {item.cost_control_item && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.cost_control_item.name}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{formatCurrency(item.amount)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit} × {formatCurrency(item.unit_cost)}
                      </p>
                      {item.internal_note && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Note: {item.internal_note}
                        </p>
                      )}
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
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Bill Reference</p>
                  <p className="font-medium">{activePO.linked_bill}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
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
      
      {/* Bottom action bar */}
      <div className="p-4 border-t mt-auto">
        <div className="flex flex-col gap-2">
          {userPermissions.canApprove && activePO.status === 'Pending' && (
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                variant="default" 
                onClick={handleApprovePO}
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                className="flex-1" 
                variant="outline" 
                onClick={handleRejectPO}
              >
                <FileX className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
          
          {userPermissions.canConvertToBill && activePO.status === 'Approved' && !activePO.linked_bill && (
            <Button 
              className="w-full" 
              variant="default" 
              onClick={handleConvertToBill}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Convert to Bill
            </Button>
          )}
          
          {userPermissions.isAdmin && (
            <Button 
              className="w-full" 
              variant="destructive" 
              onClick={handleDeletePO}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
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