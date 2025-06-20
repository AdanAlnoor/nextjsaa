'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash, Eye, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Database } from '@/types/supabase'
import { StatusBadge } from '../bills/StatusBadge'
import { BillsTableSkeleton } from '../bills/SkeletonLoaders'

type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'] & {
  approval_date: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  rejection_date: string | null;
  linked_bill?: string | null;
  supplier?: {
    name: string;
  } | null;
}

interface PurchaseOrderTableProps {
  purchaseOrders: PurchaseOrder[]
  isLoading: boolean
  onViewPurchaseOrder: (purchaseOrder: PurchaseOrder) => void
  selectedPurchaseOrderId?: string
  userPermissions: {
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canApprove: boolean
    canConvertToBill: boolean
    isAdmin: boolean
  }
}

export function PurchaseOrderTable({
  purchaseOrders,
  isLoading,
  onViewPurchaseOrder,
  selectedPurchaseOrderId,
  userPermissions
}: PurchaseOrderTableProps) {
  
  if (isLoading) {
    return <BillsTableSkeleton />
  }
  
  if (purchaseOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <h3 className="text-xl font-medium mb-2">No purchase orders found</h3>
        <p className="text-muted-foreground mb-4">Create a new purchase order to get started.</p>
      </div>
    )
  }
  
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO Number</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.map((po) => (
            <TableRow 
              key={po.id} 
              className={selectedPurchaseOrderId === po.id ? 'bg-muted' : ''}
              onClick={() => onViewPurchaseOrder(po)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell className="font-medium">{po.po_number}</TableCell>
              <TableCell>{po.name}</TableCell>
              <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
              <TableCell>{formatCurrency(po.total || 0)}</TableCell>
              <TableCell>
                <StatusBadge status={po.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewPurchaseOrder(po)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 