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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

import type { Division, LibraryItem } from '@/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'

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
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Minimalistic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Construction Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage and organize your construction items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <span className="hidden sm:inline">Collapse All</span>
            <span className="sm:hidden">Collapse</span>
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            <span className="hidden sm:inline">Expand All</span>
            <span className="sm:hidden">Expand</span>
          </Button>
        </div>
      </div>

      {/* Streamlined Search and Controls */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-3 border-b">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items, codes, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
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
              variant="outline" 
              size="sm"
              onClick={() => fetchDivisions(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Modern Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sm:w-[40%]">Code / Name</TableHead>
                <TableHead className="hidden sm:table-cell sm:w-[30%]">Description</TableHead>
                <TableHead className="text-center min-w-[100px] sm:w-[15%]">Progress</TableHead>
                <TableHead className="text-center min-w-[80px] sm:w-[8%]">Status</TableHead>
                <TableHead className="text-center min-w-[80px] sm:w-[7%]">Factors</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {flattenedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No items match the current filters' 
                    : 'No library data available'}
                </TableCell>
              </TableRow>
            ) : (
              flattenedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={`group transition-colors
                    ${item.type === 'item' ? 'cursor-pointer hover:bg-accent/50' : ''}
                    ${item.type === 'division' ? 'bg-accent/50 font-medium' : ''}
                    ${item.type === 'section' ? 'bg-accent/25' : ''}
                    ${item.type === 'assembly' ? 'bg-muted/25' : ''}
                  `}
                  onClick={() => item.type === 'item' && item.item && handleItemSelect(item.item)}
                >
                  {/* Code / Name Column */}
                  <TableCell>
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

                  {/* Description Column */}
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {item.description}
                  </TableCell>

                  {/* Progress Column */}
                  <TableCell>
                    {item.totalItems !== undefined && item.totalItems > 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(item.confirmedItems || 0) / item.totalItems * 100} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-xs text-muted-foreground min-w-[50px] text-right">
                          {item.confirmedItems}/{item.totalItems}
                        </span>
                      </div>
                    ) : item.type === 'item' && item.unit ? (
                      <div className="text-center text-sm text-muted-foreground">
                        {item.unit}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">-</div>
                    )}
                  </TableCell>

                  {/* Status Column */}
                  <TableCell className="text-center">
                    {item.status ? (
                      getStatusBadge(item.status)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Factors Column */}
                  <TableCell>
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
                        {item.type === 'item' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              item.item && handleItemSelect(item.item)
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">-</div>
                    )}
                  </TableCell>
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