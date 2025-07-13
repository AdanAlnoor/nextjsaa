'use client'

import { useState, useMemo } from 'react'
import { Search, Building2, Layers, Package, DollarSign, Percent } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog'
import { formatCurrency } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'

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

interface CostControlSelectorProps {
  items: CostControlItem[]
  selectedItemId?: string
  onSelect: (item: CostControlItem | null) => void
  isOpen: boolean
  onClose: () => void
}

export function CostControlSelector({
  items,
  selectedItemId,
  onSelect,
  isOpen,
  onClose
}: CostControlSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Debug: Log items to understand data structure
  console.log('CostControlSelector items:', items)
  
  // Debug: Check for duplicates specifically
  const bandasItems = items.filter(item => item.name.toLowerCase().includes('bandas'))
  if (bandasItems.length > 1) {
    console.warn('Duplicate Bandas items found:', bandasItems)
    console.log('All Bandas item details:', bandasItems.map(item => ({
      id: item.id,
      name: item.name,
      level: item.level,
      parent_id: item.parent_id,
      is_parent: item.is_parent
    })))
  }

  // Filter and organize items, remove duplicates by ID
  const filteredItems = useMemo(() => {
    // Remove duplicates first
    const uniqueItems = items.filter((item, index, self) => 
      index === self.findIndex(i => i.id === item.id)
    )
    
    if (!searchTerm) return uniqueItems
    
    return uniqueItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleSelect = (item: CostControlItem) => {
    if (item.is_parent) return // Don't allow selection of parent items
    onSelect(item)
    onClose()
  }

  const handleNoTracking = () => {
    onSelect(null)
    onClose()
  }

  const getItemIcon = (level: number) => {
    switch (level) {
      case 0: return <Building2 className="h-4 w-4 text-blue-600" />
      case 1: return <Layers className="h-4 w-4 text-green-600" />
      case 2: return <Package className="h-4 w-4 text-purple-600" />
      default: return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0: return 'Structure'
      case 1: return 'Element'
      case 2: return 'Item'
      default: return 'Item'
    }
  }

  const getBudgetStatusColor = (utilization: number) => {
    if (utilization >= 100) return 'text-red-600 bg-red-50'
    if (utilization >= 80) return 'text-orange-600 bg-orange-50'
    if (utilization >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Simple Header */}
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-medium">Select Budget Category</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                Choose a cost control item for budget tracking
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleNoTracking}
              className="text-gray-600 hover:text-gray-800"
              size="sm"
            >
              Skip Tracking
            </Button>
          </div>
        </DialogHeader>

        {/* Simple Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search cost control items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-gray-200 focus:border-gray-400"
          />
        </div>

        {/* Minimalist List */}
        <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg">
          <div className="overflow-y-auto max-h-[400px]">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p className="text-sm">No items found</p>
              </div>
            ) : (
              <div>
                {filteredItems.map((item, index) => {
                  const utilization = item.budget_utilization_percent || 0
                  const isSelected = selectedItemId === item.id
                  const available = item.available_budget || 0
                  
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0',
                        isSelected && 'bg-blue-50',
                        item.is_parent && 'bg-gray-25 opacity-75'
                      )}
                    >
                      {/* Left: Hierarchy + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="flex items-center gap-2"
                          style={{ marginLeft: `${(item.level || 0) * 16}px` }}
                        >
                          {/* Simple Icon */}
                          <div className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-xs",
                            item.level === 0 ? "bg-blue-100 text-blue-600" :
                            item.level === 1 ? "bg-green-100 text-green-600" :
                            "bg-purple-100 text-purple-600"
                          )}>
                            {getItemIcon(item.level || 0)}
                          </div>
                          
                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                item.level === 0 ? "bg-blue-100 text-blue-700" :
                                item.level === 1 ? "bg-green-100 text-green-700" :
                                "bg-purple-100 text-purple-700"
                              )}>
                                {getLevelLabel(item.level || 0)}
                              </span>
                            </div>
                            <p className={cn(
                              "font-medium truncate mt-1",
                              item.is_parent ? "text-gray-500 text-sm" : "text-gray-900"
                            )}>
                              {item.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Budget Info + Action */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        {/* Available */}
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Available</p>
                          <p className={cn(
                            "text-sm font-medium",
                            available < 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {formatCurrency(available)}
                          </p>
                        </div>
                        
                        {/* Usage */}
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Used</p>
                          <div className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            getBudgetStatusColor(utilization)
                          )}>
                            {utilization.toFixed(0)}%
                          </div>
                        </div>

                        {/* Action */}
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => handleSelect(item)}
                          disabled={item.is_parent}
                          className={cn(
                            "w-20 text-xs",
                            item.is_parent && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {isSelected ? 'Selected' : item.is_parent ? 'Parent' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Simple Footer */}
        <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
          <span>
            {filteredItems.length} items • {filteredItems.filter(item => !item.is_parent).length} selectable
          </span>
          <span className="text-xs">
            Debug: Check console for duplicate data
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}