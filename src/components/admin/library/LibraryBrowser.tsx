'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  ExpandIcon,
  Minimize2,
  HelpCircle,
  Loader2
} from 'lucide-react'

import type { Division, LibraryItem, LibrarySearchFilters } from '@/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'
import { EnhancedSearch } from './EnhancedSearch'

interface LibraryBrowserProps {
  initialFilters?: LibrarySearchFilters
  onItemSelect?: (item: LibraryItem) => void
  showFilters?: boolean
  compactView?: boolean
}

export function LibraryBrowser({ 
  onItemSelect, 
  showFilters = true
}: LibraryBrowserProps) {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<string>>(new Set())
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
    generateSearchSuggestions()
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
            if (item.description) {
              suggestions.push({
                id: `${item.id}-desc`,
                text: item.description,
                type: 'description',
                category: item.name
              })
            }
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
      complete: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-700',
      actual: 'bg-green-100 text-green-700'
    }

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    )
  }

  const toggleDivision = (divisionId: string) => {
    const newExpanded = new Set(expandedDivisions)
    if (newExpanded.has(divisionId)) {
      newExpanded.delete(divisionId)
    } else {
      newExpanded.add(divisionId)
    }
    setExpandedDivisions(newExpanded)
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const toggleAssembly = (assemblyId: string) => {
    const newExpanded = new Set(expandedAssemblies)
    if (newExpanded.has(assemblyId)) {
      newExpanded.delete(assemblyId)
    } else {
      newExpanded.add(assemblyId)
    }
    setExpandedAssemblies(newExpanded)
  }

  const handleItemSelect = (item: LibraryItem) => {
    if (onItemSelect) {
      onItemSelect(item)
    } else {
      setSelectedItem(item)
    }
  }

  const expandAll = () => {
    const allDivisionIds = new Set(divisions.map(d => d.id))
    const allSectionIds = new Set(divisions.flatMap(d => d.sections.map(s => s.id)))
    const allAssemblyIds = new Set(divisions.flatMap(d => d.sections.flatMap(s => s.assemblies.map(a => a.id))))
    
    setExpandedDivisions(allDivisionIds)
    setExpandedSections(allSectionIds)
    setExpandedAssemblies(allAssemblyIds)
  }

  const collapseAll = () => {
    setExpandedDivisions(new Set())
    setExpandedSections(new Set())
    setExpandedAssemblies(new Set())
  }

  const getStatusHelp = (status: string) => {
    const helpText = {
      draft: 'Items in draft status have no factors assigned yet',
      complete: 'Items with all required factors - ready for confirmation',
      confirmed: 'Items approved for production use',
      actual: 'Items currently in the production library'
    }
    return helpText[status as keyof typeof helpText] || 'Unknown status'
  }

  const filterItems = (items: LibraryItem[]) => {
    return items.filter(item => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }
      
      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !item.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !item.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      return true
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
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
          fetchDivisions() // Refresh data
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
                    Browse the 4-level hierarchy: Division → Section → Assembly → Item
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
            <div className="space-y-4">
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
              
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hierarchy Browser */}
      <div className="space-y-4">
        {divisions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No library data available. Please run the migration scripts to initialize the library system.</p>
            </CardContent>
          </Card>
        ) : (
          divisions.map((division) => (
            <Card key={division.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleDivision(division.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedDivisions.has(division.id) ? 
                      <ChevronDown className="w-5 h-5 text-gray-600" /> : 
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    }
                    <div>
                      <CardTitle className="text-lg">
                        {division.code} - {division.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{division.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Progress 
                          value={division.totalItems > 0 ? (division.confirmedItems / division.totalItems) * 100 : 0} 
                          className="w-32 h-2" 
                        />
                        <span className="text-sm font-medium text-gray-600">
                          {division.totalItems > 0 ? Math.round((division.confirmedItems / division.totalItems) * 100) : 0}%
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {division.confirmedItems}/{division.totalItems} confirmed
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {expandedDivisions.has(division.id) && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {division.sections.map((section) => (
                      <div key={section.id} className="border-l-2 border-gray-200 pl-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                          onClick={() => toggleSection(section.id)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedSections.has(section.id) ? 
                              <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            }
                            <div>
                              <h4 className="font-medium">{section.code} - {section.name}</h4>
                              <p className="text-sm text-gray-600">{section.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Progress 
                                  value={section.totalItems > 0 ? (section.confirmedItems / section.totalItems) * 100 : 0} 
                                  className="w-24 h-1.5" 
                                />
                                <span className="text-xs text-gray-600">
                                  {section.totalItems > 0 ? Math.round((section.confirmedItems / section.totalItems) * 100) : 0}%
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {section.confirmedItems}/{section.totalItems}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {expandedSections.has(section.id) && (
                          <div className="ml-6 space-y-2 mt-2">
                            {section.assemblies.map((assembly) => (
                              <div key={assembly.id} className="border-l-2 border-gray-100 pl-4">
                                <div 
                                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                  onClick={() => toggleAssembly(assembly.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    {expandedAssemblies.has(assembly.id) ? 
                                      <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                                      <ChevronRight className="w-4 h-4 text-gray-600" />
                                    }
                                    <div>
                                      <h5 className="font-medium text-sm">{assembly.code} - {assembly.name}</h5>
                                      <p className="text-xs text-gray-600">{assembly.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Progress 
                                          value={assembly.totalItems > 0 ? (assembly.confirmedItems / assembly.totalItems) * 100 : 0} 
                                          className="w-20 h-1" 
                                        />
                                        <span className="text-xs text-gray-600">
                                          {assembly.totalItems > 0 ? Math.round((assembly.confirmedItems / assembly.totalItems) * 100) : 0}%
                                        </span>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {assembly.confirmedItems}/{assembly.totalItems}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {expandedAssemblies.has(assembly.id) && (
                                  <div className="ml-6 space-y-1 mt-2">
                                    {filterItems(assembly.items).map((item) => (
                                      <div 
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                                        onClick={() => handleItemSelect(item)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{item.code} - {item.name}</p>
                                            <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge variant="secondary" className="text-xs">
                                                Unit: {item.unit}
                                              </Badge>
                                              {item.wastagePercentage > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                  Wastage: {item.wastagePercentage}%
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="group relative">
                                            {getStatusBadge(item.status)}
                                            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                                              {getStatusHelp(item.status)}
                                            </div>
                                          </div>
                                          <Badge variant="outline" className="font-mono bg-blue-50 border-blue-200 text-xs">
                                            📦{item.materials.length} 👷{item.labor.length} 🔧{item.equipment.length}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                    {filterItems(assembly.items).length === 0 && assembly.items.length > 0 && (
                                      <div className="text-center py-4 text-gray-500 text-sm">
                                        No items match the current filters
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}