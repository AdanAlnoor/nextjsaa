'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Loader2, Plus } from 'lucide-react'
import { usePurchaseOrderActions } from '../hooks/usePurchaseOrderActions'
import { createClient } from '@/shared/lib/supabase/client'
import { Database } from '@/shared/types/supabase'
import { useToast } from '@/shared/components/ui/use-toast'
import { formatCurrency } from '@/shared/lib/utils'
import { GroupedPOCreator } from '../GroupedPOCreator'

type Supplier = Database['public']['Tables']['suppliers']['Row']
type CostControlItem = {
  id: string
  name: string
  bo_amount: number
  paid_bills: number
  pending_bills: number
  available_budget?: number
  budget_utilization_percent?: number
  budget_status?: string
  level?: number
  parent_id?: string | null
  is_parent?: boolean
}

interface POGroup {
  id: string
  cost_control_item_id: string
  cost_control_item: CostControlItem
  items: Array<{
    id: string
    catalog_item_id: string
    catalog_item: any
    description: string
    quantity: number
    unit: string
    price: number
    amount: number
    internal_note?: string
  }>
  total_amount: number
  budget_status: 'ok' | 'warning' | 'critical'
  budget_message?: string
}

interface POFormData {
  po_number: string
  name: string
  supplier: string
  supplier_id?: string
  description?: string
  total: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
  groups: POGroup[]
}

interface GroupedCreatePurchaseOrderDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function GroupedCreatePurchaseOrderDialog({
  projectId,
  isOpen,
  onClose,
  onSuccess
}: GroupedCreatePurchaseOrderDialogProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const { createPurchaseOrder, isLoading } = usePurchaseOrderActions(projectId)
  
  const [formData, setFormData] = useState<POFormData>({
    po_number: '',
    name: '',
    supplier: '',
    supplier_id: undefined,
    description: '',
    total: 0,
    status: 'Draft',
    groups: []
  })
  
  // State for data loading
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [costControlItems, setCostControlItems] = useState<CostControlItem[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [isLoadingCostControl, setIsLoadingCostControl] = useState(false)
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [project, setProject] = useState<{ project_number: string } | null>(null)
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        po_number: '',
        name: '',
        supplier: '',
        supplier_id: undefined,
        description: '',
        total: 0,
        status: 'Draft',
        groups: []
      })
      setShowNewSupplierInput(false)
      setNewSupplierName('')
    }
  }, [isOpen])
  
  // Fetch project data and generate PO number
  useEffect(() => {
    const fetchProjectAndGeneratePONumber = async () => {
      if (!isOpen || !projectId) return
      
      try {
        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('project_number')
          .eq('id', projectId)
          .single()
        
        if (projectError) throw projectError
        
        if (projectData) {
          setProject(projectData)
          
          // Generate PO number if not already set
          if (!formData.po_number) {
            // Get count of existing POs for this project
            const { count, error: countError } = await supabase
              .from('purchase_orders')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', projectId)
            
            if (countError) throw countError
            
            const poCount = (count || 0) + 1
            const generatedPONumber = `${projectData.project_number}-PO${poCount.toString().padStart(3, '0')}`
            
            setFormData(prev => ({
              ...prev,
              po_number: generatedPONumber
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching project data:', error)
        toast({
          title: 'Error',
          description: 'Failed to generate PO number',
          variant: 'destructive',
        })
      }
    }
    
    fetchProjectAndGeneratePONumber()
  }, [isOpen, projectId, supabase, toast, formData.po_number])

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true)
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name')
        
        if (error) throw error
        
        setSuppliers(data || [])
      } catch (error) {
        console.error('Error fetching suppliers:', error)
        toast({
          title: 'Error',
          description: 'Failed to load suppliers',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingSuppliers(false)
      }
    }
    
    if (isOpen) {
      fetchSuppliers()
    }
  }, [isOpen, supabase, toast])

  // Fetch cost control items with budget data
  useEffect(() => {
    const fetchCostControlItems = async () => {
      setIsLoadingCostControl(true)
      try {
        // First get the budget view data
        const { data: budgetData, error: budgetError } = await supabase
          .from('cost_control_budget_view')
          .select('*')
          .eq('project_id', projectId)
        
        if (budgetError) throw budgetError
        
        // Then get the hierarchy data from cost_control_items
        const { data: hierarchyData, error: hierarchyError } = await supabase
          .from('cost_control_items')
          .select('id, name, level, parent_id, is_parent')
          .eq('project_id', projectId)
          .order('order_index')
        
        if (hierarchyError) throw hierarchyError
        
        // Merge the data
        const mergedData = budgetData?.map(item => {
          const hierarchy = hierarchyData?.find(h => h.id === item.id)
          return {
            ...item,
            name: hierarchy?.name || item.description,
            level: hierarchy?.level || 0,
            parent_id: hierarchy?.parent_id,
            is_parent: hierarchy?.is_parent || false
          }
        }) || []
        
        // Build hierarchy tree and flatten it for proper display
        const buildHierarchicalOrder = (items: typeof mergedData) => {
          const rootItems = items.filter(item => !item.parent_id)
          const result: typeof mergedData = []
          
          const addItemAndChildren = (item: typeof mergedData[0]) => {
            result.push(item)
            // Find and add children
            const children = items.filter(child => child.parent_id === item.id)
            children.sort((a, b) => a.name.localeCompare(b.name))
            children.forEach(child => addItemAndChildren(child))
          }
          
          // Sort root items by name
          rootItems.sort((a, b) => a.name.localeCompare(b.name))
          rootItems.forEach(item => addItemAndChildren(item))
          
          return result
        }
        
        const hierarchicalData = buildHierarchicalOrder(mergedData)
        setCostControlItems(hierarchicalData)
      } catch (error) {
        console.error('Error fetching cost control items:', error)
        toast({
          title: 'Error',
          description: 'Failed to load cost control items',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingCostControl(false)
      }
    }
    
    if (isOpen) {
      fetchCostControlItems()
    }
  }, [isOpen, projectId, supabase, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleAddNewSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a supplier name',
        variant: 'destructive',
      })
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ name: newSupplierName.trim() })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setFormData(prev => ({
          ...prev,
          supplier: data.name,
          supplier_id: data.id
        }))
        setShowNewSupplierInput(false)
        setNewSupplierName('')
        
        toast({
          title: 'Success',
          description: 'New supplier added successfully',
        })
      }
    } catch (error) {
      console.error('Error adding supplier:', error)
      toast({
        title: 'Error',
        description: 'Failed to add new supplier',
        variant: 'destructive',
      })
    }
  }

  // Auto-generate PO name based on cost control items and catalog items
  const generatePOName = useCallback(() => {
    if (formData.groups.length === 0) return ''
    
    const costControlNames = formData.groups.map(group => {
      const baseName = group.cost_control_item.name
      // Extract the last part of hierarchical names (e.g., "Structure > Element > Item" -> "Item")
      const parts = baseName.split(' > ')
      return parts[parts.length - 1] || baseName
    })
    
    const totalItems = formData.groups.reduce((sum, group) => sum + group.items.length, 0)
    
    if (costControlNames.length === 1) {
      return `PO - ${costControlNames[0]} (${totalItems} items)`
    } else if (costControlNames.length === 2) {
      return `PO - ${costControlNames[0]} + ${costControlNames[1]} (${totalItems} items)`
    } else {
      return `PO - ${costControlNames[0]} + ${costControlNames.length - 1} more categories (${totalItems} items)`
    }
  }, [formData.groups])

  // Auto-update PO name when groups change
  useEffect(() => {
    if (formData.groups.length > 0) {
      const autoName = generatePOName()
      if (autoName && autoName !== formData.name) {
        setFormData(prev => ({
          ...prev,
          name: autoName
        }))
      }
    }
  }, [formData.groups, generatePOName, formData.name])
  
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value as 'Draft' | 'Pending' | 'Approved' | 'Rejected'
    }))
  }

  const handleGroupsChange = useCallback((groups: POGroup[]) => {
    const total = groups.reduce((sum, group) => sum + group.total_amount, 0)
    setFormData(prev => ({
      ...prev,
      groups,
      total
    }))
  }, [])
  
  const handleSubmit = async () => {
    // Validate that we have at least one group with items
    if (formData.groups.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one budget category with items',
        variant: 'destructive',
      })
      return
    }

    const hasEmptyGroups = formData.groups.some(group => group.items.length === 0)
    if (hasEmptyGroups) {
      toast({
        title: 'Validation Error',
        description: 'All budget categories must have at least one item',
        variant: 'destructive',
      })
      return
    }

    // Validate required fields
    if (!formData.po_number || !formData.name || !formData.supplier) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    // Convert grouped data to the expected PO items format
    const items = formData.groups.flatMap(group => 
      group.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        amount: item.amount,
        internal_note: item.internal_note || '',
        cost_control_item_id: group.cost_control_item_id,
        catalog_item_id: item.catalog_item_id,
        budget_validation_override: group.budget_status === 'critical' ? true : false,
        override_reason: group.budget_status === 'critical' ? 
          `Budget exceeded for ${group.cost_control_item.name}: ${group.budget_message}` : ''
      }))
    )

    const poData = {
      po_number: formData.po_number,
      name: formData.name,
      supplier: formData.supplier,
      supplier_id: formData.supplier_id,
      description: formData.description,
      total: formData.total,
      status: formData.status,
      items
    }

    const result = await createPurchaseOrder(poData)
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Purchase order created successfully',
      })
      onSuccess()
      onClose()
    }
  }

  const canSubmit = () => {
    return (
      formData.po_number &&
      formData.name &&
      formData.supplier &&
      formData.groups.length > 0 &&
      formData.groups.every(group => group.items.length > 0) &&
      !isLoading
    )
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order (Grouped by Budget)</DialogTitle>
          <DialogDescription>
            First select a budget category, then add multiple catalog items for that category. 
            Both cost control and catalog selection are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-3">
          {/* Compact Header Information */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="po_number" className="text-sm">PO Number *</Label>
              <Input
                id="po_number"
                name="po_number"
                value={formData.po_number}
                onChange={handleInputChange}
                placeholder="Auto-generated"
                readOnly
                className="bg-muted h-8 text-sm"
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="supplier" className="text-sm">Supplier *</Label>
              {showNewSupplierInput ? (
                <div className="flex gap-1">
                  <Input
                    id="new-supplier"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewSupplier()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddNewSupplier}
                    className="h-8 px-2"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewSupplierInput(false)
                      setNewSupplierName('')
                    }}
                    className="h-8 px-2"
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.supplier}
                  onValueChange={(value) => {
                    if (value === 'add_new') {
                      setShowNewSupplierInput(true)
                    } else {
                      const selectedSupplier = suppliers.find(s => s.name === value)
                      setFormData(prev => ({
                        ...prev,
                        supplier: value,
                        supplier_id: selectedSupplier?.id
                      }))
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSuppliers ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </SelectItem>
                    ) : (
                      <>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="add_new">
                          <Plus className="h-3 w-3 mr-2" />
                          Add New
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid gap-1">
              <Label htmlFor="status" className="text-sm">Status</Label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Submit for Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="name" className="text-sm">Purchase Order Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Brief name for the purchase order"
                className="h-8 text-sm"
                required
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="description" className="text-sm">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Optional description"
                className="h-8 text-sm"
              />
            </div>
          </div>
          
          {/* Grouped Items Creator */}
          <div className="space-y-3">
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Purchase Order Items</Label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Add items by budget category. Each category must have at least one catalog item.
                  </p>
                </div>
                {formData.total > 0 && (
                  <div className="text-right">
                    <Label className="text-sm">Total Amount</Label>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(formData.total)}</p>
                    <p className="text-xs text-gray-600">
                      {formData.groups.length} categor{formData.groups.length === 1 ? 'y' : 'ies'} • {' '}
                      {formData.groups.reduce((sum, g) => sum + g.items.length, 0)} items
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <GroupedPOCreator
              projectId={projectId}
              costControlItems={costControlItems}
              isLoadingCostControl={isLoadingCostControl}
              onFormDataChange={handleGroupsChange}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Purchase Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}