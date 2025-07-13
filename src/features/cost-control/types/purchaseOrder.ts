// Enhanced Purchase Order Status System
export enum PurchaseOrderStatus {
  DRAFT = 'Draft',
  PENDING_REVIEW = 'Pending Review', 
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  REVISION_REQUIRED = 'Revision Required',
  CANCELLED = 'Cancelled',
  CONVERTED_TO_BILL = 'Converted to Bill',
  PARTIALLY_BILLED = 'Partially Billed',
  FULLY_BILLED = 'Fully Billed'
}

// Status transition rules
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.PENDING_REVIEW, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.PENDING_REVIEW]: [PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.REVISION_REQUIRED, PurchaseOrderStatus.REJECTED],
  [PurchaseOrderStatus.PENDING_APPROVAL]: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.REJECTED, PurchaseOrderStatus.REVISION_REQUIRED],
  [PurchaseOrderStatus.REVISION_REQUIRED]: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.APPROVED]: [PurchaseOrderStatus.CONVERTED_TO_BILL, PurchaseOrderStatus.PARTIALLY_BILLED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.CONVERTED_TO_BILL]: [PurchaseOrderStatus.FULLY_BILLED],
  [PurchaseOrderStatus.PARTIALLY_BILLED]: [PurchaseOrderStatus.FULLY_BILLED],
  [PurchaseOrderStatus.REJECTED]: [PurchaseOrderStatus.DRAFT], // via resubmission
  [PurchaseOrderStatus.CANCELLED]: [], // terminal state
  [PurchaseOrderStatus.FULLY_BILLED]: [] // terminal state
}

// Status categories for grouping and filtering
export enum StatusCategory {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export const STATUS_CATEGORIES: Record<string, StatusCategory> = {
  [PurchaseOrderStatus.DRAFT]: StatusCategory.DRAFT,
  [PurchaseOrderStatus.PENDING_REVIEW]: StatusCategory.PENDING,
  [PurchaseOrderStatus.PENDING_APPROVAL]: StatusCategory.PENDING,
  [PurchaseOrderStatus.REVISION_REQUIRED]: StatusCategory.PENDING,
  [PurchaseOrderStatus.APPROVED]: StatusCategory.APPROVED,
  [PurchaseOrderStatus.CONVERTED_TO_BILL]: StatusCategory.COMPLETED,
  [PurchaseOrderStatus.PARTIALLY_BILLED]: StatusCategory.COMPLETED,
  [PurchaseOrderStatus.FULLY_BILLED]: StatusCategory.COMPLETED,
  [PurchaseOrderStatus.REJECTED]: StatusCategory.REJECTED,
  [PurchaseOrderStatus.CANCELLED]: StatusCategory.CANCELLED
}

// User permissions for different actions
export interface UserPermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canReview: boolean
  canApprove: boolean
  canConvertToBill: boolean
  isAdmin: boolean
  isCreator: boolean
  canWithdraw: boolean
}

// Available actions based on status and permissions
export const getAvailableActions = (status: string, permissions: UserPermissions): string[] => {
  const actions: string[] = []
  
  switch (status) {
    case PurchaseOrderStatus.DRAFT:
      if (permissions.canEdit) actions.push('edit', 'submit', 'delete')
      break
    case PurchaseOrderStatus.PENDING_REVIEW:
      if (permissions.canReview) actions.push('approve-review', 'request-revision', 'reject')
      if (permissions.isCreator || permissions.canEdit) actions.push('withdraw')
      break
    case PurchaseOrderStatus.PENDING_APPROVAL:
      if (permissions.canApprove) actions.push('approve', 'reject', 'request-revision')
      if (permissions.isCreator || permissions.canEdit) actions.push('withdraw')
      break
    case PurchaseOrderStatus.REVISION_REQUIRED:
      if (permissions.canEdit || permissions.isCreator) actions.push('revise', 'cancel')
      break
    case PurchaseOrderStatus.APPROVED:
      if (permissions.canConvertToBill) actions.push('convert-to-bill')
      if (permissions.isAdmin) actions.push('cancel')
      break
    case PurchaseOrderStatus.REJECTED:
      if (permissions.canEdit || permissions.isCreator) actions.push('resubmit', 'cancel')
      break
    case PurchaseOrderStatus.CONVERTED_TO_BILL:
      if (permissions.canView) actions.push('view-bill')
      break
    case PurchaseOrderStatus.PARTIALLY_BILLED:
      if (permissions.canView) actions.push('view-bills')
      if (permissions.canConvertToBill) actions.push('create-additional-bill')
      break
    case PurchaseOrderStatus.FULLY_BILLED:
      if (permissions.canView) actions.push('view-bills')
      break
  }
  
  // Always allow viewing if user has view permission
  if (permissions.canView && !actions.includes('view')) {
    actions.push('view')
  }
  
  return actions
}

