'use client'

import { useState } from 'react'
import { Calendar, X, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'
import { Separator } from '@/shared/components/ui/separator'
import type { AnalyticsFilter } from '@/shared/types/phase3'

interface FilterPanelProps {
  filters: AnalyticsFilter
  onFiltersChange: (filters: AnalyticsFilter) => void
  onClose: () => void
}

export function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<AnalyticsFilter>(filters)

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }))
  }

  const handleProjectAdd = (projectId: string) => {
    if (projectId && !localFilters.projects.includes(projectId)) {
      setLocalFilters(prev => ({
        ...prev,
        projects: [...prev.projects, projectId]
      }))
    }
  }

  const handleProjectRemove = (projectId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      projects: prev.projects.filter(id => id !== projectId)
    }))
  }

  const handleCategoryAdd = (category: string) => {
    if (category && !localFilters.categories.includes(category)) {
      setLocalFilters(prev => ({
        ...prev,
        categories: [...prev.categories, category]
      }))
    }
  }

  const handleCategoryRemove = (category: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat !== category)
    }))
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleClearFilters = () => {
    const clearedFilters: AnalyticsFilter = {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      projects: [],
      costItems: [],
      categories: []
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const predefinedDateRanges = [
    {
      label: 'Last 7 days',
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    {
      label: 'Last 30 days',
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    {
      label: 'Last 90 days',
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    {
      label: 'This year',
      start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  ]

  const availableCategories = [
    'LABOR',
    'MATERIALS',
    'EQUIPMENT',
    'OVERHEAD',
    'CONTINGENCY',
    'DIRECT_COSTS',
    'INDIRECT_COSTS'
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Analytics Filters
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Label>
          
          {/* Predefined ranges */}
          <div className="flex flex-wrap gap-2">
            {predefinedDateRanges.map((range, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  handleDateRangeChange('start', range.start)
                  handleDateRangeChange('end', range.end)
                }}
                className="text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
          
          {/* Custom date inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={localFilters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={localFilters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Project Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Projects</Label>
          <div className="space-y-2">
            <Select onValueChange={handleProjectAdd}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Add project filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_projects">All Projects</SelectItem>
                <SelectItem value="active_projects">Active Projects Only</SelectItem>
                <SelectItem value="completed_projects">Completed Projects Only</SelectItem>
                <SelectItem value="at_risk_projects">At-Risk Projects Only</SelectItem>
              </SelectContent>
            </Select>
            
            {localFilters.projects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {localFilters.projects.map((projectId) => (
                  <Badge key={projectId} variant="secondary" className="text-xs">
                    Project {projectId.slice(-8)}
                    <button
                      onClick={() => handleProjectRemove(projectId)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Category Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cost Categories</Label>
          <div className="space-y-2">
            <Select onValueChange={handleCategoryAdd}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Add category filter..." />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {localFilters.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {localFilters.categories.map((category) => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category.replace('_', ' ')}
                    <button
                      onClick={() => handleCategoryRemove(category)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Status Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status Filters</Label>
          <div className="space-y-2">
            <Select 
              onValueChange={(value) => {
                setLocalFilters(prev => ({
                  ...prev,
                  status: prev.status ? [...prev.status, value] : [value]
                }))
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Add status filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on-budget">On Budget</SelectItem>
                <SelectItem value="over-budget">Over Budget</SelectItem>
                <SelectItem value="under-budget">Under Budget</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            
            {localFilters.status && localFilters.status.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {localFilters.status.map((status) => (
                  <Badge key={status} variant="secondary" className="text-xs">
                    {status.replace('-', ' ').toUpperCase()}
                    <button
                      onClick={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          status: prev.status?.filter(s => s !== status)
                        }))
                      }}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear All
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
