'use client'

import { useState } from 'react'
import FilterLayout from '@/components/layouts/FilterLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const statuses = [
  { name: 'In Progress', count: 12, color: 'default' },
  { name: 'Completed', count: 8, color: 'secondary' },
  { name: 'Review', count: 5, color: 'destructive' },
  { name: 'Planning', count: 3, color: 'outline' },
] as const

const items = [
  { id: 1, title: 'Project Alpha', status: 'In Progress', date: '2024-03-15' },
  { id: 2, title: 'Task Beta', status: 'Completed', date: '2024-03-10' },
  { id: 3, title: 'Document Review', status: 'Review', date: '2024-03-20' },
  { id: 4, title: 'Feature Planning', status: 'Planning', date: '2024-03-25' },
]

type Status = typeof statuses[number]['name']

export default function StatusFilterPage() {
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = items.filter(item => {
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const clearFilters = () => {
    setSelectedStatus(null)
    setSearchQuery('')
  }

  return (
    <FilterLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Status Filter</h1>
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
              disabled={!selectedStatus && !searchQuery}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statuses.map((status) => (
            <Card 
              key={status.name} 
              className={`p-4 cursor-pointer transition-colors ${
                selectedStatus === status.name ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedStatus(
                selectedStatus === status.name ? null : status.name
              )}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant={status.color as any}>{status.name}</Badge>
                  <span className="text-2xl font-bold">{status.count}</span>
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
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">Due: {item.date}</p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </FilterLayout>
  )
} 