'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Trash, Package, DollarSign, Target, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'

interface POItem {
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  internal_note?: string
  cost_control_item_id?: string
  catalog_item_id?: string
  budget_validation_override?: boolean
  override_reason?: string
}

interface CostControlItem {
  id: string
  name: string
  available_budget?: number
  budget_utilization_percent?: number
  level?: number
}

interface CatalogItem {
  id: string
  name: string
  average_price?: number
  default_unit?: string
  category?: { name: string }
}

interface BudgetValidationResult {
  is_valid: boolean
  validation_message: string
  alert_level: string
  deficit_amount: number
  can_override: boolean
}

interface ImprovedPOItemCardProps {
  item: POItem
  index: number
  costControlItems: CostControlItem[]
  catalogItems: CatalogItem[]
  validation?: BudgetValidationResult
  onItemChange: (index: number, field: keyof POItem, value: string | number | boolean) => void
  onRemove: (index: number) => void
  onSelectCostControl: (index: number) => void
  onSelectCatalog: (index: number) => void
  canRemove: boolean
}

export function ImprovedPOItemCard({
  item,
  index,
  costControlItems,
  catalogItems,
  validation,
  onItemChange,
  onRemove,
  onSelectCostControl,
  onSelectCatalog,
  canRemove
}: ImprovedPOItemCardProps) {
  const selectedCostControl = costControlItems.find(cc => cc.id === item.cost_control_item_id)
  const selectedCatalog = catalogItems.find(cat => cat.id === item.catalog_item_id)

  const getBudgetStatusIcon = () => {
    if (!validation) return null
    
    switch (validation.alert_level) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'CAUTION':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getPriceVariance = () => {
    if (!selectedCatalog?.average_price || !item.price) return null
    
    const variance = ((item.price - selectedCatalog.average_price) / selectedCatalog.average_price) * 100
    return variance
  }

  const priceVariance = getPriceVariance()

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
              Item #{index + 1}
            </span>
            {item.description && (
              <span className="text-sm font-normal text-gray-600 truncate max-w-[200px]">
                {item.description}
              </span>
            )}
          </CardTitle>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Item Information */}
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Item Description</Label>
            <Input
              value={item.description}
              onChange={(e) => onItemChange(index, 'description', e.target.value)}
              placeholder="Enter item description..."
              className="font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => onItemChange(index, 'quantity', Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Input
                value={item.unit}
                onChange={(e) => onItemChange(index, 'unit', e.target.value)}
                placeholder="unit"
              />
            </div>
            <div className="grid gap-2">
              <Label>Unit Price</Label>
              <Input
                type="number"
                value={item.price}
                onChange={(e) => onItemChange(index, 'price', Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700">Total Amount:</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(item.amount)}
            </span>
          </div>
        </div>

        {/* Linking Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cost Control (Budget Tracking) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <Label className="font-medium">Budget Tracking</Label>
            </div>
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto min-h-[60px] p-3"
              onClick={() => onSelectCostControl(index)}
            >
              {selectedCostControl ? (
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedCostControl.level === 0 ? 'Structure' : 
                       selectedCostControl.level === 1 ? 'Element' : 'Item'}
                    </Badge>
                    <span className="font-medium">{selectedCostControl.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available: {formatCurrency(selectedCostControl.available_budget || 0)} 
                    ({(selectedCostControl.budget_utilization_percent || 0).toFixed(1)}% used)
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>Select cost control item for budget tracking</span>
                </div>
              )}
            </Button>

            {/* Budget Status */}
            {validation && selectedCostControl && (
              <div className={cn(
                "flex items-center gap-2 p-2 rounded text-sm",
                validation.alert_level === 'CRITICAL' ? 'bg-red-50 text-red-700' :
                validation.alert_level === 'WARNING' ? 'bg-orange-50 text-orange-700' :
                validation.alert_level === 'CAUTION' ? 'bg-yellow-50 text-yellow-700' :
                'bg-green-50 text-green-700'
              )}>
                {getBudgetStatusIcon()}
                <span>{validation.validation_message}</span>
              </div>
            )}
          </div>

          {/* Catalog Item (Suggestions) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <Label className="font-medium">Catalog Item (Optional)</Label>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start h-auto min-h-[60px] p-3"
              onClick={() => onSelectCatalog(index)}
            >
              {selectedCatalog ? (
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    {selectedCatalog.category && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCatalog.category.name}
                      </Badge>
                    )}
                    <span className="font-medium">{selectedCatalog.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Price: {formatCurrency(selectedCatalog.average_price || 0)}
                    {selectedCatalog.default_unit && ` per ${selectedCatalog.default_unit}`}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>Select from catalog for price suggestions</span>
                </div>
              )}
            </Button>

            {/* Price Variance */}
            {priceVariance !== null && (
              <div className={cn(
                "flex items-center gap-2 p-2 rounded text-sm",
                Math.abs(priceVariance) > 20 ? 'bg-orange-50 text-orange-700' :
                Math.abs(priceVariance) > 10 ? 'bg-yellow-50 text-yellow-700' :
                'bg-green-50 text-green-700'
              )}>
                <DollarSign className="h-3 w-3" />
                <span>
                  {priceVariance > 0 ? '+' : ''}{priceVariance.toFixed(1)}% from catalog average
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Internal Note */}
        <div className="grid gap-2">
          <Label>Internal Note (Optional)</Label>
          <Input
            value={item.internal_note || ''}
            onChange={(e) => onItemChange(index, 'internal_note', e.target.value)}
            placeholder="Additional notes for this item..."
          />
        </div>

        {/* Budget Override Section */}
        {validation && validation.can_override && validation.deficit_amount > 0 && (
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id={`override-${index}`}
                checked={item.budget_validation_override || false}
                onChange={(e) => onItemChange(index, 'budget_validation_override', e.target.checked)}
              />
              <Label htmlFor={`override-${index}`} className="font-medium">
                Enable Budget Override
              </Label>
            </div>
            {item.budget_validation_override && (
              <div className="grid gap-2 mt-3">
                <Label>Override Reason (Required)</Label>
                <Input
                  value={item.override_reason || ''}
                  onChange={(e) => onItemChange(index, 'override_reason', e.target.value)}
                  placeholder="Explain why this budget override is necessary"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}