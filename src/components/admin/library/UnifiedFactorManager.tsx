'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Search,
  Plus,
  Trash2,
  Filter,
  MoreHorizontal,
  Check,
  X,
  Edit
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { 
  LibraryItem, 
  Factor,
  UnifiedFactor,
  FactorType,
  FactorSearchFilters
} from '@/types/library'
import { 
  convertToUnifiedFactor,
  getFactorTypeIcon,
  getFactorTypeBadgeClass,
  getFactorTypeRowClass
} from '@/types/library'

interface UnifiedFactorManagerProps {
  item: LibraryItem
  onFactorUpdate: () => void
  readonly?: boolean
}

export function UnifiedFactorManager({ 
  item, 
  onFactorUpdate, 
  readonly = false 
}: UnifiedFactorManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<FactorType | 'all'>('all')
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set())
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Inline form state
  const [formType, setFormType] = useState<FactorType>('material')
  const [formQuantity, setFormQuantity] = useState('1.0')
  const [formWastage, setFormWastage] = useState('0')
  const [formSaving, setFormSaving] = useState(false)
  const [catalogueItems, setCatalogueItems] = useState<any[]>([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [selectedCatalogueItem, setSelectedCatalogueItem] = useState<any>(null)
  const [catalogueSearch, setCatalogueSearch] = useState('')

  // Convert all factors to unified format
  const unifiedFactors = useMemo(() => {
    const allFactors: Factor[] = [
      ...item.materials,
      ...item.labor,
      ...item.equipment
    ]
    return allFactors.map(convertToUnifiedFactor)
  }, [item.materials, item.labor, item.equipment])

  // Filter factors based on search and type
  const filteredFactors = useMemo(() => {
    return unifiedFactors.filter(factor => {
      // Type filter
      if (typeFilter !== 'all' && factor.type !== typeFilter) {
        return false
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          factor.name.toLowerCase().includes(searchLower) ||
          factor.code.toLowerCase().includes(searchLower) ||
          factor.category?.toLowerCase().includes(searchLower) ||
          factor.trade?.toLowerCase().includes(searchLower) ||
          factor.skillLevel?.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [unifiedFactors, typeFilter, searchTerm])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFactors(new Set(filteredFactors.map(f => f.id)))
    } else {
      setSelectedFactors(new Set())
    }
  }

  const handleSelectFactor = (factorId: string, checked: boolean) => {
    const newSelected = new Set(selectedFactors)
    if (checked) {
      newSelected.add(factorId)
    } else {
      newSelected.delete(factorId)
    }
    setSelectedFactors(newSelected)
  }

  // Load catalogue items when type changes
  useEffect(() => {
    if (showInlineForm && formType) {
      loadCatalogueItems(formType)
    }
  }, [showInlineForm, formType])

  const loadCatalogueItems = async (type: FactorType) => {
    setCatalogueLoading(true)
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
      setCatalogueLoading(false)
    }
  }

  // Reset inline form
  const resetInlineForm = () => {
    setFormType('material')
    setFormQuantity('1.0')
    setFormWastage('0')
    setFormSaving(false)
    setCatalogueItems([])
    setSelectedCatalogueItem(null)
    setCatalogueSearch('')
  }

  // Handle inline form save
  const handleInlineFormSave = async () => {
    if (!selectedCatalogueItem || !formQuantity) {
      alert('Please select a catalogue item and enter quantity/hours')
      return
    }

    setFormSaving(true)
    try {
      let submitData: any = {}

      if (formType === 'material') {
        submitData = {
          quantityPerUnit: parseFloat(formQuantity),
          wastagePercentage: parseFloat(formWastage)
        }
      } else if (formType === 'labor' || formType === 'equipment') {
        submitData = {
          hoursPerUnit: parseFloat(formQuantity)
        }
      }

      await handleAddFactor(formType, selectedCatalogueItem.id, submitData)
      
      // Reset and hide form
      resetInlineForm()
      setShowInlineForm(false)
    } catch (error) {
      console.error('Failed to save inline factor:', error)
      alert('Failed to save factor. Please try again.')
    } finally {
      setFormSaving(false)
    }
  }

  // Handle inline form cancel
  const handleInlineFormCancel = () => {
    resetInlineForm()
    setShowInlineForm(false)
  }

  const handleAddFactor = async (type: FactorType, catalogueId: string, data: any) => {
    try {
      let endpoint = ''
      let payload = {}

      if (type === 'material') {
        endpoint = `/api/admin/library/items/${item.id}/materials`
        payload = {
          materialCatalogueId: catalogueId,
          quantityPerUnit: data.quantityPerUnit,
          wastagePercentage: data.wastagePercentage
        }
      } else if (type === 'labor') {
        endpoint = `/api/admin/library/items/${item.id}/labor`
        payload = {
          laborCatalogueId: catalogueId,
          hoursPerUnit: data.hoursPerUnit
        }
      } else if (type === 'equipment') {
        endpoint = `/api/admin/library/items/${item.id}/equipment`
        payload = {
          equipmentCatalogueId: catalogueId,
          hoursPerUnit: data.hoursPerUnit
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add factor')
      }

      onFactorUpdate()
    } catch (error) {
      console.error('Failed to add factor:', error)
      throw error
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFactors.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedFactors.size} factor(s)?`)) {
      return
    }

    setLoading(true)
    try {
      // Group by factor type for deletion
      const factorsByType = new Map<FactorType, string[]>()
      
      filteredFactors.forEach(factor => {
        if (selectedFactors.has(factor.id)) {
          const existing = factorsByType.get(factor.type) || []
          existing.push(factor.id)
          factorsByType.set(factor.type, existing)
        }
      })

      // Delete each type separately (since they have different endpoints)
      const deletePromises = Array.from(factorsByType.entries()).map(([type, ids]) => {
        return Promise.all(ids.map(id => 
          fetch(`/api/admin/library/${type}-factors/${id}`, { method: 'DELETE' })
        ))
      })

      await Promise.all(deletePromises)
      setSelectedFactors(new Set())
      onFactorUpdate()
    } catch (error) {
      console.error('Failed to delete factors:', error)
      alert('Failed to delete some factors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderTableCell = (factor: UnifiedFactor, field: string) => {
    switch (field) {
      case 'type':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{getFactorTypeIcon(factor.type)}</span>
            <Badge className={getFactorTypeBadgeClass(factor.type)}>
              {factor.type}
            </Badge>
          </div>
        )
      
      case 'code':
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {factor.code}
          </Badge>
        )
      
      case 'quantity':
        if (factor.type === 'material' && factor.quantityPerUnit) {
          return (
            <div className="text-center">
              <div className="font-medium">{factor.quantityPerUnit}</div>
              <div className="text-xs text-muted-foreground">{factor.unit}</div>
            </div>
          )
        } else if ((factor.type === 'labor' || factor.type === 'equipment') && factor.hoursPerUnit) {
          return (
            <div className="text-center">
              <div className="font-medium">{factor.hoursPerUnit}</div>
              <div className="text-xs text-muted-foreground">hours</div>
            </div>
          )
        }
        return <span className="text-muted-foreground">-</span>
      
      case 'details':
        if (factor.type === 'material') {
          return (
            <div className="space-y-1">
              {factor.unit && (
                <div className="text-xs text-muted-foreground">Unit: {factor.unit}</div>
              )}
              {factor.wastagePercentage && factor.wastagePercentage > 0 && (
                <Badge variant="outline" className="text-xs">
                  Wastage: {factor.wastagePercentage}%
                </Badge>
              )}
            </div>
          )
        } else if (factor.type === 'labor') {
          return (
            <div className="space-y-1">
              {factor.trade && (
                <div className="text-xs text-muted-foreground">Trade: {factor.trade}</div>
              )}
              {factor.skillLevel && (
                <Badge variant="secondary" className="text-xs">
                  {factor.skillLevel}
                </Badge>
              )}
            </div>
          )
        } else if (factor.type === 'equipment') {
          return (
            <div className="space-y-1">
              {factor.category && (
                <div className="text-xs text-muted-foreground">{factor.category}</div>
              )}
              {factor.capacity && (
                <Badge variant="outline" className="text-xs">
                  {factor.capacity}
                </Badge>
              )}
            </div>
          )
        }
        return null
      
      case 'rate':
        if (factor.rate) {
          return (
            <div className="text-right font-medium">
              ${factor.rate.toFixed(2)}
            </div>
          )
        }
        return <span className="text-muted-foreground">-</span>
      
      default:
        return null
    }
  }

  const totalFactors = unifiedFactors.length
  const selectedCount = selectedFactors.size

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Factor Management</h3>
          <p className="text-sm text-muted-foreground">
            {totalFactors} total factors ({item.materials.length} materials, {item.labor.length} labor, {item.equipment.length} equipment)
          </p>
        </div>
        
        {!readonly && (
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedCount}
              </Button>
            )}
            <Button onClick={() => showInlineForm ? handleInlineFormCancel() : setShowInlineForm(true)}>
              {showInlineForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Factor
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search factors by name, code, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={(value: FactorType | 'all') => setTypeFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="material">🔨 Material</SelectItem>
            <SelectItem value="labor">👥 Labor</SelectItem>
            <SelectItem value="equipment">🚛 Equipment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Factors Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {!readonly && (
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedCount > 0 && selectedCount === filteredFactors.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all factors"
                    />
                  </TableHead>
                )}
                <TableHead className="min-w-[100px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Code</TableHead>
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="text-center min-w-[100px]">Quantity/Hours</TableHead>
                <TableHead className="min-w-[150px]">Details</TableHead>
                <TableHead className="text-right min-w-[100px]">Rate</TableHead>
                {!readonly && <TableHead className="w-[50px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Inline Add Form Row */}
              {showInlineForm && !readonly && (
                <TableRow className="bg-gray-50 border-b-2">
                  <TableCell></TableCell>
                  <TableCell>
                    <Select value={formType} onValueChange={(value: FactorType) => {
                      setFormType(value)
                      setSelectedCatalogueItem(null)
                      setCatalogueSearch('')
                    }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">🔨 Material</SelectItem>
                        <SelectItem value="labor">👥 Labor</SelectItem>
                        <SelectItem value="equipment">🚛 Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell colSpan={2}>
                    <div className="space-y-1">
                      <Input 
                        placeholder="Search catalogue items..."
                        value={catalogueSearch}
                        onChange={(e) => setCatalogueSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                      {catalogueItems.length > 0 && (
                        <Select 
                          value={selectedCatalogueItem?.id || ''} 
                          onValueChange={(value) => {
                            const item = catalogueItems.find(i => i.id === value)
                            setSelectedCatalogueItem(item || null)
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={catalogueLoading ? "Loading..." : "Select item"} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogueItems
                              .filter(item => 
                                item.name.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
                                item.code.toLowerCase().includes(catalogueSearch.toLowerCase())
                              )
                              .slice(0, 10)
                              .map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.code} - {item.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder={formType === 'material' ? 'Quantity' : 'Hours'}
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      type="number"
                      step="0.01"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    {formType === 'material' ? (
                      <Input 
                        placeholder="Wastage %"
                        value={formWastage}
                        onChange={(e) => setFormWastage(e.target.value)}
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {selectedCatalogueItem ? `$${(selectedCatalogueItem.rate || 0).toFixed(2)}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={handleInlineFormSave}
                        disabled={formSaving}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={handleInlineFormCancel}
                        disabled={formSaving}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {filteredFactors.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={readonly ? 6 : 8} 
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm || typeFilter !== 'all' 
                      ? 'No factors match the current filters' 
                      : 'No factors added yet. Click "Add Factor" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFactors.map((factor) => (
                  <TableRow 
                    key={factor.id}
                    className={`transition-colors ${getFactorTypeRowClass(factor.type)}`}
                  >
                    {!readonly && (
                      <TableCell>
                        <Checkbox
                          checked={selectedFactors.has(factor.id)}
                          onCheckedChange={(checked) => handleSelectFactor(factor.id, !!checked)}
                          aria-label={`Select ${factor.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>{renderTableCell(factor, 'type')}</TableCell>
                    <TableCell>{renderTableCell(factor, 'code')}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{factor.name}</div>
                        {factor.specifications && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {factor.specifications}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{renderTableCell(factor, 'quantity')}</TableCell>
                    <TableCell>{renderTableCell(factor, 'details')}</TableCell>
                    <TableCell>{renderTableCell(factor, 'rate')}</TableCell>
                    {!readonly && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

    </div>
  )
}