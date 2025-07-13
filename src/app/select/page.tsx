"use client"

import { useState } from 'react'
import FilterLayout from '@/shared/components/layouts/FilterLayout'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table'

const items = [
  {
    id: 1,
    name: 'Marketing Plan',
    type: 'Document',
    status: 'Draft',
    lastModified: '2024-03-15',
  },
  {
    id: 2,
    name: 'Product Launch',
    type: 'Project',
    status: 'Active',
    lastModified: '2024-03-14',
  },
  {
    id: 3,
    name: 'Budget Review',
    type: 'Task',
    status: 'Pending',
    lastModified: '2024-03-13',
  },
]

export default function SelectPage() {
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const isAllSelected = selectedItems.length === items.length

  const toggleSelectAll = () => {
    setSelectedItems(isAllSelected ? [] : items.map(item => item.id))
  }

  const toggleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    )
  }

  return (
    <FilterLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Select Items</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={toggleSelectAll}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedItems.length > 0 && (
              <Button variant="outline" onClick={() => setSelectedItems([])}>
                Clear Selection ({selectedItems.length})
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Modified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleSelectItem(item.id)}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell>{item.lastModified}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </FilterLayout>
  )
} 