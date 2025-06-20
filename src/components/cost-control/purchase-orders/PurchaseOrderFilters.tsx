'use client'

import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface PurchaseOrderFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string | null
  setStatusFilter: (status: string | null) => void
  supplierFilter: string | null
  setSupplierFilter: (supplier: string | null) => void
  suppliers: string[]
}

export function PurchaseOrderFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  supplierFilter,
  setSupplierFilter,
  suppliers
}: PurchaseOrderFiltersProps) {
  const statuses = ['Draft', 'Pending', 'Approved', 'Rejected']
  
  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter(null)
    setSupplierFilter(null)
  }
  
  const hasActiveFilters = searchQuery || statusFilter || supplierFilter
  
  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:space-x-4 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search purchase orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <Select
        value={statusFilter || 'all'}
        onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={supplierFilter || 'all'}
        onValueChange={(value) => setSupplierFilter(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by supplier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suppliers</SelectItem>
          {suppliers.map((supplier) => (
            <SelectItem key={supplier} value={supplier}>
              {supplier}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="whitespace-nowrap"
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
} 