'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import { createClient } from '@/utils/supabase/client'
import { useToast } from "@/components/ui/use-toast"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCostControl } from '@/context/CostControlContext'
import { fetchPurchaseOrders } from '@/services/purchaseOrderService'
import { hasPurchaseOrderPermission, hasRole } from '@/utils/permissions'

// Import purchase order components
import { PurchaseOrderTable } from './PurchaseOrderTable'
import { PurchaseOrderDetailView } from './PurchaseOrderDetailView'
import { PurchaseOrderMobileDetailView } from './PurchaseOrderMobileDetailView'
import { PurchaseOrderHeader } from './PurchaseOrderHeader'
import { PurchaseOrderFilters } from './PurchaseOrderFilters'
import { CreatePurchaseOrderDialog } from './dialogs/CreatePurchaseOrderDialog'
import { usePurchaseOrderActions } from './hooks/usePurchaseOrderActions'

// Types
type Project = Database['public']['Tables']['projects']['Row']
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
  items?: any[];
}

interface PurchaseOrdersTabProps {
  project: Project
}

export function PurchaseOrdersTab({ project }: PurchaseOrdersTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const { visibleItems: costControlItems, refreshData: refreshCostControl } = useCostControl()
  
  // State for purchase orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isCreatingPO, setIsCreatingPO] = useState(false)
  const [initialPOData, setInitialPOData] = useState<any>(null)
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null)
  
  // Permissions
  const [userPermissions, setUserPermissions] = useState({
    canView: false,
    canCreate: false,
    canEdit: false,
    canApprove: false,
    canConvertToBill: false,
    isAdmin: false
  })
  
  // Hook with purchase order actions
  const { 
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    convertToBill
  } = usePurchaseOrderActions(project.id)
  
  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const checkAdmin = async () => {
        // Check if user has admin role which gives all permissions
        return await hasRole('', 'admin', project.id)
      }
      
      const isAdmin = await checkAdmin()
      
      const permissions = {
        canView: await hasPurchaseOrderPermission('view', project.id),
        canCreate: await hasPurchaseOrderPermission('create', project.id),
        canEdit: await hasPurchaseOrderPermission('edit', project.id),
        canApprove: await hasPurchaseOrderPermission('approve', project.id),
        canConvertToBill: await hasPurchaseOrderPermission('convert', project.id),
        isAdmin: isAdmin
      }
      setUserPermissions(permissions)
    }
    
    checkPermissions()
  }, [project.id])
  
  // Fetch purchase orders
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      if (!project?.id) return
      
      setIsLoading(true)
      try {
        const { data, error } = await fetchPurchaseOrders(project.id)
        
        if (error) throw error
        
        setPurchaseOrders(data || [])
        setFilteredPurchaseOrders(data || [])
      } catch (error) {
        console.error('Error fetching purchase orders:', error)
        toast({
          title: "Error",
          description: "Failed to load purchase orders",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPurchaseOrders()
    
    // Set up real-time subscription
    const subscribeToPOs = async () => {
      const channel = supabase
        .channel('purchase_order_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: `project_id=eq.${project.id}`
        }, () => {
          loadPurchaseOrders() // Reload on any changes
        })
        .subscribe()
        
      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    const unsubscribe = subscribeToPOs()
    return () => {
      unsubscribe.then(unsub => unsub())
    }
  }, [project.id, toast, supabase])
  
  // Apply filters when any filter changes
  useEffect(() => {
    if (!purchaseOrders.length) {
      setFilteredPurchaseOrders([])
      return
    }
    
    let results = [...purchaseOrders]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(po => 
        po.po_number?.toLowerCase().includes(query) ||
        po.name?.toLowerCase().includes(query) ||
        po.supplier?.name?.toLowerCase().includes(query) ||
        po.description?.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    if (statusFilter) {
      results = results.filter(po => po.status === statusFilter)
    }
    
    // Apply supplier filter
    if (supplierFilter) {
      results = results.filter(po => po.supplier?.name === supplierFilter)
    }
    
    setFilteredPurchaseOrders(results)
  }, [purchaseOrders, searchQuery, statusFilter, supplierFilter])
  
  // Handle view PO details
  const handleViewPurchaseOrder = (po: PurchaseOrder) => {
    setSelectedPurchaseOrder(po)
  }
  
  // Handle creating a new PO
  const handleCreatePO = () => {
    setIsCreatingPO(true)
  }
  
  // Handle closing the create dialog
  const handleCloseCreateDialog = () => {
    setIsCreatingPO(false)
  }
  
  // Function to refresh purchase order data
  const fetchData = async () => {
    if (!project?.id) return
    
    setIsLoading(true)
    try {
      const { data, error } = await fetchPurchaseOrders(project.id)
      
      if (error) throw error
      
      setPurchaseOrders(data || [])
      setFilteredPurchaseOrders(data || [])
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast({
        title: "Error",
        description: "Failed to load purchase orders",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Extract unique suppliers for filter
  const suppliers = [...new Set(purchaseOrders.map(po => po.supplier?.name).filter(Boolean))]
  
  // Responsive layout detection
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])
  
  // Handle bill conversion params (for when navigating from bills tab)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const billId = params.get('bill')
      
      if (billId) {
        // Fetch bill data to populate the PO creation form
        const fetchBillData = async () => {
          try {
            const supabase = createClient()
            const { data, error } = await supabase
              .from('bills')
              .select(`
                *,
                items:bill_items(*)
              `)
              .eq('id', billId)
              .single()
              
            if (error) throw error
            if (data) {
              // Prepare PO data from bill
              setInitialPOData({
                po_number: `PO-${data.bill_number}`,
                name: `PO for ${data.bill_number}`,
                supplier: data.vendor,
                description: data.description,
                total: data.total_amount,
                items: data.items?.map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  price: item.unit_price,
                  amount: item.amount
                }))
              })
              
              // Open the create dialog
              setIsCreatingPO(true)
              
              // Clean up URL without reloading the page
              window.history.replaceState({}, document.title, window.location.pathname)
            }
          } catch (error) {
            console.error('Error fetching bill:', error)
          }
        }
        
        fetchBillData()
      }
    }
  }, [project.id])
  
  return (
    <div className="flex flex-col h-full">
      <PurchaseOrderHeader 
        projectId={project.id}
        onCreatePO={handleCreatePO}
        canCreate={userPermissions.canCreate}
      />
      
      <PurchaseOrderFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        suppliers={suppliers}
      />
      
      <div className="flex flex-1 mt-4 space-x-4 h-full overflow-hidden">
        <div className={`${selectedPurchaseOrder && !isMobile ? 'w-2/3' : 'w-full'} overflow-auto`}>
          <PurchaseOrderTable 
            purchaseOrders={filteredPurchaseOrders}
            isLoading={isLoading}
            onViewPurchaseOrder={handleViewPurchaseOrder}
            selectedPurchaseOrderId={selectedPurchaseOrder?.id}
            userPermissions={userPermissions}
          />
        </div>
        
        {selectedPurchaseOrder && (
          <>
            {isMobile ? (
              <PurchaseOrderMobileDetailView
                purchaseOrder={selectedPurchaseOrder}
                onClose={() => setSelectedPurchaseOrder(null)}
                userPermissions={userPermissions}
                projectId={project.id}
              />
            ) : (
              <div className="w-1/3 overflow-auto border-l border-gray-200 dark:border-gray-700">
                <PurchaseOrderDetailView
                  purchaseOrder={selectedPurchaseOrder}
                  onClose={() => setSelectedPurchaseOrder(null)}
                  userPermissions={userPermissions}
                  projectId={project.id}
                />
              </div>
            )}
          </>
        )}
      </div>
      
      {isCreatingPO && (
        <CreatePurchaseOrderDialog
          projectId={project.id}
          isOpen={isCreatingPO}
          onClose={handleCloseCreateDialog}
          onSuccess={() => {
            setIsCreatingPO(false)
            toast({
              title: "Success",
              description: "Purchase order created successfully",
            })
            fetchData()
          }}
          initialData={initialPOData}
        />
      )}
    </div>
  )
} 