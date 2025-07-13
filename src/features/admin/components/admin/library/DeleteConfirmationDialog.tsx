'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  Package,
  Users,
  Wrench,
  Info,
  XCircle
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert'
import { Separator } from '@/shared/components/ui/separator'

interface DeleteImpact {
  division?: { code: string; name: string }
  section?: { code: string; name: string }
  assembly?: { code: string; name: string }
  sections?: number
  assemblies?: number
  items: number
  confirmedItems: number
  actualItems: number
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (force?: boolean) => Promise<void>
  itemType: 'division' | 'section' | 'assembly' | 'item'
  itemData: {
    id: string
    code: string
    name: string
  }
  impact?: DeleteImpact
  canForceDelete?: boolean
  isDeleting?: boolean
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemData,
  impact,
  canForceDelete = false,
  isDeleting = false
}: DeleteConfirmationDialogProps) {
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  const handleClose = () => {
    setConfirmChecked(false)
    setForceDelete(false)
    onClose()
  }

  const handleConfirm = async () => {
    await onConfirm(forceDelete)
    handleClose()
  }

  const hasImpact = impact && (
    (impact.sections && impact.sections > 0) ||
    (impact.assemblies && impact.assemblies > 0) ||
    (impact.items && impact.items > 0)
  )

  const hasProtectedItems = impact && (impact.confirmedItems > 0 || impact.actualItems > 0)
  const canProceed = hasProtectedItems ? (canForceDelete && forceDelete) : true

  const getItemTypeIcon = () => {
    switch (itemType) {
      case 'division':
        return <Package className="w-5 h-5 text-blue-500" />
      case 'section':
        return <Users className="w-5 h-5 text-green-500" />
      case 'assembly':
        return <Wrench className="w-5 h-5 text-orange-500" />
      case 'item':
        return <Package className="w-5 h-5 text-purple-500" />
    }
  }

  const getSeverityIcon = () => {
    if (hasProtectedItems && !canForceDelete) {
      return <XCircle className="w-5 h-5 text-red-500" />
    } else if (hasProtectedItems || hasImpact) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    } else {
      return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getSeverityLevel = () => {
    if (hasProtectedItems && !canForceDelete) {
      return 'error'
    } else if (hasProtectedItems || hasImpact) {
      return 'warning'
    } else {
      return 'info'
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            {getItemTypeIcon()}
            Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete <span className="font-semibold">{itemData.code} - {itemData.name}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Impact Analysis */}
          {hasImpact && (
            <Alert className={`border-l-4 ${
              getSeverityLevel() === 'error' 
                ? 'border-l-red-500 bg-red-50' 
                : getSeverityLevel() === 'warning'
                  ? 'border-l-yellow-500 bg-yellow-50'
                  : 'border-l-blue-500 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                {getSeverityIcon()}
                <div className="flex-1">
                  <AlertTitle className={
                    getSeverityLevel() === 'error' 
                      ? 'text-red-800' 
                      : getSeverityLevel() === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                  }>
                    Deletion Impact Analysis
                  </AlertTitle>
                  <AlertDescription className={`mt-2 ${
                    getSeverityLevel() === 'error' 
                      ? 'text-red-700' 
                      : getSeverityLevel() === 'warning'
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                  }`}>
                    This deletion will affect the following items:
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Impact Details */}
          {impact && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Items that will be deleted:</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {impact.sections !== undefined && (
                  <div className="text-center p-3 bg-background rounded border">
                    <div className="text-lg font-bold text-blue-600">{impact.sections}</div>
                    <div className="text-xs text-muted-foreground">Sections</div>
                  </div>
                )}
                
                {impact.assemblies !== undefined && (
                  <div className="text-center p-3 bg-background rounded border">
                    <div className="text-lg font-bold text-green-600">{impact.assemblies}</div>
                    <div className="text-xs text-muted-foreground">Assemblies</div>
                  </div>
                )}
                
                <div className="text-center p-3 bg-background rounded border">
                  <div className="text-lg font-bold text-purple-600">{impact.items}</div>
                  <div className="text-xs text-muted-foreground">Library Items</div>
                </div>

                {(impact.confirmedItems > 0 || impact.actualItems > 0) && (
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-lg font-bold text-red-600">
                      {impact.confirmedItems + impact.actualItems}
                    </div>
                    <div className="text-xs text-red-700">Protected Items</div>
                  </div>
                )}
              </div>

              {/* Protected Items Warning */}
              {hasProtectedItems && (
                <div className="space-y-2">
                  <Separator />
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <AlertTitle className="text-red-800">Protected Items Found</AlertTitle>
                    <AlertDescription className="text-red-700 mt-2">
                      <div className="space-y-1">
                        {impact.confirmedItems > 0 && (
                          <div>• {impact.confirmedItems} confirmed items</div>
                        )}
                        {impact.actualItems > 0 && (
                          <div>• {impact.actualItems} production library items</div>
                        )}
                      </div>
                      {canForceDelete ? (
                        <div className="mt-3 space-y-2">
                          <p className="font-medium">These items are protected but can be force deleted.</p>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="force-delete" 
                              checked={forceDelete}
                              onCheckedChange={(checked) => setForceDelete(!!checked)}
                            />
                            <label htmlFor="force-delete" className="text-sm font-medium">
                              I understand the risks and want to force delete protected items
                            </label>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 font-medium">
                          These items cannot be deleted. Please change their status first.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          {/* Confirmation Checkbox */}
          {(hasImpact || hasProtectedItems) && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="confirm-delete" 
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(!!checked)}
              />
              <label htmlFor="confirm-delete" className="text-sm">
                I understand that this action cannot be undone and will delete all listed items
              </label>
            </div>
          )}

          {/* Simple confirmation for items without impact */}
          {!hasImpact && !hasProtectedItems && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>Confirm Deletion</AlertTitle>
              <AlertDescription>
                This {itemType} will be permanently deleted. This action cannot be undone.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              isDeleting || 
              (hasProtectedItems && !canForceDelete) ||
              ((hasImpact || hasProtectedItems) && !confirmChecked) ||
              !canProceed
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {forceDelete ? 'Force Delete' : `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}