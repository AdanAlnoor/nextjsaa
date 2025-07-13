'use client'

import { useState } from 'react'
import FilterLayout from '@/shared/components/layouts/FilterLayout'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Search, FileText, FolderOpen, CheckSquare } from 'lucide-react'

const types = [
  { name: 'Projects', count: 8, icon: FolderOpen },
  { name: 'Tasks', count: 24, icon: CheckSquare },
  { name: 'Documents', count: 15, icon: FileText },
] as const

const items = [
  { id: 1, title: 'Marketing Campaign', type: 'Projects', icon: FolderOpen, date: '2024-03-15' },
  { id: 2, title: 'Update Documentation', type: 'Documents', icon: FileText, date: '2024-03-10' },
  { id: 3, title: 'Review Pull Request', type: 'Tasks', icon: CheckSquare, date: '2024-03-20' },
  { id: 4, title: 'Product Roadmap', type: 'Projects', icon: FolderOpen, date: '2024-03-25' },
]

type ItemType = typeof types[number]['name']

export default function TypeFilterPage() {
  const [selectedType, setSelectedType] = useState<ItemType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = items.filter(item => {
    const matchesType = selectedType ? item.type === selectedType : true
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const clearFilters = () => {
    setSelectedType(null)
    setSearchQuery('')
  }

  return (
    <FilterLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Type Filter</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search items..." 
                className="pl-9 w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              onClick={clearFilters}
              disabled={!selectedType && !searchQuery}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {types.map((type) => (
            <Card 
              key={type.name} 
              className={`p-4 cursor-pointer transition-colors ${
                selectedType === type.name ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedType(
                selectedType === type.name ? null : type.name
              )}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <type.icon className="h-5 w-5" />
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <span className="text-2xl font-bold">{type.count}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border divide-y">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No items found matching the current filters
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">Created: {item.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            ))
          )}
        </div>
      </div>
    </FilterLayout>
  )
} 