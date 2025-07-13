'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { formatCurrency } from '@/shared/lib/utils'
import { Database } from '@/shared/types/supabase'
import { format } from 'date-fns'
import { X, Edit, Trash, FileCheck, FileX, FileText, Building2, Target, Package, AlertTriangle, CheckCircle, ChevronRight, ChevronDown, Calendar, User, DollarSign, Activity, Send, RotateCcw, XCircle, Eye } from 'lucide-react'
import { StatusBadge } from '../bills/StatusBadge'
import { BillDetailSkeleton } from '../bills/SkeletonLoaders'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { useToast } from '@/shared/components/ui/use-toast'
import { usePurchaseOrderActions } from './hooks/usePurchaseOrderActions'
import { ApprovePurchaseOrderDialog } from './dialogs/ApprovePurchaseOrderDialog'
import { RejectPurchaseOrderDialog } from './dialogs/RejectPurchaseOrderDialog'
import { EditPurchaseOrderDialog } from './dialogs/EditPurchaseOrderDialog'
import { createClient } from '@/shared/lib/supabase/client'
import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'
import { StatusHistoryTracker } from './StatusHistoryTracker'
import { 
  PurchaseOrderStatus, 
  UserPermissions as POUserPermissions, 
  STATUS_INFO,
  isTerminalStatus,
  requiresAction 
} from '@/features/cost-control/types/purchaseOrder'

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
    cost_control_items?: {
      id: string;
      name: string;
      level?: number;
      bo_amount?: number;
      actual_amount?: number;
      parent_id?: string | null;
    } | null;
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
  const { 
    resubmitPurchaseOrder, 
    convertToBill, 
    isLoading,
    submitForReview,
    approveReview,
    requestRevision,
    withdrawPurchaseOrder,
    cancelPurchaseOrder,
    getActionsForPO
  } = usePurchaseOrderActions(projectId)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [localPurchaseOrder, setLocalPurchaseOrder] = useState<PurchaseOrder>(purchaseOrder)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Convert userPermissions to POUserPermissions format
  const poPermissions: POUserPermissions = {
    ...userPermissions,
    canReview: userPermissions.canApprove, // For now, approvers can also review
    isCreator: false, // Would need to check if current user created this PO
    canWithdraw: userPermissions.canEdit
  }
  
  // Function to refresh PO data
  const refreshPurchaseOrderData = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(
            id,
            name,
            email,
            phone,
            address
          ),
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

  // Helper functions for enhanced display
  const getLevelColor = (level?: number) => {
    switch (level) {
      case 0: return 'bg-blue-100 text-blue-800 border-blue-200'
      case 1: return 'bg-green-100 text-green-800 border-green-200'
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLevelIcon = (level?: number) => {
    switch (level) {
      case 0: return <Building2 className="h-3 w-3" />
      case 1: return <Target className="h-3 w-3" />
      case 2: return <Package className="h-3 w-3" />
      default: return <Package className="h-3 w-3" />
    }
  }

  const getLevelLabel = (level?: number) => {
    switch (level) {
      case 0: return 'Structure'
      case 1: return 'Element'
      case 2: return 'Detail Item'
      default: return 'Item'
    }
  }

  // Group items by cost control structure
  const groupedItems = activePO.items?.reduce((groups, item) => {
    const costControl = item.cost_control_items
    if (costControl) {
      const key = `${costControl.level}-${costControl.id}`
      if (!groups[key]) {
        groups[key] = {
          costControl,
          items: []
        }
      }
      groups[key].items.push(item)
    } else {
      if (!groups['ungrouped']) {
        groups['ungrouped'] = {
          costControl: null,
          items: []
        }
      }
      groups['ungrouped'].items.push(item)
    }
    return groups
  }, {} as Record<string, { costControl: any, items: any[] }>)

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  // Calculate budget utilization
  const getBudgetUtilization = (costControl: any) => {
    if (!costControl?.bo_amount || costControl.bo_amount === 0) return 0
    return ((costControl.actual_amount || 0) / costControl.bo_amount) * 100
  }
  
  const handleEditPO = () => {
    setIsEditDialogOpen(true)
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
  
  // Enhanced action handlers
  const handleSubmitForReview = async () => {
    const result = await submitForReview(activePO.id)
    if (result.success) {
      await refreshPurchaseOrderData()
    }
  }
  
  const handleApproveReview = async () => {
    const result = await approveReview(activePO.id, 'current-user-id') // Would get from auth
    if (result.success) {
      await refreshPurchaseOrderData()
    }
  }
  
  const handleRequestRevision = async () => {
    // Would show a dialog to get revision reason
    const reason = prompt('Please provide a reason for requesting revision:')
    if (reason) {
      const result = await requestRevision(activePO.id, reason)
      if (result.success) {
        await refreshPurchaseOrderData()
      }
    }
  }
  
  const handleWithdraw = async () => {
    const result = await withdrawPurchaseOrder(activePO.id, 'current-user-id')
    if (result.success) {
      await refreshPurchaseOrderData()
    }
  }
  
  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancelling this purchase order:')
    if (reason) {
      const result = await cancelPurchaseOrder(activePO.id, 'current-user-id', reason)
      if (result.success) {
        await refreshPurchaseOrderData()
      }
    }
  }
  
  // Get available actions for current status and permissions
  const availableActions = getActionsForPO(activePO.status, poPermissions)
  
  // Get status info for enhanced display
  const statusInfo = STATUS_INFO[activePO.status] || STATUS_INFO[PurchaseOrderStatus.DRAFT]
  
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
    <div className="h-full flex flex-col bg-gray-50/30">
      {/* Enhanced Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{activePO.po_number}</h1>
                <StatusBadge status={activePO.status} />
              </div>
              <p className="text-base text-gray-600">{activePO.name}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created {activePO.created_at ? format(new Date(activePO.created_at), 'MMM d, yyyy') : 'N/A'}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{activePO.supplier?.name || 'No supplier assigned'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(activePO.total || 0)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="mt-1">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(activePO.total || 0)}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Items Count</p>
                  <p className="text-xl font-bold text-gray-900">{activePO.items?.length || 0}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cost Elements</p>
                  <p className="text-xl font-bold text-gray-900">{Object.keys(groupedItems || {}).length}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status Progress</p>
                  <p className="text-xl font-bold text-gray-900">
                    {activePO.status === 'Draft' ? '25%' : 
                     activePO.status === 'Pending' ? '50%' : 
                     activePO.status === 'Approved' ? '75%' : '100%'}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Status-specific actions */}
            {availableActions.includes('edit') && (
              <Button size="sm" variant="outline" onClick={handleEditPO}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Purchase Order
              </Button>
            )}
            
            {availableActions.includes('submit') && (
              <Button size="sm" variant="default" onClick={handleSubmitForReview}>
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            )}
            
            {availableActions.includes('approve-review') && (
              <Button size="sm" variant="default" onClick={handleApproveReview}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Review
              </Button>
            )}
            
            {availableActions.includes('approve') && (
              <Button size="sm" variant="default" onClick={handleApprovePO}>
                <FileCheck className="h-4 w-4 mr-2" />
                Final Approval
              </Button>
            )}
            
            {availableActions.includes('reject') && (
              <Button size="sm" variant="outline" onClick={handleRejectPO}>
                <FileX className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}
            
            {availableActions.includes('request-revision') && (
              <Button size="sm" variant="outline" onClick={handleRequestRevision}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
            )}
            
            {availableActions.includes('withdraw') && (
              <Button size="sm" variant="outline" onClick={handleWithdraw}>
                <XCircle className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            )}
            
            {availableActions.includes('revise') && (
              <Button size="sm" variant="default" onClick={handleEditPO}>
                <Edit className="h-4 w-4 mr-2" />
                Revise & Resubmit
              </Button>
            )}
            
            {availableActions.includes('resubmit') && (
              <Button size="sm" variant="default" onClick={handleResubmitPO}>
                <Send className="h-4 w-4 mr-2" />
                Resubmit
              </Button>
            )}
            
            {availableActions.includes('convert-to-bill') && (
              <Button size="sm" variant="default" onClick={handleConvertToBill} disabled={isLoading}>
                <FileText className="h-4 w-4 mr-2" />
                Convert to Bill
              </Button>
            )}
            
            {availableActions.includes('view-bill') && (
              <Button size="sm" variant="outline" onClick={() => {
                toast({
                  title: "View bill",
                  description: "Navigate to bill functionality will be implemented",
                })
              }}>
                <Eye className="h-4 w-4 mr-2" />
                View Bill
              </Button>
            )}
            
            {availableActions.includes('cancel') && (
              <Button size="sm" variant="destructive" onClick={handleCancel}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            
            {userPermissions.isAdmin && (
              <Button size="sm" variant="destructive" onClick={handleDeletePO}>
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            
            {/* Status indicator for actions required */}
            {requiresAction(activePO.status) && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">Action Required</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Overview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Purchase Order Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Supplier Information</p>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{activePO.supplier?.name || 'No supplier assigned'}</p>
                      {activePO.supplier?.email && (
                        <p className="text-sm text-gray-600">{activePO.supplier.email}</p>
                      )}
                      {activePO.supplier?.phone && (
                        <p className="text-sm text-gray-600">{activePO.supplier.phone}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Purchase Order Number</p>
                    <p className="font-mono text-lg font-semibold">{activePO.po_number}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Financial Summary</p>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-semibold">{formatCurrency(activePO.total || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items Count:</span>
                        <span>{activePO.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average per Item:</span>
                        <span>{formatCurrency((activePO.total || 0) / (activePO.items?.length || 1))}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                    <StatusBadge status={activePO.status} />
                  </div>
                </div>
              </div>
              
              {activePO.description && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Description</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p>{activePO.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Current Workflow Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    `bg-${statusInfo.color}-100`
                  )}>
                    <Activity className={cn("h-5 w-5", `text-${statusInfo.color}-600`)} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{statusInfo.label}</h3>
                    <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
                  </div>
                </div>
                <StatusBadge status={activePO.status} />
              </div>
              
              {/* Available Actions */}
              {availableActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Available Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableActions.map((action) => (
                      <div key={action} className="flex items-center gap-2 p-3 border rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm capitalize">{action.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Terminal Status Message */}
              {isTerminalStatus(activePO.status) && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Process Complete</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">This purchase order has reached its final state.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History Tracker */}
          <StatusHistoryTracker purchaseOrderId={activePO.id} />

          {/* Items & Cost Control Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Items by Cost Control Structure
              </CardTitle>
              <CardDescription>
                Items are organized by their cost control structure hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activePO.items && activePO.items.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedItems || {}).map(([groupKey, group]) => (
                    <div key={groupKey} className="border rounded-lg">
                      {/* Group Header */}
                      <div 
                        className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleGroup(groupKey)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedGroups.has(groupKey) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            {group.costControl ? (
                              <>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs border", getLevelColor(group.costControl.level))}
                                >
                                  <span className="flex items-center gap-1">
                                    {getLevelIcon(group.costControl.level)}
                                    {getLevelLabel(group.costControl.level)}
                                  </span>
                                </Badge>
                                <span className="font-medium">{group.costControl.name}</span>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  <Package className="h-3 w-3 mr-1" />
                                  Ungrouped Items
                                </Badge>
                                <span className="font-medium text-gray-600">Items without cost control assignment</span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <span className="text-sm text-gray-600">
                              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(group.items.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                            {group.costControl && (
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={getBudgetUtilization(group.costControl)} 
                                  className="w-16 h-2"
                                />
                                <span className="text-xs text-gray-500">
                                  {getBudgetUtilization(group.costControl).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Group Items */}
                      {expandedGroups.has(groupKey) && (
                        <div className="divide-y">
                          {group.items.map((item, index) => (
                            <div key={item.id} className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                                      #{index + 1}
                                    </span>
                                    <h4 className="font-medium">{item.description}</h4>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                                    <div>
                                      <span className="font-medium">Quantity:</span> {item.quantity} {item.unit}
                                    </div>
                                    <div>
                                      <span className="font-medium">Unit Cost:</span> {formatCurrency(item.unit_cost)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Total:</span> {formatCurrency(item.amount)}
                                    </div>
                                  </div>
                                  {item.internal_note && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                      <span className="font-medium text-blue-800">Note:</span>
                                      <span className="text-blue-700 ml-1">{item.internal_note}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold">{formatCurrency(item.amount)}</p>
                                  {group.costControl && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Budget: {formatCurrency(group.costControl.bo_amount || 0)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No items found for this purchase order.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 border-t">
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm text-gray-600">
                    Total Items: {activePO.items?.length || 0}
                  </span>
                  <span className="text-sm text-gray-600">
                    Cost Elements: {Object.keys(groupedItems || {}).length}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Grand Total</p>
                  <p className="text-xl font-bold">{formatCurrency(activePO.total || 0)}</p>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Status History */}
          {renderStatusHistory()}
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
      
      {/* Edit Dialog */}
      <EditPurchaseOrderDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={() => {
          toast({
            title: "Success",
            description: "Purchase order has been updated",
          })
          refreshPurchaseOrderData()
        }}
        purchaseOrder={activePO}
        projectId={projectId}
      />
    </div>
  )
} 