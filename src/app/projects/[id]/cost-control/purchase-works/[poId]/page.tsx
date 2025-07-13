'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/shared/types/supabase'
import { useToast } from '@/shared/components/ui/use-toast'
import { PurchaseOrderDetailView } from '@/cost-control/components/cost-control/purchase-orders/PurchaseOrderDetailView'
import { hasPurchaseOrderPermission, hasRole } from '@/auth/utils/permissions'

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
    } | null;
  }[];
}

export default function PurchaseOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const projectId = params.id as string
  const poId = params.poId as string
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canApprove: false,
    canConvertToBill: false,
    isAdmin: false
  })

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const checkAdmin = async () => {
        return await hasRole('', 'admin', projectId)
      }
      
      const isAdmin = await checkAdmin()
      
      const permissions = {
        canView: await hasPurchaseOrderPermission('view', projectId),
        canCreate: await hasPurchaseOrderPermission('create', projectId),
        canEdit: await hasPurchaseOrderPermission('edit', projectId),
        canApprove: await hasPurchaseOrderPermission('approve', projectId),
        canConvertToBill: await hasPurchaseOrderPermission('convert', projectId),
        isAdmin: isAdmin
      }
      setUserPermissions(permissions)
    }
    
    checkPermissions()
  }, [projectId])

  // Fetch purchase order details
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!projectId || !poId) return
      
      setIsLoading(true)
      try {
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
          .eq('id', poId)
          .eq('project_id', projectId)
          .single()
        
        if (error) throw error
        
        if (!data) {
          toast({
            title: "Error",
            description: "Purchase order not found",
            variant: "destructive"
          })
          router.push(`/projects/${projectId}/cost-control/purchase-works`)
          return
        }
        
        setPurchaseOrder(data as PurchaseOrder)
      } catch (error) {
        console.error('Error fetching purchase order:', error)
        toast({
          title: "Error",
          description: "Failed to load purchase order details",
          variant: "destructive"
        })
        router.push(`/projects/${projectId}/cost-control/purchase-works`)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPurchaseOrder()
  }, [projectId, poId, supabase, toast, router])

  const handleGoBack = () => {
    router.push(`/projects/${projectId}/cost-control/purchase-works`)
  }

  const handleClose = () => {
    router.push(`/projects/${projectId}/cost-control/purchase-works`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Purchase Order Not Found</h1>
          <p className="text-muted-foreground">The purchase order you're looking for doesn't exist or you don't have permission to view it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchase Orders
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{purchaseOrder.po_number}</h1>
          <p className="text-muted-foreground">{purchaseOrder.name}</p>
        </div>
      </div>
      
      <div className="max-w-4xl">
        <PurchaseOrderDetailView
          purchaseOrder={purchaseOrder}
          onClose={handleClose}
          userPermissions={userPermissions}
          projectId={projectId}
        />
      </div>
    </div>
  )
}