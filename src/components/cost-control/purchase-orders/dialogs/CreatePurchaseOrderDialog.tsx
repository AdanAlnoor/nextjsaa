'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react'
import { usePurchaseOrderActions } from '../hooks/usePurchaseOrderActions'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CatalogSuggestions } from '../CatalogSuggestions'
import { CatalogService, CatalogItem } from '@/services/catalogService'

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
}

interface PurchaseOrderItem {
  description: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  internal_note: string;
  cost_control_item_id?: string;
  budget_validation_override?: boolean;
  override_reason?: string;
  [key: string]: string | number | boolean | undefined;
}

interface POItem {
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  internal_note?: string
  cost_control_item_id?: string
  budget_validation_override?: boolean
  override_reason?: string
  catalog_item_id?: string
}

interface POFormData {
  po_number: string
  name: string
  supplier: string
  description?: string
  total: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
  items: POItem[]
}

interface BudgetValidationResult {
  is_valid: boolean
  validation_mode: string
  available_budget: number
  required_amount: number
  deficit_amount: number
  utilization_percent: number
  alert_level: string
  validation_message: string
  can_override: boolean
  requires_approval: boolean
}

// Initial data interface (optional)
interface POInitialData {
  po_number?: string
  name?: string
  supplier?: string
  description?: string
  total?: number
  status?: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
  items?: Partial<POItem>[]
}

interface CreatePurchaseOrderDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: POInitialData
}

const UNITS = [
  'Pieces',
  'Meters',
  'Square Meters',
  'Cubic Meters',
  'Kilograms',
  'Tonnes',
  'Hours',
  'Days',
  'Lots'
]

