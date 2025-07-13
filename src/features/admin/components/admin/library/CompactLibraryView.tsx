'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, Search } from 'lucide-react'
import type { Division, LibraryItem } from '@/library/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'

interface CompactLibraryViewProps {
  onItemSelect?: (item: LibraryItem) => void
}

interface FlattenedItem {
  id: string
  type: 'division' | 'section' | 'assembly' | 'item'
  level: number
  code: string
  name: string
  status?: string
  materials?: any[]
  labor?: any[]
  equipment?: any[]
  item?: LibraryItem
  hasChildren?: boolean
  isExpanded?: boolean
}

export function CompactLibraryView({ onItemSelect }: CompactLibraryViewProps) {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/library/divisions')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setDivisions(data)
    } catch (error) {
      console.error('Failed to fetch divisions:', error)
    } finally {
      setLoading(false)
    }
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

  const handleItemSelect = (item: LibraryItem) => {
    if (onItemSelect) {
      onItemSelect(item)
    } else {
      setSelectedItem(item)
    }
  }

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
                hasChildren: assembly.items.length > 0,
                isExpanded: assemblyExpanded
              })

              if (assemblyExpanded) {
                assembly.items.forEach(item => {
                  if (statusFilter !== 'all' && item.status !== statusFilter) return
                  if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                      !item.code.toLowerCase().includes(searchTerm.toLowerCase())) return

                  items.push({
                    id: item.id,
                    type: 'item',
                    level: 3,
                    code: item.code,
                    name: item.name,
                    status: item.status,
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
    return <div className="text-[10px] p-1">Loading...</div>
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

  return (
    <div className="text-[10px]">

      {/* Minimal controls */}
      <div className="flex gap-1 p-1 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-4 pr-1 py-0.5 text-[10px] border rounded"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-[8px] border rounded px-1 py-0.5"
        >
          <option value="all">All</option>
          <option value="draft">D</option>
          <option value="complete">C</option>
          <option value="confirmed">F</option>
          <option value="actual">A</option>
        </select>
      </div>

      {/* Data-dense table */}
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-white border-b">
            <tr className="text-[8px] text-gray-600">
              <th className="text-left p-1 w-[40%]">Code/Name</th>
              <th className="text-center p-1 w-[15%]">Progress</th>
              <th className="text-center p-1 w-[10%]">Status</th>
              <th className="text-center p-1 w-[10%]">Factors</th>
              <th className="text-center p-1 w-[5%]">Edit</th>
            </tr>
          </thead>
          <tbody>
            {flattenedItems.map((item) => (
              <tr 
                key={item.id}
                className={`border-b hover:bg-gray-50 ${
                  item.type === 'item' ? 'cursor-pointer' : ''
                } ${
                  item.type === 'division' ? 'bg-blue-25' : 
                  item.type === 'section' ? 'bg-green-25' : 
                  item.type === 'assembly' ? 'bg-purple-25' : ''
                }`}
                onClick={() => item.type === 'item' && item.item && handleItemSelect(item.item)}
              >
                <td className="p-1">
                  <div className="flex items-center" style={{ paddingLeft: `${item.level * 8}px` }}>
                    {item.hasChildren && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleItem(item.id)
                        }}
                        className="mr-1"
                      >
                        {item.isExpanded ? 
                          <ChevronDown className="w-2 h-2" /> : 
                          <ChevronRight className="w-2 h-2" />
                        }
                      </button>
                    )}
                    <span className="font-mono mr-1">{item.code}</span>
                    <span className="truncate">{item.name}</span>
                  </div>
                </td>
                <td className="text-center p-1 text-[8px]">-</td>
                <td className="text-center p-1">
                  {item.status && (
                    <span className={`px-1 rounded text-[8px] ${
                      item.status === 'draft' ? 'bg-gray-100' :
                      item.status === 'complete' ? 'bg-yellow-100' :
                      item.status === 'confirmed' ? 'bg-blue-100' :
                      'bg-green-100'
                    }`}>
                      {item.status[0].toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="text-center p-1 text-[8px]">
                  {item.type === 'item' && (
                    <span>
                      {(item.materials?.length || 0) + (item.labor?.length || 0) + (item.equipment?.length || 0)}
                    </span>
                  )}
                </td>
                <td className="text-center p-1">
                  {item.type === 'item' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        item.item && handleItemSelect(item.item)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-[8px]"
                    >
                      ✎
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}