// Status display information
export interface StatusInfo {
  label: string
  description: string
  color: string
  category: StatusCategory
  isTerminal: boolean
  requiresAction: boolean
}

export const STATUS_INFO: Record<string, StatusInfo> = {
  [PurchaseOrderStatus.DRAFT]: {
    label: 'Draft',
    description: 'Purchase order is being prepared',
    color: 'purple',
    category: StatusCategory.DRAFT,
    isTerminal: false,
    requiresAction: true
  },
  [PurchaseOrderStatus.PENDING_REVIEW]: {
    label: 'Pending Review',
    description: 'Awaiting budget holder review',
    color: 'amber',
    category: StatusCategory.PENDING,
    isTerminal: false,
    requiresAction: true
  },
  [PurchaseOrderStatus.PENDING_APPROVAL]: {
    label: 'Pending Approval',
    description: 'Awaiting final approval',
    color: 'orange',
    category: StatusCategory.PENDING,
    isTerminal: false,
    requiresAction: true
  },
  [PurchaseOrderStatus.APPROVED]: {
    label: 'Approved',
    description: 'Ready for procurement',
    color: 'emerald',
    category: StatusCategory.APPROVED,
    isTerminal: false,
    requiresAction: false
  },
  [PurchaseOrderStatus.REJECTED]: {
    label: 'Rejected',
    description: 'Purchase order was rejected',
    color: 'red',
    category: StatusCategory.REJECTED,
    isTerminal: false,
    requiresAction: true
  },
  [PurchaseOrderStatus.REVISION_REQUIRED]: {
    label: 'Revision Required',
    description: 'Changes needed before approval',
    color: 'indigo',
    category: StatusCategory.PENDING,
    isTerminal: false,
    requiresAction: true
  },
  [PurchaseOrderStatus.CANCELLED]: {
    label: 'Cancelled',
    description: 'Purchase order was cancelled',
    color: 'gray',
    category: StatusCategory.CANCELLED,
    isTerminal: true,
    requiresAction: false
  },
  [PurchaseOrderStatus.CONVERTED_TO_BILL]: {
    label: 'Converted to Bill',
    description: 'Converted to a bill for payment',
    color: 'teal',
    category: StatusCategory.COMPLETED,
    isTerminal: false,
    requiresAction: false
  },
  [PurchaseOrderStatus.PARTIALLY_BILLED]: {
    label: 'Partially Billed',
    description: 'Some items have been billed',
    color: 'cyan',
    category: StatusCategory.COMPLETED,
    isTerminal: false,
    requiresAction: false
  },
  [PurchaseOrderStatus.FULLY_BILLED]: {
    label: 'Fully Billed',
    description: 'All items have been billed',
    color: 'slate',
    category: StatusCategory.COMPLETED,
    isTerminal: true,
    requiresAction: false
  }
}

// Status history entry
export interface StatusHistoryEntry {
  id: string
  purchase_order_id: string
  from_status: string | null
  to_status: string
  changed_by: string
  changed_at: string
  notes: string | null
  reason: string | null
  user_name?: string
}

// Helper function to validate status transitions
export const canTransitionTo = (currentStatus: string, targetStatus: string): boolean => {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || []
  return allowedTransitions.includes(targetStatus)
}

// Helper function to get next possible statuses
export const getNextStatuses = (currentStatus: string): string[] => {
  return STATUS_TRANSITIONS[currentStatus] || []
}

// Helper function to check if status requires immediate action
export const requiresAction = (status: string): boolean => {
  return STATUS_INFO[status]?.requiresAction || false
}

// Helper function to check if status is terminal
export const isTerminalStatus = (status: string): boolean => {
  return STATUS_INFO[status]?.isTerminal || false
}