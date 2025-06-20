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
import { Loader2, Plus, Trash } from 'lucide-react'
import { usePurchaseOrderActions } from '../hooks/usePurchaseOrderActions'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

type Supplier = Database['public']['Tables']['suppliers']['Row']

interface PurchaseOrderItem {
  description: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  internal_note: string;
  [key: string]: string | number;
}

interface POItem {
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  internal_note?: string
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
        internal_note: ''
      }
    ]
  })
  
  // Suppliers list
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  
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
              internal_note: item.internal_note || ''
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
            internal_note: ''
          }
        ]
      })
    }
  }, [isOpen])
  
  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true)
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
        
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value as 'Draft' | 'Pending' | 'Approved' | 'Rejected'
    }))
  }
  
  const handleItemChange = (index: number, field: keyof POItem, value: string | number) => {
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
          internal_note: ''
        }
      ]
    }))
  }
  
  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index)
      const total = newItems.reduce((sum, item) => sum + item.amount, 0)
      return {
        ...prev,
        items: newItems,
        total
      }
    })
  }
  
  const handleSubmit = async () => {
    const result = await createPurchaseOrder(formData)
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            Enter the details for the new purchase order.
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
                placeholder="PO-001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="Supplier name"
              />
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
              <Label>Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
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