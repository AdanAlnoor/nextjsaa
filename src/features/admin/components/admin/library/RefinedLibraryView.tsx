'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  CheckCircle2,
  Download,
  Database,
  Folder,
  FolderOpen,
  FileText
} from 'lucide-react'

import type { Division, LibraryItem } from '@/library/types/library'
import { ItemFactorEditor } from './ItemFactorEditor'

interface RefinedLibraryViewProps {
  onItemSelect?: (item: LibraryItem) => void
}

export function RefinedLibraryView({ onItemSelect }: RefinedLibraryViewProps) {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('draft')

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

  const handleItemSelect = (item: LibraryItem) => {
    if (onItemSelect) {
      onItemSelect(item)
    } else {
      setSelectedItem(item)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'incomplete':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'actual':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading library...</p>
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
          fetchDivisions()
        }}
      />
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white border-b -mx-3 sm:-mx-6 mb-6">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">Construction Library System</h1>
              </div>
              <p className="text-gray-600">4-Level Hierarchy with Standardized Catalogue Foundation</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Title Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Construction Library - Primary Reference for All Estimates
          </h2>
          <p className="text-gray-600">
            Manage your draft library items and confirm them for production use. All estimates start here.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('draft')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'draft'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Draft Library
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent
            </div>
          </button>
          <button
            onClick={() => setActiveTab('catalogues')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'catalogues'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Catalogues
            </div>
          </button>
        </div>

        {/* Workflow Status */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Library Completion Workflow</h3>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-700">Incomplete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Actual Library</span>
            </div>
          </div>
        </div>

        {/* Library Hierarchy */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {divisions.map((division) => (
            <Card key={division.id} className="overflow-hidden border-l-4 border-l-blue-500">
              {/* Division Header */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleDivision(division.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedDivisions.has(division.id) ? 
                    <ChevronDown className="w-5 h-5 text-gray-600" /> : 
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  }
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    {expandedDivisions.has(division.id) ? 
                      <FolderOpen className="w-4 h-4 text-blue-600" /> :
                      <Folder className="w-4 h-4 text-blue-600" />
                    }
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{division.code} - {division.name}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      {division.confirmedItems}/{division.totalItems} confirmed
                    </div>
                    <Progress 
                      value={division.totalItems > 0 ? (division.confirmedItems / division.totalItems) * 100 : 0} 
                      className="w-24 h-2" 
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">{division.totalItems} items</div>
                  </div>
                </div>
              </div>

              {/* Division Content */}
              {expandedDivisions.has(division.id) && (
                <div className="border-t bg-gray-50">
                  {division.sections.map((section) => (
                    <div key={section.id} className="border-b last:border-b-0">
                      {/* Section Header */}
                      <div 
                        className="flex items-center justify-between p-4 pl-12 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.has(section.id) ? 
                            <ChevronDown className="w-4 h-4 text-gray-600" /> : 
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          }
                          <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                            {expandedSections.has(section.id) ? 
                              <FolderOpen className="w-3 h-3 text-green-600" /> :
                              <Folder className="w-3 h-3 text-green-600" />
                            }
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-800">{section.code} - {section.name}</h5>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">
                              {section.confirmedItems}/{section.totalItems} confirmed
                            </div>
                            <Progress 
                              value={section.totalItems > 0 ? (section.confirmedItems / section.totalItems) * 100 : 0} 
                              className="w-20 h-1.5" 
                            />
                          </div>
                          <div className="text-right">
                            <div className="text-base font-medium text-gray-900">{section.totalItems} items</div>
                          </div>
                        </div>
                      </div>

                      {/* Section Assemblies */}
                      {expandedSections.has(section.id) && (
                        <div className="bg-white">
                          {section.assemblies.map((assembly) => (
                            <div key={assembly.id} className="flex items-center justify-between p-4 pl-20 border-b last:border-b-0 hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center">
                                  <FileText className="w-3 h-3 text-orange-600" />
                                </div>
                                <div>
                                  <h6 className="text-sm font-medium text-gray-800">{assembly.code} - {assembly.name}</h6>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {assembly.confirmedItems}/{assembly.totalItems} confirmed
                                  </div>
                                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 transition-all duration-300"
                                      style={{ width: `${assembly.totalItems > 0 ? (assembly.confirmedItems / assembly.totalItems) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">{assembly.totalItems} items</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}