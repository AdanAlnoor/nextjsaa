'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Badge } from '@/shared/components/ui/badge'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { 
  Plus, 
  Trash, 
  Target, 
  Package, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Building2,
  Layers
} from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import { CostControlSelector } from './CostControlSelector'
import { CatalogService, CatalogItem as CatalogServiceItem } from '@/library/services/catalogService'

interface CostControlItem {
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

// Use the CatalogItem from the service
type CatalogItem = CatalogServiceItem

interface POLineItem {
  id: string
  catalog_item_id: string
  catalog_item: CatalogItem
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  internal_note?: string
}

interface POGroup {
  id: string
  cost_control_item_id: string
  cost_control_item: CostControlItem
  items: POLineItem[]
  total_amount: number
  budget_status: 'ok' | 'warning' | 'critical'
  budget_message?: string
}

interface GroupedPOCreatorProps {
  projectId: string
  costControlItems: CostControlItem[]
  isLoadingCostControl: boolean
  onFormDataChange: (groups: POGroup[]) => void
  initialData?: POGroup[]
}

export function GroupedPOCreator({
  projectId,
  costControlItems,
  isLoadingCostControl,
  onFormDataChange,
  initialData
}: GroupedPOCreatorProps) {
  const [groups, setGroups] = useState<POGroup[]>(initialData || [])
  const [showCostControlSelector, setShowCostControlSelector] = useState(false)
  const [showCatalogSelector, setShowCatalogSelector] = useState<{ groupId: string } | null>(null)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const catalogService = CatalogService.getInstance()

  // Initialize with provided data
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setGroups(initialData)
    }
  }, [initialData])

  // Update parent component when groups change
  useEffect(() => {
    onFormDataChange(groups)
  }, [groups]) // Remove onFormDataChange from dependencies to prevent infinite loop

  const addNewGroup = (costControlItem: CostControlItem) => {
    const newGroup: POGroup = {
      id: crypto.randomUUID(),
      cost_control_item_id: costControlItem.id,
      cost_control_item: costControlItem,
      items: [],
      total_amount: 0,
      budget_status: 'ok'
    }
    setGroups(prev => [...prev, newGroup])
  }

  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const loadCatalogItems = async (costControlItemId: string) => {
    setIsLoadingCatalog(true)
    try {
      const items = await catalogService.getCatalogSuggestions({
        costControlItemId,
        limit: 50,
        projectId
      })
      
      setCatalogItems(items)
    } catch (error) {
      console.error('Error loading catalog items:', error)
      setCatalogItems([])
    } finally {
      setIsLoadingCatalog(false)
    }
  }

  const addItemToGroup = async (groupId: string, catalogItem: CatalogItem) => {
    try {
      // Record catalog usage for analytics
      await catalogService.recordUsage(catalogItem.id)
    } catch (error) {
      console.error('Error recording catalog usage:', error)
      // Continue with item addition even if usage recording fails
    }

    const newItem: POLineItem = {
      id: crypto.randomUUID(),
      catalog_item_id: catalogItem.id,
      catalog_item: catalogItem,
      description: catalogItem.name,
      quantity: 1,
      unit: catalogItem.default_unit || 'unit',
      price: catalogItem.average_price || catalogItem.last_purchase_price || 0,
      amount: catalogItem.average_price || catalogItem.last_purchase_price || 0,
      internal_note: ''
    }

    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedItems = [...group.items, newItem]
        const total = updatedItems.reduce((sum, item) => sum + item.amount, 0)
        
        return {
          ...group,
          items: updatedItems,
          total_amount: total,
          ...calculateBudgetStatus(group.cost_control_item, total)
        }
      }
      return group
    }))
  }

  const removeItemFromGroup = (groupId: string, itemId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedItems = group.items.filter(item => item.id !== itemId)
        const total = updatedItems.reduce((sum, item) => sum + item.amount, 0)
        
        return {
          ...group,
          items: updatedItems,
          total_amount: total,
          ...calculateBudgetStatus(group.cost_control_item, total)
        }
      }
      return group
    }))
  }

  const updateItemInGroup = (groupId: string, itemId: string, field: keyof POLineItem, value: any) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedItems = group.items.map(item => {
          if (item.id === itemId) {
            const updatedItem = { ...item, [field]: value }
            
            // Recalculate amount if quantity or price changes
            if (field === 'quantity' || field === 'price') {
              updatedItem.amount = Number((updatedItem.quantity * updatedItem.price).toFixed(2))
            }
            
            return updatedItem
          }
          return item
        })
        
        const total = updatedItems.reduce((sum, item) => sum + item.amount, 0)
        
        return {
          ...group,
          items: updatedItems,
          total_amount: total,
          ...calculateBudgetStatus(group.cost_control_item, total)
        }
      }
      return group
    }))
  }

  const calculateBudgetStatus = (costControlItem: CostControlItem, totalAmount: number) => {
    const available = costControlItem.available_budget || 0
    const remaining = available - totalAmount
    
    if (remaining < 0) {
      return {
        budget_status: 'critical' as const,
        budget_message: `Exceeds budget by ${formatCurrency(Math.abs(remaining))}`
      }
    } else if (remaining < available * 0.1) {
      return {
        budget_status: 'warning' as const,
        budget_message: `Only ${formatCurrency(remaining)} remaining`
      }
    } else {
      return {
        budget_status: 'ok' as const,
        budget_message: `${formatCurrency(remaining)} available`
      }
    }
  }

  const getCostControlIcon = (level: number) => {
    switch (level) {
      case 0: return <Building2 className="h-4 w-4 text-blue-600" />
      case 1: return <Layers className="h-4 w-4 text-green-600" />
      default: return <Package className="h-4 w-4 text-purple-600" />
    }
  }

  const getCostControlLevelLabel = (level: number) => {
    switch (level) {
      case 0: return 'Structure'
      case 1: return 'Element' 
      default: return 'Item'
    }
  }

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-orange-200 bg-orange-50'
      default: return 'border-green-200 bg-green-50'
    }
  }

  const getTotalAmount = () => {
    return groups.reduce((sum, group) => sum + group.total_amount, 0)
  }

  return (
    <div className="space-y-3">
      {/* Add New Cost Control Group - Compact */}
      <Card className="border-dashed border border-gray-300">
        <CardContent className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-900 text-sm">Add Items by Budget Category</h3>
              <p className="text-xs text-gray-500">
                Select a budget category, then add catalog items
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCostControlSelector(true)}
            disabled={isLoadingCostControl}
            className="bg-blue-600 hover:bg-blue-700 h-8 text-sm"
            size="sm"
          >
            <Plus className="h-3 w-3 mr-1" />
            Select Category
          </Button>
        </CardContent>
      </Card>

      {/* Existing Groups */}
      {groups.map((group) => (
        <Card key={group.id} className={cn("", getBudgetStatusColor(group.budget_status))}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getCostControlIcon(group.cost_control_item.level || 0)}
                <Badge variant="outline" className="text-xs">
                  {getCostControlLevelLabel(group.cost_control_item.level || 0)}
                </Badge>
                <CardTitle className="text-sm">{group.cost_control_item.name}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeGroup(group.id)}
                className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Budget: {formatCurrency(group.cost_control_item.available_budget || 0)}</span>
              <span>Total: {formatCurrency(group.total_amount)}</span>
              <span className={cn(
                "flex items-center gap-1",
                group.budget_status === 'critical' ? 'text-red-600' :
                group.budget_status === 'warning' ? 'text-orange-600' :
                'text-green-600'
              )}>
                {group.budget_status === 'critical' ? <AlertTriangle className="h-2 w-2" /> :
                 group.budget_status === 'warning' ? <AlertTriangle className="h-2 w-2" /> :
                 <CheckCircle className="h-2 w-2" />}
                {group.budget_message}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Items Table */}
            {group.items.length > 0 && (
              <div className="border-0 border-t border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-2 py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="col-span-4 text-left">Description</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-1 text-center">Unit</div>
                    <div className="col-span-2 text-center">Unit Price</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-1 text-center">Note</div>
                    <div className="col-span-1 text-center"></div>
                  </div>
                </div>
                <div className="bg-white">
                  {group.items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "grid grid-cols-12 gap-2 py-3 px-4 transition-colors hover:bg-gray-50/50",
                        index !== group.items.length - 1 && "border-b border-gray-100"
                      )}
                    >
                      {/* Description */}
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <Package className="h-3 w-3 text-green-600" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 truncate leading-tight">
                            {item.catalog_item.name}
                          </p>
                          {item.catalog_item.category && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 font-normal border-gray-300 text-gray-600">
                                {item.catalog_item.category.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Quantity */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemInGroup(group.id, item.id, 'quantity', Number(e.target.value))}
                          min="0"
                          step="0.01"
                          className="h-8 text-sm text-center border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md"
                        />
                      </div>
                      
                      {/* Unit */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItemInGroup(group.id, item.id, 'unit', e.target.value)}
                          className="h-8 text-sm text-center border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md"
                        />
                      </div>
                      
                      {/* Unit Price */}
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="relative w-full">
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemInGroup(group.id, item.id, 'price', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="h-8 text-sm text-right border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md pl-6"
                          />
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                      
                      {/* Amount */}
                      <div className="col-span-2 flex items-center justify-end">
                        <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                          <span className="font-semibold text-sm text-green-700">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Note */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Input
                          value={item.internal_note || ''}
                          onChange={(e) => updateItemInGroup(group.id, item.id, 'internal_note', e.target.value)}
                          placeholder="..."
                          className="h-8 text-xs border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-center"
                        />
                      </div>
                      
                      {/* Delete Button */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemFromGroup(group.id, item.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add item to group */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/30">
              <Button
                variant="outline"
                className="w-full border-dashed border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-50 h-10 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all duration-200"
                onClick={() => {
                  loadCatalogItems(group.cost_control_item_id)
                  setShowCatalogSelector({ groupId: group.id })
                }}
                disabled={isLoadingCatalog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Catalog Item
              </Button>
            </div>

            {/* Budget Warning */}
            {group.budget_status !== 'ok' && (
              <Alert variant={group.budget_status === 'critical' ? 'destructive' : 'default'} className="py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {group.budget_message}
                  {group.budget_status === 'critical' && (
                    <span className="block mt-1 font-medium">Budget Override Required</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Total Summary */}
      {groups.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900 text-sm">Purchase Order Total</span>
              </div>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(getTotalAmount())}
              </div>
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {groups.length} categor{groups.length === 1 ? 'y' : 'ies'} • {groups.reduce((sum, g) => sum + g.items.length, 0)} items
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Control Selector Modal */}
      <CostControlSelector
        items={costControlItems.filter(item => 
          // Keep all items for hierarchy display, but exclude already selected items
          !groups.some(g => g.cost_control_item_id === item.id)
        )}
        selectedItemId=""
        onSelect={(item) => {
          if (item) {
            addNewGroup(item)
          }
        }}
        isOpen={showCostControlSelector}
        onClose={() => setShowCostControlSelector(false)}
      />

      {/* Catalog Selector Modal */}
      <Dialog open={!!showCatalogSelector} onOpenChange={(open) => {
        if (!open) setShowCatalogSelector(null)
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Catalog Item</DialogTitle>
            <DialogDescription>
              Choose a catalog item to add to this budget category
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            {isLoadingCatalog ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading catalog items...</p>
                </div>
              </div>
            ) : catalogItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No catalog items found for this budget category</p>
              </div>
            ) : (
              catalogItems.map((catalogItem) => (
                <div
                  key={catalogItem.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={async () => {
                    if (showCatalogSelector) {
                      await addItemToGroup(showCatalogSelector.groupId, catalogItem)
                      setShowCatalogSelector(null)
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{catalogItem.name}</span>
                        {catalogItem.category && (
                          <Badge variant="secondary" className="text-xs">
                            {catalogItem.category.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{catalogItem.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        {formatCurrency(catalogItem.average_price || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        per {catalogItem.default_unit}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCatalogSelector(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}