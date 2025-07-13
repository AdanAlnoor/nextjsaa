'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Progress } from '@/shared/components/ui/progress'
import { Button } from '@/shared/components/ui/button'
import { 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2,
  Search,
  RefreshCw,
  ExpandIcon,
  Minimize2,
  HelpCircle,
  Loader2,
  Edit,
  Eye,
  Package,
  Users,
  Wrench
} from 'lucide-react'

import type { Division, LibraryItem, LibrarySearchFilters } from '@/library/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'
import { EnhancedSearch } from './EnhancedSearch'

interface LibraryTableBrowserProps {
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

export function LibraryTableBrowser({ 
  onItemSelect, 
  showFilters = true
}: LibraryTableBrowserProps) {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])

  // Load divisions and hierarchy
  useEffect(() => {
    fetchDivisions()
    loadRecentSearches()
  }, [])

  useEffect(() => {
    generateSearchSuggestions()
  }, [divisions])

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('library-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load recent searches:', error)
      }
    }
  }

  const addToRecentSearches = (search: string) => {
    if (!search.trim()) return
    
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem('library-recent-searches', JSON.stringify(updated))
  }

  const generateSearchSuggestions = () => {
    const suggestions: any[] = []
    
    divisions.forEach(division => {
      division.sections.forEach(section => {
        section.assemblies.forEach(assembly => {
          assembly.items.forEach(item => {
            suggestions.push({
              id: item.id,
              text: item.name,
              type: 'item',
              category: `${division.name} > ${section.name}`
            })
            suggestions.push({
              id: `${item.id}-code`,
              text: item.code,
              type: 'code',
              category: item.name
            })
          })
        })
      })
    })
    
    setSearchSuggestions(suggestions)
  }

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
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'complete':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'actual':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      complete: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      actual: 'bg-green-100 text-green-700'
    }

    return (
      <Badge className={colors[status as keyof typeof colors] + ' text-xs'}>
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
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
          <span className="text-gray-600">Loading construction library...</span>
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
    <div className="space-y-6">
      {/* Enhanced Search and Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Library Browser
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    View the entire hierarchy in a scrollable table format
                  </div>
                </div>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  <ExpandIcon className="w-4 h-4 mr-1" />
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Collapse All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <EnhancedSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by name, code, or description..."
                  suggestions={searchSuggestions}
                  recentSearches={recentSearches}
                  onAddToRecent={addToRecentSearches}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="draft">📝 Draft</option>
                <option value="complete">⚠️ Complete</option>
                <option value="confirmed">✅ Confirmed</option>
                <option value="actual">🏭 Production</option>
              </select>
              <Button 
                variant="outline" 
                onClick={() => fetchDivisions(true)}
                disabled={isRefreshing}
                className="h-10"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Scrollable Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white border-b-2 border-gray-200 z-10">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm text-gray-900 w-[35%] bg-gray-50">Code / Name</th>
                  <th className="text-left p-4 font-semibold text-sm text-gray-900 w-[30%] bg-gray-50">Description</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 w-[15%] bg-gray-50">Progress</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 w-[8%] bg-gray-50">Status</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 w-[8%] bg-gray-50">Factors</th>
                  <th className="text-center p-4 font-semibold text-sm text-gray-900 w-[4%] bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flattenedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No items match the current filters' 
                        : 'No library data available'}
                    </td>
                  </tr>
                ) : (
                  flattenedItems.map((item) => (
                    <tr 
                      key={item.id}
                      className={`
                        border-b transition-colors
                        ${item.type === 'item' ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}
                        ${item.type === 'division' ? 'bg-blue-50 font-semibold border-t-2 border-blue-200' : ''}
                        ${item.type === 'section' ? 'bg-green-50' : ''}
                        ${item.type === 'assembly' ? 'bg-purple-50' : ''}
                      `}
                      onClick={() => item.type === 'item' && item.item && handleItemSelect(item.item)}
                    >
                      {/* Code / Name Column */}
                      <td className="p-3">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${item.level * 28}px` }}>
                          {item.hasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleItem(item.id)
                              }}
                              className="p-0.5 hover:bg-gray-300 rounded transition-colors"
                            >
                              {item.isExpanded ? 
                                <ChevronDown className="w-4 h-4 text-gray-700" /> : 
                                <ChevronRight className="w-4 h-4 text-gray-700" />
                              }
                            </button>
                          )}
                          {!item.hasChildren && item.type !== 'item' && (
                            <div className="w-5" />
                          )}
                          <div className="flex items-center gap-2 min-w-0">
                            {item.type === 'division' && <span className="text-lg">📂</span>}
                            {item.type === 'section' && <span className="text-base">📁</span>}
                            {item.type === 'assembly' && <span className="text-base">📄</span>}
                            {item.type === 'item' && <span className="text-sm">📦</span>}
                            <span className={`font-mono ${
                              item.type === 'division' ? 'text-base font-bold' : 
                              item.type === 'section' ? 'text-sm font-semibold' :
                              item.type === 'assembly' ? 'text-sm font-medium' :
                              'text-sm'
                            }`}>
                              {item.code}
                            </span>
                            <span className={`truncate ${
                              item.type === 'division' ? 'font-bold' : 
                              item.type === 'section' ? 'font-semibold' :
                              item.type === 'assembly' ? 'font-medium' :
                              ''
                            }`}>
                              - {item.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description Column */}
                      <td className={`p-3 text-sm ${
                        item.type === 'division' ? 'text-gray-800' :
                        item.type === 'section' ? 'text-gray-700' :
                        'text-gray-600'
                      }`}>
                        {item.description}
                      </td>

                      {/* Progress Column */}
                      <td className="p-3">
                        {item.totalItems !== undefined && item.totalItems > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(item.confirmedItems || 0) / item.totalItems * 100} 
                              className="flex-1 h-2" 
                            />
                            <span className="text-xs text-gray-600 min-w-[50px] text-right">
                              {item.confirmedItems}/{item.totalItems}
                            </span>
                          </div>
                        ) : item.type === 'item' && item.unit ? (
                          <div className="text-center text-sm text-gray-600">
                            Unit: {item.unit}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="p-3 text-center">
                        {item.status ? (
                          getStatusBadge(item.status)
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Factors Column */}
                      <td className="p-3">
                        {item.type === 'item' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <Package className="w-3 h-3 mr-1" />
                              {item.materials?.length || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <Users className="w-3 h-3 mr-1" />
                              {item.labor?.length || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <Wrench className="w-3 h-3 mr-1" />
                              {item.equipment?.length || 0}
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="p-3 text-center">
                        {item.type === 'item' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation()
                                item.item && handleItemSelect(item.item)
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-gray-400">-</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}