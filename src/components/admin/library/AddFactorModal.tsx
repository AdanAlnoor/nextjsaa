'use client'

import { useState, useEffect } from 'react'
import { Search, Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { 
  FactorType,
  MaterialCatalogueItem,
  LaborCatalogueItem,
  EquipmentCatalogueItem,
  CatalogueItem
} from '@/types/library'
import { 
  getFactorTypeIcon,
  getFactorTypeBadgeClass,
  isMaterialCatalogueItem,
  isLaborCatalogueItem,
  isEquipmentCatalogueItem
} from '@/types/library'

interface AddFactorModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: FactorType, catalogueId: string, data: any) => Promise<void>
  itemId: string
}

interface FormData {
  type: FactorType | null
  catalogueId: string
  quantityPerUnit: string
  hoursPerUnit: string
  wastagePercentage: string
}

export function AddFactorModal({ isOpen, onClose, onAdd, itemId }: AddFactorModalProps) {
  const [formData, setFormData] = useState<FormData>({
    type: null,
    catalogueId: '',
    quantityPerUnit: '1.0',
    hoursPerUnit: '1.0',
    wastagePercentage: '0'
  })

  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CatalogueItem | null>(null)

  // Load catalogue items when type changes
  useEffect(() => {
    if (formData.type) {
      loadCatalogueItems(formData.type)
    } else {
      setCatalogueItems([])
      setSelectedItem(null)
    }
  }, [formData.type])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        type: null,
        catalogueId: '',
        quantityPerUnit: '1.0',
        hoursPerUnit: '1.0',
        wastagePercentage: '0'
      })
      setSearchTerm('')
      setSelectedItem(null)
      setCatalogueItems([])
    }
  }, [isOpen])

  const loadCatalogueItems = async (type: FactorType) => {
    setLoading(true)
    try {
      const endpoint = `/api/admin/library/catalogues/${type === 'material' ? 'materials' : type}`
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const data = await response.json()
        setCatalogueItems(data.data || [])
      } else {
        console.error(`Failed to load ${type} catalogue`)
        setCatalogueItems([])
      }
    } catch (error) {
      console.error(`Error loading ${type} catalogue:`, error)
      setCatalogueItems([])
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = catalogueItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleItemSelect = (item: CatalogueItem) => {
    setSelectedItem(item)
    setFormData(prev => ({ ...prev, catalogueId: item.id }))
  }

  const handleSubmit = async () => {
    if (!formData.type || !selectedItem) return

    setSaving(true)
    try {
      let submitData: any = {}

      if (formData.type === 'material') {
        submitData = {
          quantityPerUnit: parseFloat(formData.quantityPerUnit),
          wastagePercentage: parseFloat(formData.wastagePercentage)
        }
      } else if (formData.type === 'labor' || formData.type === 'equipment') {
        submitData = {
          hoursPerUnit: parseFloat(formData.hoursPerUnit)
        }
      }

      await onAdd(formData.type, formData.catalogueId, submitData)
      onClose()
    } catch (error) {
      console.error('Failed to add factor:', error)
      alert('Failed to add factor. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = () => {
    if (!formData.type || !selectedItem) return false
    
    if (formData.type === 'material') {
      return parseFloat(formData.quantityPerUnit) > 0 && 
             parseFloat(formData.wastagePercentage) >= 0
    } else {
      return parseFloat(formData.hoursPerUnit) > 0
    }
  }

  const renderCatalogueItem = (item: CatalogueItem) => {
    if (isMaterialCatalogueItem(item)) {
      return (
        <div
          key={item.id}
          className={`p-3 cursor-pointer hover:bg-accent/50 border-b last:border-b-0 transition-colors ${
            selectedItem?.id === item.id ? 'bg-blue-50 border-blue-200' : ''
          }`}
          onClick={() => handleItemSelect(item)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{item.code} - {item.name}</p>
              <p className="text-sm text-muted-foreground">{item.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-muted px-2 py-1 rounded">Unit: {item.unit}</span>
                {item.gradeStandard && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">{item.gradeStandard}</span>
                )}
              </div>
            </div>
            {selectedItem?.id === item.id && (
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
          </div>
        </div>
      )
    } else if (isLaborCatalogueItem(item)) {
      return (
        <div
          key={item.id}
          className={`p-3 cursor-pointer hover:bg-accent/50 border-b last:border-b-0 transition-colors ${
            selectedItem?.id === item.id ? 'bg-green-50 border-green-200' : ''
          }`}
          onClick={() => handleItemSelect(item)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{item.code} - {item.name}</p>
              <p className="text-sm text-muted-foreground">{item.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-muted px-2 py-1 rounded">{item.skillLevel}</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">{item.tradeType}</span>
              </div>
            </div>
            {selectedItem?.id === item.id && (
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
          </div>
        </div>
      )
    } else if (isEquipmentCatalogueItem(item)) {
      return (
        <div
          key={item.id}
          className={`p-3 cursor-pointer hover:bg-accent/50 border-b last:border-b-0 transition-colors ${
            selectedItem?.id === item.id ? 'bg-orange-50 border-orange-200' : ''
          }`}
          onClick={() => handleItemSelect(item)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{item.code} - {item.name}</p>
              <p className="text-sm text-muted-foreground">{item.category}</p>
              {item.capacity && (
                <div className="mt-1">
                  <span className="text-xs bg-muted px-2 py-1 rounded">Capacity: {item.capacity}</span>
                </div>
              )}
            </div>
            {selectedItem?.id === item.id && (
              <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Factor</DialogTitle>
          <DialogDescription>
            Select a factor type and choose from the catalogue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
          {/* Factor Type Selection */}
          <div>
            <Label htmlFor="factor-type">Factor Type</Label>
            <Select 
              value={formData.type || ''} 
              onValueChange={(value: FactorType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select factor type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="material">
                  <div className="flex items-center gap-2">
                    <span>🔨</span>
                    <span>Material</span>
                  </div>
                </SelectItem>
                <SelectItem value="labor">
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>Labor</span>
                  </div>
                </SelectItem>
                <SelectItem value="equipment">
                  <div className="flex items-center gap-2">
                    <span>🚛</span>
                    <span>Equipment</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catalogue Selection */}
          {formData.type && (
            <>
              <div>
                <Label htmlFor="catalogue-search">
                  Search {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} Catalogue
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="catalogue-search"
                    placeholder="Search by name, code, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading catalogue...</span>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      {catalogueItems.length === 0 
                        ? `No ${formData.type} items available`
                        : 'No items match your search'
                      }
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1">
                      {filteredItems.map(renderCatalogueItem)}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Factor-specific inputs */}
          {selectedItem && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Factor Details</h4>
              <div className="grid grid-cols-2 gap-4">
                {formData.type === 'material' && (
                  <>
                    <div>
                      <Label htmlFor="quantity">Quantity per Unit</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantityPerUnit}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantityPerUnit: e.target.value }))}
                        step="0.0001"
                        min="0"
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wastage">Wastage %</Label>
                      <Input
                        id="wastage"
                        type="number"
                        value={formData.wastagePercentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, wastagePercentage: e.target.value }))}
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                      />
                    </div>
                  </>
                )}
                
                {(formData.type === 'labor' || formData.type === 'equipment') && (
                  <div className="col-span-2">
                    <Label htmlFor="hours">Hours per Unit</Label>
                    <Input
                      id="hours"
                      type="number"
                      value={formData.hoursPerUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, hoursPerUnit: e.target.value }))}
                      step="0.01"
                      min="0"
                      placeholder="1.0"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid() || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Factor'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}