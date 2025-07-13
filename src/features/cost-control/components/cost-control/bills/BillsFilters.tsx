import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Search, X, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Calendar } from '@/shared/components/ui/calendar';
import { format } from 'date-fns';
import { createClient } from '@/shared/lib/supabase/client';
import { trackEvent, AnalyticsEventTypes } from '@/analytics/utils/analytics';

export interface BillsFiltersProps {
  filters: {
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    status?: string;
    supplier_id?: string;
    date_range?: { start: string; end: string };
    search?: string;
  };
  setFilters: (options: any) => void;
  suppliers: any[];
}

export function BillsFilters({
  filters,
  setFilters,
  suppliers
}: BillsFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    start: Date | undefined;
    end: Date | undefined;
  }>({
    start: filters.date_range?.start ? new Date(filters.date_range.start) : undefined,
    end: filters.date_range?.end ? new Date(filters.date_range.end) : undefined,
  });
  
  // Handle search input submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    trackEvent(AnalyticsEventTypes.FILTER_APPLIED, {
      type: 'search',
      value: searchInput
    });
    
    setFilters({ ...filters, search: searchInput || undefined });
  };
  
  // Handle status filter change
  const handleStatusChange = (value: string) => {
    trackEvent(AnalyticsEventTypes.FILTER_APPLIED, {
      type: 'status',
      value
    });
    
    setFilters({ ...filters, status: value === 'all' ? undefined : value });
  };
  
  // Handle supplier filter change
  const handleSupplierChange = (value: string) => {
    trackEvent(AnalyticsEventTypes.FILTER_APPLIED, {
      type: 'supplier',
      value
    });
    
    setFilters({ ...filters, supplier_id: value === 'all' ? undefined : value });
  };
  
  // Handle date range selection
  const handleDateRangeChange = (date: Date | undefined) => {
    const newRange = { ...dateRange };
    
    if (!newRange.start) {
      newRange.start = date;
    } else if (!newRange.end && date && date >= newRange.start) {
      newRange.end = date;
    } else {
      newRange.start = date;
      newRange.end = undefined;
    }
    
    setDateRange(newRange);
    
    if (newRange.start && newRange.end) {
      const formattedRange = {
        start: format(newRange.start, 'yyyy-MM-dd'),
        end: format(newRange.end, 'yyyy-MM-dd')
      };
      
      trackEvent(AnalyticsEventTypes.FILTER_APPLIED, {
        type: 'date_range',
        value: formattedRange
      });
      
      setFilters({ ...filters, date_range: formattedRange });
    }
  };
  
  // Handle clearing all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDateRange({ start: undefined, end: undefined });
    
    trackEvent(AnalyticsEventTypes.INTERACTION, {
      action: 'clear_filters',
      all: true
    });
    
    setFilters({
      ...filters,
      status: undefined,
      supplier_id: undefined,
      date_range: undefined,
      search: undefined
    });
    
    setIsOpen(false);
  };
  
  // Helper to show if filters are active
  const hasActiveFilters = () => {
    return (
      filters.status !== undefined ||
      filters.supplier_id !== undefined ||
      filters.date_range !== undefined ||
      filters.search !== undefined
    );
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search bills..."
            className="pl-9 w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-5 w-5"
              onClick={() => {
                setSearchInput('');
                if (filters.search) {
                  setFilters({ ...filters, search: undefined });
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
      
      {/* Status filter */}
      <div className="w-full md:w-40">
        <Select
          value={filters.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Partial">Partial</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Filters button/popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={`flex gap-2 ${hasActiveFilters() ? 'border-blue-500 text-blue-600' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters() && (
              <span className="bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-medium">
                {[
                  filters.supplier_id && 'Supplier',
                  filters.date_range && 'Date'
                ].filter(Boolean).length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] sm:w-[400px] p-4">
          <h3 className="font-medium mb-4">Filters</h3>
          <div className="space-y-6">
            {/* Supplier filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select 
                value={filters.supplier_id || 'all'} 
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date range filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  {dateRange.start && dateRange.end ? (
                    `${format(dateRange.start, 'PPP')} - ${format(dateRange.end, 'PPP')}`
                  ) : dateRange.start ? (
                    `From ${format(dateRange.start, 'PPP')}`
                  ) : (
                    'Select a date range'
                  )}
                </p>
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.start,
                    to: dateRange.end
                  }}
                  onSelect={(range) => {
                    setDateRange({
                      start: range?.from,
                      end: range?.to
                    });
                    
                    if (range?.from && range?.to) {
                      const formattedRange = {
                        start: format(range.from, 'yyyy-MM-dd'),
                        end: format(range.to, 'yyyy-MM-dd')
                      };
                      
                      setFilters({ ...filters, date_range: formattedRange });
                    } else if (!range) {
                      setFilters({ ...filters, date_range: undefined });
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Clear filters button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleClearFilters}
              disabled={!hasActiveFilters()}
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 