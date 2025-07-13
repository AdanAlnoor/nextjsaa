"use client"

import { useState, useEffect } from 'react'
import DefaultLayout from '@/shared/components/layouts/DefaultLayout'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Search, FolderOpen, FileText } from 'lucide-react'
import { TreeView } from '@/shared/components/common/tree-view'

// Import the TreeItem interface from the TreeView component
import type { TreeItem } from '@/shared/components/common/tree-view'

const items: TreeItem[] = [
  {
    id: 1,
    name: 'Project Documentation',
    type: 'folder',
    icon: FolderOpen,
    children: [
      {
        id: 11,
        name: 'Technical Specs',
        type: 'file',
        icon: FileText,
      },
      {
        id: 12,
        name: 'User Guide',
        type: 'file',
        icon: FileText,
      },
    ],
  },
  {
    id: 2,
    name: 'Source Code',
    type: 'folder',
    icon: FolderOpen,
    children: [
      {
        id: 21,
        name: 'Frontend',
        type: 'folder',
        icon: FolderOpen,
        children: [
          {
            id: 211,
            name: 'Components',
            type: 'file',
            icon: FileText,
          },
        ],
      },
    ],
  },
]

export default function CollapseAllPage() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <DefaultLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Project Structure</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search files..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => {
                setIsExpanded(false)
                setSearchQuery('')
              }}
            >
              Collapse All
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsExpanded(true)}
            >
              Expand All
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <TreeView 
            items={items} 
            expanded={isExpanded} 
            searchQuery={debouncedSearch}
          />
        </div>
      </div>
    </DefaultLayout>
  )
} 