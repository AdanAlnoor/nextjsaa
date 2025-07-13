"use client";

import { useState, useMemo, useCallback } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import EstimateItem from './EstimateItem';
import { LibraryItemSelector } from './LibraryItemSelector';
import { QuickAddToLibrary } from './QuickAddToLibrary';
import { Database } from '@/shared/types/supabase';
import { Checkbox } from "@/shared/components/ui/checkbox";
import { formatCurrency } from '@/shared/lib/utils';
import { EstimateItemWithChildren } from '@/shared/types/estimate';
import { useMutation } from 'react';
import { EstimateService } from '@/services/EstimateService';
import { toast } from 'react-hot-toast';
import { useQueryClient } from 'react-query';

type DatabaseEstimateItem = Database['public']['Tables']['estimate_items']['Row'];
type EstimateItemInsert = Database['public']['Tables']['estimate_items']['Insert'];

// Sample data structure matching database schema
const sampleData: EstimateItemWithChildren[] = [
  {
    id: '1',
    name: 'Sample Item 1',
    project_id: 'project1',
    parent_id: null,
    level: 0,
    order: 1,
    quantity: 1,
    unit: 'each',
    unit_cost: 1000,
    amount: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: null,
    is_parent: true,
    index: '1',
    material: 400,
    labour: 300,
    equipment: 150,
    overheads: 100,
    profit: 50,
    vat: 160,
    children: []
  }
];

