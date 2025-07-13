'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Users,
  Wrench,
  Edit,
  Trash2,
  Plus,
  FileSpreadsheet,
  ChevronDown as ChevronDownIcon
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Progress } from '@/shared/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

import type { Division, LibraryItem } from '@/library/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'
import { AddLibraryItemDialog } from './AddLibraryItemDialog'
import { ExcelImportExportInterface } from './ExcelImportExportInterface'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'

interface ModernLibraryBrowserProps {
  onItemSelect?: (item: LibraryItem) => void
  showFilters?: boolean
}

interface FlattenedItem {
  id: string
  type: 'division' | 'section' | 'assembly' | 'item'
  level: number
  code: string
  name: string
  description: string
  parentId?: string
  totalItems?: number
  confirmedItems?: number
  completedItems?: number
  status?: string
  unit?: string
  wastagePercentage?: number
  materials?: any[]
  labor?: any[]
  equipment?: any[]
  item?: LibraryItem
  hasChildren?: boolean
  isExpanded?: boolean
}

export function ModernLibraryBrowser({ 
  onItemSelect, 
  showFilters = true
}: ModernLibraryBrowserProps) {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [deleteItemType, setDeleteItemType] = useState<'division' | 'section' | 'assembly' | 'item'>('item')
  const [deleteImpact, setDeleteImpact] = useState<any>(null)
  const [canForceDelete, setCanForceDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addParentLevel, setAddParentLevel] = useState(0)
  const [addParentId, setAddParentId] = useState<string>('')
  const [addParentCode, setAddParentCode] = useState<string>('')
  const [addParentName, setAddParentName] = useState<string>('')
  const [excelDialogOpen, setExcelDialogOpen] = useState(false)

  // Load divisions and hierarchy
  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const response = await fetch('/api/admin/library/divisions')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setDivisions(data)
    } catch (error) {
      console.error('Failed to fetch divisions:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4 text-muted-foreground" />
      case 'complete':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'actual':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      complete: 'outline',
      confirmed: 'default',
      actual: 'default'
    } as const

    const colors = {
      draft: 'text-muted-foreground',
      complete: 'text-yellow-700 border-yellow-300 bg-yellow-50',
      confirmed: 'text-blue-700 border-blue-300 bg-blue-50',
      actual: 'text-green-700 border-green-300 bg-green-50'
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} 
             className={`text-xs ${colors[status as keyof typeof colors] || ''}`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    )
  }

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const expandAll = () => {
    const allIds = new Set<string>()
    divisions.forEach(d => {
      allIds.add(d.id)
      d.sections.forEach(s => {
        allIds.add(s.id)
        s.assemblies.forEach(a => {
          allIds.add(a.id)
        })
      })
    })
    setExpandedItems(allIds)
  }

  const collapseAll = () => {
    setExpandedItems(new Set())
  }

  const handleItemSelect = (item: LibraryItem) => {
    if (onItemSelect) {
      onItemSelect(item)
    } else {
      setSelectedItem(item)
    }
  }

  const handleDeleteClick = async (type: 'division' | 'section' | 'assembly' | 'item', item: any) => {
    setDeleteItemType(type)
    setItemToDelete(item)
    setDeleteImpact(null)
    setCanForceDelete(false)

    // For items, use the simple existing logic
    if (type === 'item') {
      setDeleteDialogOpen(true)
      return
    }

    // For hierarchy levels, check impact first
    try {
      let endpoint = ''
      switch (type) {
        case 'division':
          endpoint = `/api/admin/library/divisions?id=${item.id}`
          break
        case 'section':
          endpoint = `/api/admin/library/sections?id=${item.id}`
          break
        case 'assembly':
          endpoint = `/api/admin/library/assemblies?id=${item.id}`
          break
      }

      const response = await fetch(endpoint, { method: 'DELETE' })
      const result = await response.json()

      if (response.status === 409 || response.status === 400) {
        // Has impact or protected items
        setDeleteImpact(result.impact)
        setCanForceDelete(result.canForceDelete || false)
        setDeleteDialogOpen(true)
      } else if (response.ok) {
        // No impact, deletion successful
        await fetchDivisions(true)
      } else {
        alert(`Failed to delete ${type}: ${result.error}`)
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      alert(`Failed to delete ${type}`)
    }
  }

  const handleDeleteConfirm = async (force = false) => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      let endpoint = ''
      let url = ''

      switch (deleteItemType) {
        case 'division':
          url = `/api/admin/library/divisions?id=${itemToDelete.id}`
          if (force) url += '&force=true'
          break
        case 'section':
          url = `/api/admin/library/sections?id=${itemToDelete.id}`
          if (force) url += '&force=true'
          break
        case 'assembly':
          url = `/api/admin/library/assemblies?id=${itemToDelete.id}`
          if (force) url += '&force=true'
          break
        case 'item':
          url = `/api/admin/library/items/${itemToDelete.id}`
          break
      }

      const response = await fetch(url, { method: 'DELETE' })

      if (response.ok) {
        await fetchDivisions(true) // Refresh the data
        setDeleteDialogOpen(false)
        setItemToDelete(null)
        setDeleteImpact(null)
        setCanForceDelete(false)
      } else {
        const error = await response.json()
        alert(`Failed to delete ${deleteItemType}: ${error.error}`)
      }
    } catch (error) {
      console.error(`Failed to delete ${deleteItemType}:`, error)
      alert(`Failed to delete ${deleteItemType}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddItem = (level: number, id: string, code: string, name: string) => {
    console.log(`[Browser] Adding item to level ${level}, parent: ${code} - ${name}`)
    setAddParentLevel(level)
    setAddParentId(id)
    setAddParentCode(code)
    setAddParentName(name)
    setAddDialogOpen(true)
  }

  const handleAddSuccess = () => {
    fetchDivisions(true) // Refresh the data
  }

  // Flatten hierarchy for table display
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = []
    
    divisions.forEach(division => {
      const divisionExpanded = expandedItems.has(division.id)
      items.push({
        id: division.id,
        type: 'division',
        level: 0,
        code: division.code,
        name: division.name,
        description: division.description || '',
        totalItems: division.totalItems,
        confirmedItems: division.confirmedItems,
        completedItems: division.completedItems,
        hasChildren: division.sections.length > 0,
        isExpanded: divisionExpanded
      })

      if (divisionExpanded) {
        division.sections.forEach(section => {
          const sectionExpanded = expandedItems.has(section.id)
          items.push({
            id: section.id,
            type: 'section',
            level: 1,
            code: section.code,
            name: section.name,
            description: section.description || '',
            parentId: division.id,
            totalItems: section.totalItems,
            confirmedItems: section.confirmedItems,
            completedItems: section.completedItems,
            hasChildren: section.assemblies.length > 0,
            isExpanded: sectionExpanded
          })

          if (sectionExpanded) {
            section.assemblies.forEach(assembly => {
              const assemblyExpanded = expandedItems.has(assembly.id)
              items.push({
                id: assembly.id,
                type: 'assembly',
                level: 2,
                code: assembly.code,
                name: assembly.name,
                description: assembly.description || '',
                parentId: section.id,
                totalItems: assembly.totalItems,
                confirmedItems: assembly.confirmedItems,
                completedItems: assembly.completedItems,
                hasChildren: assembly.items.length > 0,
                isExpanded: assemblyExpanded
              })

              if (assemblyExpanded) {
                assembly.items.forEach(item => {
                  // Filter by status and search
                  if (statusFilter !== 'all' && item.status !== statusFilter) return
                  if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                      !item.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
                      !item.description.toLowerCase().includes(searchTerm.toLowerCase())) return

                  items.push({
                    id: item.id,
                    type: 'item',
                    level: 3,
                    code: item.code,
                    name: item.name,
                    description: item.description,
                    parentId: assembly.id,
                    status: item.status,
                    unit: item.unit,
                    wastagePercentage: item.wastagePercentage,
                    materials: item.materials,
                    labor: item.labor,
                    equipment: item.equipment,
                    item: item,
                    hasChildren: false
                  })
                })
              }
            })
          }
        })
      }
    })
    
    return items
  }, [divisions, expandedItems, statusFilter, searchTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading construction library...</span>
        </div>
      </div>
    )
  }

  if (selectedItem && !onItemSelect) {
    return (
      <ItemFactorEditor 
        item={selectedItem} 
        onBack={() => setSelectedItem(null)}
        onSave={() => {
          setSelectedItem(null)
          fetchDivisions(true)
        }}
        onItemUpdate={() => fetchDivisions(true)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-4 px-1">
        <h1 className="text-base font-medium">Construction Library</h1>
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs" 
            onClick={() => setExcelDialogOpen(true)}
          >
            <FileSpreadsheet className="w-3 h-3 mr-1" />
            Import/Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs" 
            onClick={() => handleAddItem(0, '', '', 'Root')}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Division
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={collapseAll}>
            Collapse
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={expandAll}>
            Expand
          </Button>
        </div>
      </div>

      {/* Compact Search and Controls */}
      {showFilters && (
        <div className="flex items-center gap-2 px-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-8 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="actual">Production</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => fetchDivisions(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>
      )}

      {/* Maximized Table */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="h-9">
                <TableHead className="min-w-[200px] sm:w-[35%] py-2">Code / Name</TableHead>
                <TableHead className="text-center min-w-[60px] sm:w-[8%] py-2">Unit</TableHead>
                <TableHead className="text-center min-w-[100px] sm:w-[17%] py-2">Progress</TableHead>
                <TableHead className="text-center min-w-[80px] sm:w-[10%] py-2">Status</TableHead>
                <TableHead className="text-center min-w-[80px] sm:w-[15%] py-2">Factors</TableHead>
                <TableHead className="text-center min-w-[80px] sm:w-[8%] py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {flattenedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No items match the current filters' 
                    : 'No library data available'}
                </TableCell>
              </TableRow>
            ) : (
              flattenedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={`group transition-colors h-10
                    ${item.type === 'item' ? 'cursor-pointer hover:bg-accent/50' : ''}
                    ${item.type === 'division' ? 'bg-accent/50 font-medium' : ''}
                    ${item.type === 'section' ? 'bg-accent/25' : ''}
                    ${item.type === 'assembly' ? 'bg-muted/25' : ''}
                  `}
                  onClick={() => item.type === 'item' && item.item && handleItemSelect(item.item)}
                >
                  {/* Code / Name Column */}
                  <TableCell className="py-1">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${item.level * 20}px` }}>
                      {item.hasChildren && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleItem(item.id)
                          }}
                        >
                          {item.isExpanded ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                        </Button>
                      )}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-sm ${
                          item.type === 'division' ? 'font-semibold' : 
                          item.type === 'section' ? 'font-medium' : ''
                        }`}>
                          {item.code}
                        </span>
                        <span className={`truncate ${
                          item.type === 'division' ? 'font-semibold' : 
                          item.type === 'section' ? 'font-medium' : ''
                        }`}>
                          {item.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Unit Column */}
                  <TableCell className="text-center py-1">
                    {item.type === 'item' && item.unit ? (
                      <div className="text-sm font-medium">
                        {item.unit}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Progress Column */}
                  <TableCell className="py-1">
                    {item.type !== 'item' && item.totalItems !== undefined ? (
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={item.totalItems > 0 ? (item.confirmedItems || 0) / item.totalItems * 100 : 0} 
                          className="flex-1 h-1.5" 
                        />
                        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                          {item.confirmedItems || 0}/{item.totalItems || 0}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">-</div>
                    )}
                  </TableCell>

                  {/* Status Column */}
                  <TableCell className="text-center py-1">
                    {item.status ? (
                      getStatusBadge(item.status)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Factors Column */}
                  <TableCell className="py-1">
                    {item.type === 'item' ? (
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className="text-xs h-6 transition-colors hover:bg-accent">
                          <Package className="w-3 h-3 mr-1" />
                          {item.materials?.length || 0}
                        </Badge>
                        <Badge variant="outline" className="text-xs h-6 transition-colors hover:bg-accent">
                          <Users className="w-3 h-3 mr-1" />
                          {item.labor?.length || 0}
                        </Badge>
                        <Badge variant="outline" className="text-xs h-6 transition-colors hover:bg-accent">
                          <Wrench className="w-3 h-3 mr-1" />
                          {item.equipment?.length || 0}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">-</div>
                    )}
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="py-1">
                    <TooltipProvider>
                      <div className="flex items-center justify-center gap-1">
                        {/* Add Button with Dropdown for hierarchy levels */}
                        {(item.type === 'division' || item.type === 'section' || item.type === 'assembly') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.type === 'division' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleAddItem(1, item.id, item.code, item.name)}
                                  >
                                    <Plus className="w-3 h-3 mr-2" />
                                    Add Section
                                  </DropdownMenuItem>
                                </>
                              )}
                              {item.type === 'section' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleAddItem(2, item.id, item.code, item.name)}
                                  >
                                    <Plus className="w-3 h-3 mr-2" />
                                    Add Assembly
                                  </DropdownMenuItem>
                                </>
                              )}
                              {item.type === 'assembly' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleAddItem(3, item.id, item.code, item.name)}
                                  >
                                    <Plus className="w-3 h-3 mr-2" />
                                    Add Item
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Delete Button for hierarchy levels */}
                        {(item.type === 'division' || item.type === 'section' || item.type === 'assembly') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(item.type, item)
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete {item.type}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Edit Button for items */}
                        {item.type === 'item' && item.item && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleItemSelect(item.item!)
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit item</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Delete Button for items */}
                        {item.type === 'item' && item.item && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick('item', item.item!)
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete item</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Show dash for empty state */}
                        {item.type !== 'item' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-muted-foreground">+</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add child {item.type === 'division' ? 'section' : item.type === 'section' ? 'assembly' : 'item'}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Enhanced Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
          setDeleteImpact(null)
          setCanForceDelete(false)
        }}
        onConfirm={handleDeleteConfirm}
        itemType={deleteItemType}
        itemData={itemToDelete || { id: '', code: '', name: '' }}
        impact={deleteImpact}
        canForceDelete={canForceDelete}
        isDeleting={isDeleting}
      />

      {/* Add Item Dialog */}
      <AddLibraryItemDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleAddSuccess}
        parentLevel={addParentLevel}
        parentId={addParentId}
        parentCode={addParentCode}
        parentName={addParentName}
      />

      {/* Excel Import/Export Dialog */}
      <ExcelImportExportInterface
        isOpen={excelDialogOpen}
        onClose={() => setExcelDialogOpen(false)}
        onImportSuccess={handleAddSuccess}
      />
    </div>
  )
}