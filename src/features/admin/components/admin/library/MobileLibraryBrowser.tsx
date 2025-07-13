'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Progress } from '@/shared/components/ui/progress'
import { 
  ChevronRight, 
  ArrowLeft,
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2,
  Search,
  Menu,
  Loader2,
  Grid3X3,
  List
} from 'lucide-react'

import type { Division, LibraryItem } from '@/library/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'

interface MobileLibraryBrowserProps {
  onItemSelect?: (item: LibraryItem) => void
}

type ViewLevel = 'divisions' | 'sections' | 'assemblies' | 'items'

interface BreadcrumbItem {
  id: string
  name: string
  level: ViewLevel
}

export function MobileLibraryBrowser({ onItemSelect }: MobileLibraryBrowserProps) {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [currentLevel, setCurrentLevel] = useState<ViewLevel>('divisions')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [selectedSection, setSelectedSection] = useState<any>(null)
  const [selectedAssembly, setSelectedAssembly] = useState<any>(null)
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async () => {
    setLoading(true)
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

  const navigateTo = (level: ViewLevel, item?: any) => {
    const newBreadcrumbs = [...breadcrumbs]
    
    switch (level) {
      case 'sections':
        setSelectedDivision(item)
        newBreadcrumbs.push({ id: item.id, name: item.name, level: 'divisions' })
        break
      case 'assemblies':
        setSelectedSection(item)
        newBreadcrumbs.push({ id: item.id, name: item.name, level: 'sections' })
        break
      case 'items':
        setSelectedAssembly(item)
        newBreadcrumbs.push({ id: item.id, name: item.name, level: 'assemblies' })
        break
    }
    
    setBreadcrumbs(newBreadcrumbs)
    setCurrentLevel(level)
  }

  const navigateBack = (targetLevel?: ViewLevel) => {
    if (targetLevel) {
      const targetIndex = breadcrumbs.findIndex(b => b.level === targetLevel)
      if (targetIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, targetIndex))
        setCurrentLevel(targetLevel)
      }
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, -1)
      setBreadcrumbs(newBreadcrumbs)
      
      if (newBreadcrumbs.length === 0) {
        setCurrentLevel('divisions')
        setSelectedDivision(null)
        setSelectedSection(null)
        setSelectedAssembly(null)
      } else {
        const lastBreadcrumb = newBreadcrumbs[newBreadcrumbs.length - 1]
        setCurrentLevel(getNextLevel(lastBreadcrumb.level))
      }
    }
  }

  const getNextLevel = (currentLevel: ViewLevel): ViewLevel => {
    switch (currentLevel) {
      case 'divisions': return 'sections'
      case 'sections': return 'assemblies'
      case 'assemblies': return 'items'
      default: return 'divisions'
    }
  }

  const handleItemSelect = (item: LibraryItem) => {
    if (onItemSelect) {
      onItemSelect(item)
    } else {
      setSelectedItem(item)
    }
  }

  const filterBySearch = (items: any[]) => {
    if (!searchTerm) return items
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading library...</span>
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
          fetchDivisions()
        }}
      />
    )
  }

  const renderMobileHeader = () => (
    <div className="sticky top-0 bg-white border-b z-10 p-4">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {breadcrumbs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateBack()}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">
            {currentLevel === 'divisions' ? 'Library' : 
             currentLevel === 'sections' ? selectedDivision?.name :
             currentLevel === 'assemblies' ? selectedSection?.name :
             selectedAssembly?.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
            className="p-2"
          >
            {viewMode === 'card' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3 overflow-x-auto">
          <button 
            onClick={() => {
              setBreadcrumbs([])
              setCurrentLevel('divisions')
            }}
            className="hover:text-blue-600"
          >
            Library
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-1 whitespace-nowrap">
              <ChevronRight className="w-3 h-3" />
              <button 
                onClick={() => navigateBack(crumb.level)}
                className="hover:text-blue-600"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )

  const renderCardView = (items: any[], onItemClick: (item: any) => void) => (
    <div className="grid grid-cols-1 gap-3 p-4">
      {items.map((item) => (
        <Card 
          key={item.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onItemClick(item)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {item.code} - {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.totalItems !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Progress 
                        value={item.totalItems > 0 ? (item.confirmedItems / item.totalItems) * 100 : 0} 
                        className="h-1 flex-1" 
                      />
                      <span className="text-xs text-gray-600">
                        {item.totalItems > 0 ? Math.round((item.confirmedItems / item.totalItems) * 100) : 0}%
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.confirmedItems}/{item.totalItems} confirmed
                    </Badge>
                  </div>
                )}
                {item.status && (
                  <div className="mt-2 flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    {item.materials && (
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        📦{item.materials.length} 👷{item.labor.length} 🔧{item.equipment.length}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const getCurrentItems = () => {
    switch (currentLevel) {
      case 'divisions':
        return filterBySearch(divisions)
      case 'sections':
        return filterBySearch(selectedDivision?.sections || [])
      case 'assemblies':
        return filterBySearch(selectedSection?.assemblies || [])
      case 'items':
        return filterBySearch(selectedAssembly?.items || [])
      default:
        return []
    }
  }

  const getItemClickHandler = () => {
    switch (currentLevel) {
      case 'divisions':
        return (item: any) => navigateTo('sections', item)
      case 'sections':
        return (item: any) => navigateTo('assemblies', item)
      case 'assemblies':
        return (item: any) => navigateTo('items', item)
      case 'items':
        return handleItemSelect
      default:
        return () => {}
    }
  }

  const currentItems = getCurrentItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {renderMobileHeader()}
      
      {currentItems.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          {searchTerm ? `No items found for "${searchTerm}"` : 'No items available'}
        </div>
      ) : (
        renderCardView(currentItems, getItemClickHandler())
      )}
    </div>
  )
}