export default function EstimateTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [isLibrarySelectorOpen, setIsLibrarySelectorOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [visibleColumns] = useState<string[]>([
    'Code',
    'Description',
    'Quantity', 
    'Unit',
    'Rate',
    'Amount',
    'Material',
    'Labour',
    'Equipment'
  ]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Memoize the calculate totals function
  const calculateTotals = useCallback((items: EstimateItemWithChildren[]) => {
    return items.reduce((acc, item) => {
      // Add current item's costs
      const amount = item.amount || 0;
      const materialCost = amount * 0.4;
      const labourCost = amount * 0.3;
      const equipmentCost = amount * 0.15;
      const overheadsCost = amount * 0.1;
      const profitCost = amount * 0.05;
      const vatCost = amount * 0.16;

      // Only include costs for Level 0 items in the total
      const shouldIncludeInTotal = item.level === 0;

      // Recursively calculate children's costs
      let childrenTotals = { amount: 0, materialCost: 0, labourCost: 0, equipmentCost: 0, overheadsCost: 0, profitCost: 0, vatCost: 0, totalCost: 0 };
      if (item.children && item.children.length > 0) {
        childrenTotals = calculateTotals(item.children);
      }

      // Return accumulated totals
      return {
        amount: acc.amount + amount + childrenTotals.amount,
        materialCost: acc.materialCost + materialCost + childrenTotals.materialCost,
        labourCost: acc.labourCost + labourCost + childrenTotals.labourCost,
        equipmentCost: acc.equipmentCost + equipmentCost + childrenTotals.equipmentCost,
        overheadsCost: acc.overheadsCost + overheadsCost + childrenTotals.overheadsCost,
        profitCost: acc.profitCost + profitCost + childrenTotals.profitCost,
        vatCost: acc.vatCost + vatCost + childrenTotals.vatCost,
        totalCost: acc.totalCost + (shouldIncludeInTotal ? amount : 0)
      };
    }, { amount: 0, materialCost: 0, labourCost: 0, equipmentCost: 0, overheadsCost: 0, profitCost: 0, vatCost: 0, totalCost: 0 });
  }, []);

  // Memoize the totals calculation
  const totals = useMemo(() => calculateTotals(sampleData), [calculateTotals]);

  // Memoize derived values
  const { builderFixedCost, allowances, markup, total } = useMemo(() => ({
    builderFixedCost: totals.amount,
    allowances: totals.materialCost + totals.labourCost + totals.equipmentCost,
    markup: totals.overheadsCost + totals.profitCost,
    total: totals.totalCost
  }), [totals]);

  // Memoize handlers
  const handleAddLibraryItem = useCallback((elementId: string) => {
    setSelectedElementId(elementId);
    setIsLibrarySelectorOpen(true);
  }, []);

  const handleItemAdded = useCallback(() => {
    // Refresh the data when an item is added
    queryClient.invalidateQueries({ queryKey: ['estimate'] });
  }, [queryClient]);

  // Filter items based on search query and status
  const filteredItems = useMemo(() => {
    return sampleData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all'; // Always true since we don't have status
      return matchesSearch && matchesStatus;
    });
  }, [sampleData, searchQuery, selectedStatus]);

  const flattenedItems = useMemo(() => {
    const items: EstimateItemWithChildren[] = [];
    const stack = [...filteredItems];
    
    while (stack.length > 0) {
      const item = stack.pop()!;
      items.push(item);
      if (item.children) {
        stack.push(...item.children);
      }
    }
    
    return items.reverse();
  }, [filteredItems]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedItems(flattenedItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  }, [flattenedItems]);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handleAddChild = useCallback((elementId: string) => {
    handleAddLibraryItem(elementId);
  }, [handleAddLibraryItem]);

  const handleImportExcel = useCallback((parentId: string, items: Partial<EstimateItemWithChildren>[]) => {
    // Here you would typically make an API call to save the imported items
    console.log('Importing Excel items:', { parentId, items });
    
    // For now, we'll just log the items
    // In a real application, you would:
    // 1. Make an API call to save the items
    // 2. Update the local state with the new items
    // 3. Show a success/error notification
  }, []);

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: async (item: Database['public']['Tables']['estimate_items']['Insert']) => {
      try {
        console.log('Mutation attempting to insert item:', JSON.stringify(item, null, 2));
        
        // Use the service method instead of direct database access
        return await EstimateService.createEstimateItem(item);
      } catch (error) {
        console.error('Error in createItemMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Mutation success, data returned:', data);
      queryClient.invalidateQueries({ queryKey: ['estimate', project.id] });
      toast.success('Item added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add item');
      console.error('Mutation error handler:', error);
    }
  })

  return (
    <div className="estimate-layout">
      {/* Header */}
      <div className="estimate-header">
        <div className="estimate-table">
          <div className="flex">
            <div className="estimate-cell estimate-cell-fixed left-0 w-12">
              <Checkbox
                checked={selectedItems.length === flattenedItems.length}
                onCheckedChange={handleSelectAll}
              />
            </div>
            <div className="estimate-cell estimate-cell-fixed left-12 w-64">
              Name
            </div>
            {visibleColumns.map((column) => (
              <div key={column} className="estimate-cell flex-1 min-w-[150px]">
                {column}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="estimate-content">
        <div className="estimate-table">
          {flattenedItems.map((item, index) => (
            <EstimateItem
              key={item.id}
              item={item}
              level={item.level}
              index={index + 1}
              isLocked={false}
              isSelected={selectedItems.includes(item.id)}
              onSelect={() => handleSelectItem(item.id)}
              onAddChild={handleAddChild}
              onImportExcel={handleImportExcel}
              visibleColumns={visibleColumns}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="estimate-footer">
        <div className="estimate-table">
          <div className="flex justify-between p-4">
            <div className="flex gap-4">
              <span>Total Items: {flattenedItems.length}</span>
              <span>Selected: {selectedItems.length}</span>
            </div>
            <div className="flex gap-4">
              <span>Total Cost: {formatCurrency(totals.totalCost)}</span>
              <span>Builder Cost: {formatCurrency(totals.amount)}</span>
            </div>
          </div>
        </div>
      </div>

      <LibraryItemSelector
        isOpen={isLibrarySelectorOpen}
        onClose={() => setIsLibrarySelectorOpen(false)}
        elementId={selectedElementId || ''}
        projectId="your-project-id" // This should come from props or context
        onItemAdded={handleItemAdded}
      />

      <QuickAddToLibrary
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onItemCreated={(libraryItemId) => {
          setIsQuickAddOpen(false);
          // Optionally auto-select the created item
        }}
      />
    </div>
  );
} 