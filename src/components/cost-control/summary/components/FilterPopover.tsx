'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'

export interface FilterOptions {
  showCompleted: boolean
  showIncomplete: boolean
  budgetRange: [number, number]
  showZeroBudget: boolean
}

interface FilterPopoverProps {
  defaultFilters: FilterOptions
  maxBudgetValue: number
  onApplyFilters: (filters: FilterOptions) => void
}

export function FilterPopover({ 
  defaultFilters, 
  maxBudgetValue,
  onApplyFilters 
}: FilterPopoverProps) {
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [isOpen, setIsOpen] = useState(false)
  
  const handleReset = () => {
    const resetFilters: FilterOptions = {
      showCompleted: true,
      showIncomplete: true,
      budgetRange: [0, maxBudgetValue] as [number, number],
      showZeroBudget: true
    }
    setFilters(resetFilters)
  }
  
  const handleApply = () => {
    onApplyFilters(filters)
    setIsOpen(false)
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Filter size={14} />
          <span>Filter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <h3 className="font-medium">Filter Budget Items</h3>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Completion Status</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-completed" className="flex-1">Show completed items</Label>
              <Switch 
                id="show-completed"
                checked={filters.showCompleted}
                onCheckedChange={(checked: boolean) => 
                  setFilters(prev => ({...prev, showCompleted: checked}))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-incomplete" className="flex-1">Show incomplete items</Label>
              <Switch 
                id="show-incomplete"
                checked={filters.showIncomplete}
                onCheckedChange={(checked: boolean) => 
                  setFilters(prev => ({...prev, showIncomplete: checked}))
                }
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Budget Range</h4>
            <Slider 
              min={0} 
              max={maxBudgetValue}
              step={maxBudgetValue > 10000 ? 10000 : 1000} 
              value={filters.budgetRange}
              onValueChange={(value: number[]) => 
                setFilters(prev => ({...prev, budgetRange: value as [number, number]}))
              }
              className="py-4"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Ksh {filters.budgetRange[0].toLocaleString()}</span>
              <span>Ksh {filters.budgetRange[1].toLocaleString()}</span>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="show-zero-budget"
                checked={filters.showZeroBudget}
                onCheckedChange={(checked: boolean) => 
                  setFilters(prev => ({...prev, showZeroBudget: !!checked}))
                }
              />
              <Label htmlFor="show-zero-budget">Show items with zero budget</Label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 