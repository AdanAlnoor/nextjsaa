'use client'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Database } from '@/shared/types/supabase'
import { Plus, Search, ChevronDown } from 'lucide-react'

type Project = Database['public']['Tables']['projects']['Row']

export function EstimateTab({ project }: { project: Project }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ChevronDown className="h-4 w-4 mr-2" />
            Collapse all
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-8 w-[300px]"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-[30px] py-3 px-2">
                <input type="checkbox" />
              </th>
              <th className="py-3 px-4 text-left font-medium">Name</th>
              <th className="py-3 px-4 text-left font-medium">Cost Type</th>
              <th className="py-3 px-4 text-left font-medium">Status</th>
              <th className="py-3 px-4 text-left font-medium">Quantity</th>
              <th className="py-3 px-4 text-left font-medium">Unit</th>
              <th className="py-3 px-4 text-left font-medium">Unit Cost</th>
              <th className="py-3 px-4 text-left font-medium">Builder Cost</th>
            </tr>
          </thead>
          <tbody>
            {/* Add estimate items here */}
          </tbody>
        </table>
      </div>
    </div>
  )
} 