'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Separator } from '@/shared/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { LibraryItem } from '../../types/library';

interface SelectedItem extends LibraryItem {
  quantity: number;
  notes?: string;
  customRate?: number;
}

interface AdvancedLibrarySelectorProps {
  elementName?: string;
  elementId?: string;
  onItemsSelected: (items: SelectedItem[]) => void;
  availableItems: LibraryItem[];
  preSelectedItems?: SelectedItem[];
  showQuickAdd?: boolean;
  maxSelections?: number;
}

interface FilterState {
  search: string;
  category: string;
  status: string;
  priceRange: { min: number; max: number };
  assembly: string;
  type: string;
}

const ASSEMBLIES = [
  { value: 'all', label: 'All Assemblies' },
  { value: 'concrete', label: 'Concrete Work' },
  { value: 'steel', label: 'Steel Work' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'finishes', label: 'Finishes' },
];

const ITEM_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'material', label: 'Materials' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'assembly', label: 'Assemblies' },
];

export const AdvancedLibrarySelector: React.FC<AdvancedLibrarySelectorProps> = ({
  elementName,
  elementId,
  onItemsSelected,
  availableItems,
  preSelectedItems = [],
  showQuickAdd = true,
  maxSelections
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(preSelectedItems);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    status: 'all',
    priceRange: { min: 0, max: 10000 },
    assembly: 'all',
    type: 'all'
  });
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'price' | 'popularity'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddItem, setQuickAddItem] = useState({
    name: '',
    code: '',
    unit: '',
    material_cost: 0,
    labor_cost: 0,
    equipment_cost: 0
  });

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = availableItems.filter(item => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (!item.name?.toLowerCase().includes(searchTerm) && 
            !item.code?.toLowerCase().includes(searchTerm) &&
            !item.description?.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      // Assembly filter
      if (filters.assembly !== 'all' && item.assembly !== filters.assembly) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // Price range filter
      const totalCost = (item.material_cost || 0) + (item.labor_cost || 0) + (item.equipment_cost || 0);
      if (totalCost < filters.priceRange.min || totalCost > filters.priceRange.max) {
        return false;
      }

      return true;
    });

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'code':
          return (a.code || '').localeCompare(b.code || '');
        case 'price':
          const aCost = (a.material_cost || 0) + (a.labor_cost || 0) + (a.equipment_cost || 0);
          const bCost = (b.material_cost || 0) + (b.labor_cost || 0) + (b.equipment_cost || 0);
          return aCost - bCost;
        case 'popularity':
          return (b.usage_count_30d || 0) - (a.usage_count_30d || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [availableItems, filters, sortBy]);

  // Calculate total cost for an item
  const getItemTotalCost = useCallback((item: LibraryItem): number => {
    return (item.material_cost || 0) + (item.labor_cost || 0) + (item.equipment_cost || 0);
  }, []);

  // Check if item is selected
  const isItemSelected = useCallback((itemId: string): boolean => {
    return selectedItems.some(selected => selected.id === itemId);
  }, [selectedItems]);

  // Toggle item selection
  const toggleItemSelection = useCallback((item: LibraryItem) => {
    if (isItemSelected(item.id)) {
      setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
    } else {
      if (maxSelections && selectedItems.length >= maxSelections) {
        return; // Don't add if max reached
      }
      const selectedItem: SelectedItem = {
        ...item,
        quantity: 1,
        notes: ''
      };
      setSelectedItems(prev => [...prev, selectedItem]);
    }
  }, [isItemSelected, selectedItems.length, maxSelections]);

  // Update selected item quantity
  const updateSelectedItemQuantity = useCallback((itemId: string, quantity: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  }, []);

  // Update selected item notes
  const updateSelectedItemNotes = useCallback((itemId: string, notes: string) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, []);

  // Handle quick add new item
  const handleQuickAdd = useCallback(() => {
    if (!quickAddItem.name || !quickAddItem.code) return;

    const newItem: LibraryItem = {
      id: `quick-add-${Date.now()}`,
      ...quickAddItem,
      status: 'draft',
      type: 'material',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const selectedItem: SelectedItem = {
      ...newItem,
      quantity: 1,
      notes: 'Quick-added item'
    };

    setSelectedItems(prev => [...prev, selectedItem]);
    setQuickAddItem({
      name: '',
      code: '',
      unit: '',
      material_cost: 0,
      labor_cost: 0,
      equipment_cost: 0
    });
    setShowQuickAddDialog(false);
  }, [quickAddItem]);

  // Handle final selection
  const handleConfirmSelection = useCallback(() => {
    const validItems = selectedItems.filter(item => item.quantity > 0);
    onItemsSelected(validItems);
    setIsOpen(false);
  }, [selectedItems, onItemsSelected]);

  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    const totalItems = selectedItems.length;
    const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = selectedItems.reduce((sum, item) => {
      const itemCost = getItemTotalCost(item);
      return sum + (itemCost * item.quantity);
    }, 0);

    return { totalItems, totalQuantity, totalValue };
  }, [selectedItems, getItemTotalCost]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          📚 Add Library Items {elementName && `to ${elementName}`}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Select Library Items {elementName && `for ${elementName}`}</span>
            <Badge variant="secondary">
              {selectionSummary.totalItems} selected
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Panel - Item Browser */}
          <div className="flex-1 flex flex-col">
            {/* Search and Filters */}
            <div className="space-y-4 mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, code, or description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="flex-1"
                />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="popularity">Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Select value={filters.assembly} onValueChange={(value) => setFilters(prev => ({ ...prev, assembly: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSEMBLIES.map(assembly => (
                      <SelectItem key={assembly.value} value={assembly.value}>
                        {assembly.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="actual">Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items List */}
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const isSelected = isItemSelected(item.id);
                  const totalCost = getItemTotalCost(item);

                  return (
                    <Card 
                      key={item.id} 
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleItemSelection(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} readOnly />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">
                                {item.code} • {item.unit}
                                {item.assembly && (
                                  <Badge variant="outline" className="ml-2">
                                    {item.assembly}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${totalCost.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">per {item.unit}</div>
                            {item.usage_count_30d && (
                              <Badge variant="secondary" className="text-xs">
                                Used {item.usage_count_30d}x
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {filteredItems.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No items found matching your filters. Try adjusting your search criteria.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>

            {/* Quick Add Button */}
            {showQuickAdd && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowQuickAddDialog(true)}
                  className="w-full"
                >
                  💡 Can't find what you need? Quick Add to Library
                </Button>
              </div>
            )}
          </div>

          {/* Right Panel - Selected Items */}
          <div className="w-80 flex flex-col">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">
                  Selected Items ({selectionSummary.totalItems})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {selectedItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    No items selected
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-3">
                        {selectedItems.map((item) => {
                          const totalCost = getItemTotalCost(item);
                          const itemTotal = totalCost * item.quantity;

                          return (
                            <Card key={item.id} className="p-3">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 pr-2">
                                    <div className="font-medium text-sm">{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.code}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedItems(prev => 
                                      prev.filter(selected => selected.id !== item.id)
                                    )}
                                    className="h-6 w-6 p-0"
                                  >
                                    ×
                                  </Button>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <label className="text-xs">Qty:</label>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateSelectedItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                    className="h-8 w-20 text-sm"
                                    min="0"
                                  />
                                  <span className="text-xs text-gray-500">{item.unit}</span>
                                </div>

                                <div className="text-right">
                                  <div className="text-sm font-medium">${itemTotal.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">
                                    ${totalCost.toFixed(2)} × {item.quantity}
                                  </div>
                                </div>

                                <Input
                                  placeholder="Notes (optional)"
                                  value={item.notes || ''}
                                  onChange={(e) => updateSelectedItemNotes(item.id, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {/* Selection Summary */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Items:</span>
                        <span>{selectionSummary.totalItems}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Quantity:</span>
                        <span>{selectionSummary.totalQuantity}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total Value:</span>
                        <span>${selectionSummary.totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 mt-4">
                  <Button 
                    onClick={handleConfirmSelection}
                    disabled={selectedItems.length === 0}
                    className="w-full"
                  >
                    Add {selectionSummary.totalItems} Items to Estimate
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Add Dialog */}
        <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick Add to Library</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Item name"
                  value={quickAddItem.name}
                  onChange={(e) => setQuickAddItem(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Item code"
                  value={quickAddItem.code}
                  onChange={(e) => setQuickAddItem(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Unit (e.g., m³, kg, each)"
                value={quickAddItem.unit}
                onChange={(e) => setQuickAddItem(prev => ({ ...prev, unit: e.target.value }))}
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  type="number"
                  placeholder="Material cost"
                  value={quickAddItem.material_cost}
                  onChange={(e) => setQuickAddItem(prev => ({ 
                    ...prev, 
                    material_cost: parseFloat(e.target.value) || 0 
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Labor cost"
                  value={quickAddItem.labor_cost}
                  onChange={(e) => setQuickAddItem(prev => ({ 
                    ...prev, 
                    labor_cost: parseFloat(e.target.value) || 0 
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Equipment cost"
                  value={quickAddItem.equipment_cost}
                  onChange={(e) => setQuickAddItem(prev => ({ 
                    ...prev, 
                    equipment_cost: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleQuickAdd} disabled={!quickAddItem.name || !quickAddItem.code}>
                  Add to Library & Select
                </Button>
                <Button variant="outline" onClick={() => setShowQuickAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};