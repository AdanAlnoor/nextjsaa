'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/shared/components/ui/drawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { LibraryItem } from '../../types/library';

interface MobileLibraryInterfaceProps {
  items: LibraryItem[];
  onItemSelect?: (item: LibraryItem) => void;
  onItemEdit?: (item: LibraryItem) => void;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  showBulkActions?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: (item: LibraryItem) => void;
  variant?: 'default' | 'destructive' | 'outline';
}

export const MobileLibraryInterface: React.FC<MobileLibraryInterfaceProps> = ({
  items,
  onItemSelect,
  onItemEdit,
  selectedItems = [],
  onSelectionChange,
  showBulkActions = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'popular' | 'price'>('name');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);

  // Quick actions for mobile
  const quickActions: QuickAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: '👁️',
      action: (item) => {
        setSelectedItem(item);
        setShowItemDetail(true);
      }
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: '✏️',
      action: onItemEdit || (() => {}),
      variant: 'outline'
    },
    {
      id: 'select',
      label: 'Select',
      icon: '✓',
      action: onItemSelect || (() => {})
    }
  ];

  // Categories for filtering
  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.assembly || 'Other').filter(Boolean));
    return [
      { value: 'all', label: 'All Categories', count: items.length },
      ...Array.from(cats).map(cat => ({
        value: cat,
        label: cat,
        count: items.filter(item => item.assembly === cat).length
      }))
    ];
  }, [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!item.name?.toLowerCase().includes(term) && 
            !item.code?.toLowerCase().includes(term) &&
            !item.description?.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && item.assembly !== selectedCategory) {
        return false;
      }

      return true;
    });

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'recent':
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        case 'popular':
          return (b.usage_count_30d || 0) - (a.usage_count_30d || 0);
        case 'price':
          const aCost = (a.material_cost || 0) + (a.labor_cost || 0) + (a.equipment_cost || 0);
          const bCost = (b.material_cost || 0) + (b.labor_cost || 0) + (b.equipment_cost || 0);
          return aCost - bCost;
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchTerm, selectedCategory, sortBy]);

  // Handle item selection for bulk operations
  const toggleItemSelection = useCallback((itemId: string) => {
    if (!onSelectionChange) return;

    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    
    onSelectionChange(newSelection);
  }, [selectedItems, onSelectionChange]);

  // Calculate total cost for an item
  const getItemTotalCost = (item: LibraryItem): number => {
    return (item.material_cost || 0) + (item.labor_cost || 0) + (item.equipment_cost || 0);
  };

  // Mobile Card Component
  const MobileItemCard: React.FC<{ item: LibraryItem }> = ({ item }) => {
    const totalCost = getItemTotalCost(item);
    const isSelected = selectedItems.includes(item.id);

    return (
      <Card 
        className={`touch-manipulation ${isSelected ? 'border-blue-500 bg-blue-50' : ''}`}
        onClick={() => showBulkActions ? toggleItemSelection(item.id) : quickActions[0].action(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {showBulkActions && (
                  <div 
                    className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemSelection(item.id);
                    }}
                  >
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                )}
                <h3 className="font-semibold text-sm truncate">{item.name}</h3>
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                {item.code} • {item.unit}
              </div>

              <div className="flex items-center gap-2 mb-2">
                {item.assembly && (
                  <Badge variant="outline" className="text-xs">
                    {item.assembly}
                  </Badge>
                )}
                {item.status && (
                  <Badge 
                    variant={item.status === 'confirmed' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {item.status}
                  </Badge>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {item.description}
                </p>
              )}
            </div>

            <div className="text-right ml-4">
              <div className="font-semibold text-lg">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-gray-500">per {item.unit}</div>
              
              {!showBulkActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 h-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ⋯
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {quickActions.map(action => (
                      <DropdownMenuItem 
                        key={action.id}
                        onClick={() => action.action(item)}
                      >
                        <span className="mr-2">{action.icon}</span>
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Usage indicator */}
          {item.usage_count_30d && item.usage_count_30d > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-green-600">
                Used {item.usage_count_30d} times recently
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Mobile List Item Component
  const MobileListItem: React.FC<{ item: LibraryItem }> = ({ item }) => {
    const totalCost = getItemTotalCost(item);
    const isSelected = selectedItems.includes(item.id);

    return (
      <div 
        className={`flex items-center p-3 border-b touch-manipulation ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        onClick={() => showBulkActions ? toggleItemSelection(item.id) : quickActions[0].action(item)}
      >
        {showBulkActions && (
          <div 
            className={`w-5 h-5 border-2 rounded flex items-center justify-center mr-3 ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleItemSelection(item.id);
            }}
          >
            {isSelected && <span className="text-white text-xs">✓</span>}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{item.name}</div>
          <div className="text-xs text-gray-500">{item.code}</div>
        </div>

        <div className="text-right">
          <div className="font-semibold">${totalCost.toFixed(2)}</div>
          <div className="text-xs text-gray-500">{item.unit}</div>
        </div>

        {!showBulkActions && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2 h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(item);
              setShowItemDetail(true);
            }}
          >
            →
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search library items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  📁 {categories.find(c => c.value === selectedCategory)?.label}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[400px]">
                <SheetHeader>
                  <SheetTitle>Categories</SheetTitle>
                </SheetHeader>
                <ScrollArea className="mt-4">
                  <div className="space-y-2">
                    {categories.map(category => (
                      <div
                        key={category.value}
                        className={`flex items-center justify-between p-3 rounded border cursor-pointer ${
                          selectedCategory === category.value ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => {
                          setSelectedCategory(category.value);
                        }}
                      >
                        <span className="font-medium">{category.label}</span>
                        <Badge variant="secondary">{category.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  ↕️ Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  {sortBy === 'name' && '✓ '}Name A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('recent')}>
                  {sortBy === 'recent' && '✓ '}Recently Updated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('popular')}>
                  {sortBy === 'popular' && '✓ '}Most Popular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price')}>
                  {sortBy === 'price' && '✓ '}Price: Low to High
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              ⊞
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              ☰
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filteredItems.length} items</span>
          {showBulkActions && selectedItems.length > 0 && (
            <span>{selectedItems.length} selected</span>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredItems.length === 0 ? (
            <Alert>
              <AlertDescription>
                No items found. Try adjusting your search or filters.
              </AlertDescription>
            </Alert>
          ) : viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <MobileItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              {filteredItems.map(item => (
                <MobileListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bulk Actions Bar */}
      {showBulkActions && selectedItems.length > 0 && (
        <div className="bg-white border-t p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedItems.length} selected
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Button size="sm" variant="outline">
              Edit All
            </Button>
            <Button size="sm" variant="outline">
              Delete
            </Button>
            <Button size="sm" variant="outline">
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Drawer */}
      <Drawer open={showItemDetail} onOpenChange={setShowItemDetail}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{selectedItem?.name}</DrawerTitle>
          </DrawerHeader>
          
          {selectedItem && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Code:</span> {selectedItem.code}
                </div>
                <div>
                  <span className="font-medium">Unit:</span> {selectedItem.unit}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedItem.status}
                </div>
                <div>
                  <span className="font-medium">Assembly:</span> {selectedItem.assembly}
                </div>
              </div>

              {selectedItem.description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-sm text-gray-600 mt-1">{selectedItem.description}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Costs</h4>
                {selectedItem.material_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Material:</span>
                    <span>${selectedItem.material_cost.toFixed(2)}</span>
                  </div>
                )}
                {selectedItem.labor_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Labor:</span>
                    <span>${selectedItem.labor_cost.toFixed(2)}</span>
                  </div>
                )}
                {selectedItem.equipment_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Equipment:</span>
                    <span>${selectedItem.equipment_cost.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>${getItemTotalCost(selectedItem).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {onItemSelect && (
                  <Button onClick={() => {
                    onItemSelect(selectedItem);
                    setShowItemDetail(false);
                  }} className="flex-1">
                    Select Item
                  </Button>
                )}
                {onItemEdit && (
                  <Button variant="outline" onClick={() => {
                    onItemEdit(selectedItem);
                    setShowItemDetail(false);
                  }} className="flex-1">
                    Edit Item
                  </Button>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};