export function CreatePurchaseOrderDialog({
  projectId,
  isOpen,
  onClose,
  onSuccess,
  initialData
}: CreatePurchaseOrderDialogProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const { createPurchaseOrder, isLoading } = usePurchaseOrderActions(projectId)
  
  const [formData, setFormData] = useState<POFormData>({
    po_number: '',
    name: '',
    supplier: '',
    description: '',
    total: 0,
    status: 'Draft',
    items: [
      {
        description: '',
        quantity: 1,
        unit: 'unit',
        price: 0,
        amount: 0,
        internal_note: '',
        cost_control_item_id: undefined,
        budget_validation_override: false,
        override_reason: ''
      }
    ]
  })
  
  // State for budget control features
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [costControlItems, setCostControlItems] = useState<CostControlItem[]>([])
  const [budgetValidations, setBudgetValidations] = useState<Record<number, BudgetValidationResult>>({})
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [isLoadingCostControl, setIsLoadingCostControl] = useState(false)
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [project, setProject] = useState<{ project_number: string } | null>(null)
  
  // Catalog suggestions state
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null)
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false)
  const catalogService = CatalogService.getInstance()
  
  // Initialize with initialData if provided
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData(prev => ({
        po_number: initialData.po_number || prev.po_number,
        name: initialData.name || prev.name,
        supplier: initialData.supplier || prev.supplier,
        description: initialData.description || prev.description,
        total: initialData.total || prev.total,
        status: initialData.status || prev.status,
        items: initialData.items && initialData.items.length > 0
          ? initialData.items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit: item.unit || 'unit',
              price: item.price || 0,
              amount: item.amount || 0,
              internal_note: item.internal_note || '',
              cost_control_item_id: item.cost_control_item_id,
              budget_validation_override: item.budget_validation_override || false,
              override_reason: item.override_reason || ''
            }))
          : prev.items
      }))
    }
  }, [initialData, isOpen])
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        po_number: '',
        name: '',
        supplier: '',
        description: '',
        total: 0,
        status: 'Draft',
        items: [
          {
            description: '',
            quantity: 1,
            unit: 'unit',
            price: 0,
            amount: 0,
            internal_note: '',
            cost_control_item_id: undefined,
            budget_validation_override: false,
            override_reason: ''
          }
        ]
      })
      setBudgetValidations({})
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
          if (!formData.po_number && !initialData?.po_number) {
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
  }, [isOpen, projectId, supabase, toast, initialData])

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
        const { data, error } = await supabase
          .from('cost_control_budget_view')
          .select('*')
          .eq('project_id', projectId)
          .order('description')
        
        if (error) throw error
        
        setCostControlItems(data || [])
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
  
  // Validate budget when item changes
  const validateBudget = async (itemIndex: number, costControlItemId: string, amount: number) => {
    if (!costControlItemId || amount <= 0) {
      setBudgetValidations(prev => {
        const updated = { ...prev }
        delete updated[itemIndex]
        return updated
      })
      return
    }

    try {
      const { data, error } = await supabase
        .rpc('validate_po_budget_enhanced', {
          p_cost_control_item_id: costControlItemId,
          p_amount: amount,
          p_allow_override: formData.items[itemIndex].budget_validation_override || false,
          p_project_id: projectId
        })
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setBudgetValidations(prev => ({
          ...prev,
          [itemIndex]: data[0]
        }))
      }
    } catch (error) {
      console.error('Error validating budget:', error)
    }
  }
  
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
          supplier: data.name
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

  const handleCatalogItemSelect = (item: CatalogItem) => {
    setSelectedCatalogItem(item)
    
    // Auto-fill the first item with catalog data
    if (formData.items.length > 0) {
      setFormData(prev => {
        const newItems = [...prev.items]
        newItems[0] = {
          ...newItems[0],
          description: item.name,
          unit: item.default_unit || newItems[0].unit,
          price: item.average_price || item.last_purchase_price || newItems[0].price,
          catalog_item_id: item.id
        }
        
        // Recalculate amount for first item
        newItems[0].amount = Number((newItems[0].quantity * newItems[0].price).toFixed(2))
        
        // Calculate total
        const total = newItems.reduce((sum, item) => sum + item.amount, 0)
        
        return {
          ...prev,
          items: newItems,
          total
        }
      })
    }
    
    toast({
      title: 'Catalog Item Selected',
      description: `${item.name} has been added to your purchase order`,
    })
  }
  
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value as 'Draft' | 'Pending' | 'Approved' | 'Rejected'
    }))
  }
  
  const handleItemChange = (index: number, field: keyof POItem, value: string | number | boolean) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      newItems[index] = {
        ...newItems[index],
        [field]: value
      }
      
      // Recalculate amount if quantity or price changes
      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? Number(value) : newItems[index].quantity
        const price = field === 'price' ? Number(value) : newItems[index].price
        newItems[index].amount = Number((qty * price).toFixed(2))
      }
      
      // Calculate total from items
      const total = newItems.reduce((sum, item) => sum + item.amount, 0)
      
      return {
        ...prev,
        items: newItems,
        total
      }
    })

    // Validate budget if relevant fields changed
    if (field === 'cost_control_item_id' || field === 'quantity' || field === 'price' || field === 'budget_validation_override') {
      const item = formData.items[index]
      const costControlItemId = field === 'cost_control_item_id' ? value as string : item.cost_control_item_id
      const amount = field === 'quantity' || field === 'price' 
        ? Number((
            (field === 'quantity' ? Number(value) : item.quantity) * 
            (field === 'price' ? Number(value) : item.price)
          ).toFixed(2))
        : item.amount

      if (costControlItemId && costControlItemId !== 'no_tracking' && costControlItemId !== 'loading') {
        validateBudget(index, costControlItemId, amount)
      }
    }
  }
  
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unit: 'unit',
          price: 0,
          amount: 0,
          internal_note: '',
          cost_control_item_id: undefined,
          budget_validation_override: false,
          override_reason: ''
        }
      ]
    }))
  }
  
  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index)
      const total = newItems.reduce((sum, item) => sum + item.amount, 0)
      
      // Remove budget validation for this item
      setBudgetValidations(prevValidations => {
        const updated = { ...prevValidations }
        delete updated[index]
        // Reindex remaining validations
        const reindexed: Record<number, BudgetValidationResult> = {}
        Object.entries(updated).forEach(([key, validation]) => {
          const oldIndex = parseInt(key)
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = validation
          } else if (oldIndex < index) {
            reindexed[oldIndex] = validation
          }
        })
        return reindexed
      })
      
      return {
        ...prev,
        items: newItems,
        total
      }
    })
  }
  
  const getBudgetStatusBadge = (validation: BudgetValidationResult) => {
    if (validation.alert_level === 'CRITICAL') {
      return <Badge variant="destructive">Budget Exceeded</Badge>
    } else if (validation.alert_level === 'WARNING') {
      return <Badge variant="secondary">Budget Warning</Badge>
    } else if (validation.alert_level === 'CAUTION') {
      return <Badge variant="outline">Budget Caution</Badge>
    } else {
      return <Badge variant="default">Budget OK</Badge>
    }
  }

  const getCostControlItemDisplay = (item: CostControlItem) => {
    const available = item.available_budget || 0
    const utilization = item.budget_utilization_percent || 0
    
    return (
      <div className="flex flex-col">
        <span className="font-medium">{item.name}</span>
        <span className="text-sm text-muted-foreground">
          Available: {formatCurrency(available)} ({utilization.toFixed(1)}% used)
        </span>
      </div>
    )
  }

  const handleSubmit = async () => {
    // Add cost control item IDs to the form data
    const enhancedFormData = {
      ...formData,
      items: formData.items.map(item => ({
        ...item,
        // Only include cost_control_item_id if one is selected (exclude special values)
        cost_control_item_id: (item.cost_control_item_id && 
                               item.cost_control_item_id !== 'no_tracking' && 
                               item.cost_control_item_id !== 'loading') 
                               ? item.cost_control_item_id : undefined
      }))
    }

    const result = await createPurchaseOrder(enhancedFormData)
    if (result.success) {
      onSuccess()
      onClose()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order with Budget Control</DialogTitle>
          <DialogDescription>
            Enter the details for the new purchase order. Link items to cost control for budget validation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="po_number">PO Number</Label>
              <Input
                id="po_number"
                name="po_number"
                value={formData.po_number}
                onChange={handleInputChange}
                placeholder="Auto-generated"
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              {showNewSupplierInput ? (
                <div className="flex gap-2">
                  <Input
                    id="new-supplier"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter new supplier name"
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
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.supplier}
                  onValueChange={(value) => {
                    if (value === 'add_new') {
                      setShowNewSupplierInput(true)
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        supplier: value
                      }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSuppliers ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading suppliers...
                      </SelectItem>
                    ) : (
                      <>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="add_new">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Supplier
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name">Purchase Order Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Brief name for the purchase order"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description of the purchase order"
              className="min-h-[80px]"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Submit for Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Items with Budget Control</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {/* Catalog Suggestions - show when first item has cost control selected */}
            {formData.items.length > 0 && formData.items[0].cost_control_item_id && 
             formData.items[0].cost_control_item_id !== 'no_tracking' && 
             formData.items[0].cost_control_item_id !== 'loading' && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <CatalogSuggestions
                  costControlItemId={formData.items[0].cost_control_item_id}
                  onItemSelect={handleCatalogItemSelect}
                  searchTerm={formData.items[0].description}
                  projectId={projectId}
                />
              </div>
            )}
            
            {/* Selected catalog item display */}
            {selectedCatalogItem && (
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-green-700">
                      Using catalog item: {selectedCatalogItem.name}
                    </span>
                    {selectedCatalogItem.code && (
                      <span className="text-xs text-green-600 ml-2">({selectedCatalogItem.code})</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCatalogItem(null)}
                    className="text-green-700 hover:text-green-800"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}
            
            {formData.items.map((item, index) => (
              <div key={index} className="p-4 border rounded-md space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  
                  {/* Cost Control Item Selection */}
                  <div className="grid gap-2">
                    <Label>Cost Control Item (Budget Tracking)</Label>
                    <Select 
                      value={item.cost_control_item_id || ''} 
                      onValueChange={(value) => handleItemChange(index, 'cost_control_item_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost control item for budget tracking" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCostControl ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          <>
                            <SelectItem value="no_tracking">No budget tracking</SelectItem>
                            {costControlItems.map((ccItem) => (
                              <SelectItem key={ccItem.id} value={ccItem.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{ccItem.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    Available: {formatCurrency(ccItem.available_budget || 0)} ({(ccItem.budget_utilization_percent || 0).toFixed(1)}% used)
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget Status Display */}
                  {(() => {
                    const selectedCostControl = costControlItems.find(cc => cc.id === item.cost_control_item_id)
                    const validation = budgetValidations[index]
                    
                    if (!selectedCostControl) return null
                    
                    return (
                      <div className="p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Budget Status</span>
                          {validation && getBudgetStatusBadge(validation)}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Available:</span>
                            <p className="font-medium">{formatCurrency(selectedCostControl.available_budget || 0)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Utilization:</span>
                            <p className="font-medium">{(selectedCostControl.budget_utilization_percent || 0).toFixed(1)}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Item Amount:</span>
                            <p className="font-medium">{formatCurrency(item.amount)}</p>
                          </div>
                        </div>
                        {validation && validation.validation_message && (
                          <p className="text-sm mt-2 text-muted-foreground">{validation.validation_message}</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Budget Validation Alert */}
                  {(() => {
                    const validation = budgetValidations[index]
                    if (!validation || validation.is_valid || validation.validation_mode !== 'STRICT') return null
                    
                    return (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {validation.validation_message}
                          {validation.can_override && (
                            <span className="block mt-2">You can enable budget override below.</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )
                  })()}

                  {/* Budget Override Section */}
                  {(() => {
                    const validation = budgetValidations[index]
                    if (!validation || !validation.can_override || validation.deficit_amount <= 0) return null
                    
                    return (
                      <div className="p-3 border border-orange-200 rounded-md bg-orange-50">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id={`override-${index}`}
                            checked={item.budget_validation_override || false}
                            onChange={(e) => handleItemChange(index, 'budget_validation_override', e.target.checked)}
                          />
                          <Label htmlFor={`override-${index}`}>Enable Budget Override</Label>
                        </div>
                        {item.budget_validation_override && (
                          <div className="grid gap-2">
                            <Label>Override Reason (Required)</Label>
                            <Input
                              value={item.override_reason || ''}
                              onChange={(e) => handleItemChange(index, 'override_reason', e.target.value)}
                              placeholder="Explain why this budget override is necessary"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="units"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="grid gap-2">
                      <Label>Internal Note (Optional)</Label>
                      <Input
                        value={item.internal_note || ''}
                        onChange={(e) => handleItemChange(index, 'internal_note', e.target.value)}
                        placeholder="Additional notes for this item"
                      />
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                      <Label>Amount</Label>
                      <p className="font-medium">${item.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => removeItem(index)}
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
            
            <div className="flex justify-end mt-4">
              <div className="text-right">
                <Label>Total Amount</Label>
                <p className="text-lg font-bold">${formData.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
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