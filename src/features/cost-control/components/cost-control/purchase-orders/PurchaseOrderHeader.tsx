'use client'

import React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Plus } from 'lucide-react'

interface PurchaseOrderHeaderProps {
  projectId: string
  onCreatePO: () => void
  canCreate: boolean
}

export function PurchaseOrderHeader({
  projectId,
  onCreatePO,
  canCreate
}: PurchaseOrderHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage purchase orders for this project
        </p>
      </div>
      
      {canCreate && (
        <Button onClick={onCreatePO}>
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      )}
    </div>
  )
} 