'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';

import {
  SpreadsheetFactorEditor,
  BulkOperationsPanel,
  AdvancedLibrarySelector,
  AdvancedFilterBuilder,
  MobileLibraryInterface,
  KeyboardNavigationProvider,
  useLibraryKeyboardShortcuts
} from './index';

import { LibraryItem } from '../../types/library';

// Mock data for demonstration
const generateMockLibraryItems = (): LibraryItem[] => {
  const assemblies = ['concrete', 'steel', 'masonry', 'electrical', 'plumbing', 'finishes'];
  const statuses = ['draft', 'confirmed', 'actual'];
  const types = ['material', 'labor', 'equipment', 'assembly'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `item-${i + 1}`,
    code: `ITM-${(i + 1).toString().padStart(3, '0')}`,
    name: `Library Item ${i + 1}`,
    description: `Description for library item ${i + 1}`,
    unit: ['m³', 'm²', 'kg', 'each', 'ton', 'hour'][i % 6],
    status: statuses[i % 3] as 'draft' | 'confirmed' | 'actual',
    type: types[i % 4] as 'material' | 'labor' | 'equipment' | 'assembly',
    assembly: assemblies[i % 6],
    material_cost: Math.random() * 100 + 10,
    labor_cost: Math.random() * 50 + 5,
    equipment_cost: Math.random() * 30 + 2,
    material_waste_factor: Math.random() * 0.1,
    labor_productivity: Math.random() * 2 + 0.5,
    material_supplier: `Supplier ${(i % 5) + 1}`,
    keywords: [`keyword${i % 3}`, `tag${i % 4}`],
    usage_count_30d: Math.floor(Math.random() * 20),
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

export const AdvancedUIDemo: React.FC = () => {
  const [mockItems, setMockItems] = useState<LibraryItem[]>(generateMockLibraryItems());
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>(mockItems);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedForEstimate, setSelectedForEstimate] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('spreadsheet');
  const [isMobileView, setIsMobileView] = useState(false);

  // Keyboard shortcuts
  useLibraryKeyboardShortcuts({
    onSearch: () => console.log('Focus search triggered'),
    onFilter: () => console.log('Open filters triggered'),
    onNew: () => console.log('Create new item triggered'),
    onSave: () => handleSaveChanges(),
    onSelectAll: () => setSelectedItems(filteredItems.map(item => item.id)),
    onRefresh: () => {
      setMockItems(generateMockLibraryItems());
      console.log('Data refreshed');
    },
    onToggleView: () => setIsMobileView(!isMobileView),
    onBulkEdit: () => setActiveTab('bulk'),
  });

  // Handle item updates from spreadsheet editor
  const handleItemsUpdate = useCallback((updatedItems: LibraryItem[]) => {
    setMockItems(updatedItems);
    setFilteredItems(updatedItems.filter(item => 
      filteredItems.some(filtered => filtered.id === item.id)
    ));
  }, [filteredItems]);

  // Handle filtered items change
  const handleFiltersChange = useCallback((filtered: LibraryItem[]) => {
    setFilteredItems(filtered);
  }, []);

  // Handle selection changes
  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedItems(selectedIds);
  }, []);

  // Handle items selected for estimate
  const handleItemsSelectedForEstimate = useCallback((items: any[]) => {
    setSelectedForEstimate(items);
    console.log('Items selected for estimate:', items);
  }, []);

  // Save changes
  const handleSaveChanges = useCallback(() => {
    console.log('Saving changes...', mockItems);
    // In real app, this would save to backend
  }, [mockItems]);

  // Get selected items objects
  const selectedItemsObjects = mockItems.filter(item => selectedItems.includes(item.id));

  const stats = {
    totalItems: mockItems.length,
    filteredItems: filteredItems.length,
    selectedItems: selectedItems.length,
    draftItems: mockItems.filter(item => item.status === 'draft').length,
    confirmedItems: mockItems.filter(item => item.status === 'confirmed').length,
  };

  return (
    <KeyboardNavigationProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Phase 4: Advanced UI Components Demo</h1>
              <p className="text-gray-600">
                Showcasing spreadsheet editing, bulk operations, advanced filtering, and mobile interfaces
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Badge variant="outline">{stats.totalItems} total</Badge>
                  <Badge variant="outline">{stats.filteredItems} filtered</Badge>
                  {stats.selectedItems > 0 && (
                    <Badge variant="secondary">{stats.selectedItems} selected</Badge>
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setIsMobileView(!isMobileView)}
                className="gap-2"
              >
                {isMobileView ? '🖥️ Desktop' : '📱 Mobile'} View
              </Button>
              
              <Button onClick={() => console.log('Keyboard shortcuts: Press ?')}>
                ⌨️ Shortcuts (?)
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {isMobileView ? (
          /* Mobile Interface */
          <div className="flex-1 max-w-sm mx-auto border-x bg-white">
            <MobileLibraryInterface
              items={filteredItems}
              onItemSelect={(item) => console.log('Selected item:', item)}
              onItemEdit={(item) => console.log('Edit item:', item)}
              selectedItems={selectedItems}
              onSelectionChange={handleSelectionChange}
              showBulkActions={true}
            />
          </div>
        ) : (
          /* Desktop Interface */
          <div className="flex-1 p-4 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="spreadsheet">📊 Spreadsheet Editor</TabsTrigger>
                <TabsTrigger value="bulk">⚡ Bulk Operations</TabsTrigger>
                <TabsTrigger value="selector">📚 Library Selector</TabsTrigger>
                <TabsTrigger value="filters">🔍 Advanced Filters</TabsTrigger>
                <TabsTrigger value="overview">📋 Overview</TabsTrigger>
              </TabsList>

              <div className="flex-1 mt-4 overflow-hidden">
                <TabsContent value="spreadsheet" className="h-full">
                  <SpreadsheetFactorEditor
                    items={filteredItems}
                    onItemsUpdate={handleItemsUpdate}
                    onSave={handleSaveChanges}
                  />
                </TabsContent>

                <TabsContent value="bulk" className="h-full">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                    <div className="lg:col-span-2">
                      <BulkOperationsPanel
                        selectedItems={selectedItemsObjects}
                        onItemsUpdate={handleItemsUpdate}
                        onSelectionChange={handleSelectionChange}
                        allItems={mockItems}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Selection Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Selected Items:</span>
                              <Badge>{selectedItems.length}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Value:</span>
                              <span>
                                ${selectedItemsObjects.reduce((sum, item) => 
                                  sum + (item.material_cost || 0) + (item.labor_cost || 0) + (item.equipment_cost || 0), 0
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Alert>
                        <AlertDescription>
                          💡 Use Ctrl+A to select all filtered items, or click individual items to build your selection.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="selector" className="h-full">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Library Item Selector Demo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">
                          This component would be used when adding library items to estimate elements.
                        </p>
                        
                        <AdvancedLibrarySelector
                          elementName="Foundation - Footings"
                          elementId="element-123"
                          onItemsSelected={handleItemsSelectedForEstimate}
                          availableItems={mockItems}
                          showQuickAdd={true}
                          maxSelections={10}
                        />

                        {selectedForEstimate.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Selected for Estimate:</h4>
                            <div className="space-y-2">
                              {selectedForEstimate.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-sm text-gray-500">
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="filters" className="h-full">
                  <div className="space-y-4">
                    <AdvancedFilterBuilder
                      items={mockItems}
                      onFiltersChange={handleFiltersChange}
                      savedFilters={[
                        {
                          id: 'expensive-concrete',
                          name: 'High-Value Concrete',
                          description: 'Concrete items over $100',
                          conditions: [
                            {
                              id: 'cond-1',
                              field: 'assembly',
                              operator: 'equals',
                              value: 'concrete',
                              dataType: 'string'
                            },
                            {
                              id: 'cond-2',
                              field: 'material_cost',
                              operator: 'greater_than',
                              value: 100,
                              dataType: 'number'
                            }
                          ],
                          logic: 'AND',
                          createdBy: 'demo-user',
                          createdAt: new Date().toISOString(),
                          isShared: true,
                          usageCount: 5
                        }
                      ]}
                      onSaveFilter={(filter) => console.log('Save filter:', filter)}
                      onDeleteFilter={(id) => console.log('Delete filter:', id)}
                    />

                    <Card>
                      <CardHeader>
                        <CardTitle>Filtered Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {filteredItems.slice(0, 10).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">{item.code} • {item.assembly}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  ${((item.material_cost || 0) + (item.labor_cost || 0) + (item.equipment_cost || 0)).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">{item.unit}</div>
                              </div>
                            </div>
                          ))}
                          {filteredItems.length > 10 && (
                            <div className="text-center text-gray-500 text-sm">
                              ... and {filteredItems.length - 10} more items
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="overview" className="h-full">
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{stats.totalItems}</div>
                          <div className="text-sm text-gray-500">Total Items</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{stats.filteredItems}</div>
                          <div className="text-sm text-gray-500">Filtered</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{stats.draftItems}</div>
                          <div className="text-sm text-gray-500">Draft</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{stats.confirmedItems}</div>
                          <div className="text-sm text-gray-500">Confirmed</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Features Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Phase 4: Advanced UI Components Features</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              📊 Spreadsheet Factor Editor
                            </h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Excel-like grid editing interface</li>
                              <li>• Tab/Arrow key navigation</li>
                              <li>• Copy/paste support (Ctrl+C/V)</li>
                              <li>• Undo/redo functionality (Ctrl+Z/Y)</li>
                              <li>• Auto-save with real-time updates</li>
                              <li>• Multi-tab view (Materials, Labor, Equipment)</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              ⚡ Bulk Operations Panel
                            </h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Mass update operations</li>
                              <li>• Progress tracking with retry logic</li>
                              <li>• Preview changes before execution</li>
                              <li>• Support for 8 different operation types</li>
                              <li>• Configurable field selection</li>
                              <li>• Error handling and reporting</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              📚 Advanced Library Selector
                            </h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Multi-selection with quantity input</li>
                              <li>• Real-time search and filtering</li>
                              <li>• Quick add to library feature</li>
                              <li>• Selection summary with cost calculation</li>
                              <li>• Category-based organization</li>
                              <li>• Notes and custom rates per item</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              🔍 Advanced Filter Builder
                            </h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Visual condition builder</li>
                              <li>• Save and share filter presets</li>
                              <li>• Multiple data types (string, number, date)</li>
                              <li>• AND/OR logic combinations</li>
                              <li>• Real-time result preview</li>
                              <li>• Team filter sharing capabilities</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              📱 Mobile-Responsive Interface
                            </h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Touch-optimized interactions</li>
                              <li>• Swipe gestures and touch navigation</li>
                              <li>• Mobile-first design patterns</li>
                              <li>• Bottom sheet interactions</li>
                              <li>• Responsive card and list views</li>
                              <li>• Thumb-friendly button sizing</li>
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              ⌨️ Keyboard Navigation System
                            </h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Comprehensive keyboard shortcuts</li>
                              <li>• Context-aware hotkey registration</li>
                              <li>• Visual shortcut help system (Press ?)</li>
                              <li>• Power user productivity features</li>
                              <li>• Automatic cleanup on unmount</li>
                              <li>• Cross-platform compatibility</li>
                            </ul>
                          </div>
                        </div>

                        <Separator />

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">🚀 Try These Features:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>• Press <kbd className="px-1 py-0.5 bg-white border rounded">?</kbd> for keyboard shortcuts</div>
                            <div>• Press <kbd className="px-1 py-0.5 bg-white border rounded">Ctrl+A</kbd> to select all</div>
                            <div>• Press <kbd className="px-1 py-0.5 bg-white border rounded">Ctrl+S</kbd> to save changes</div>
                            <div>• Press <kbd className="px-1 py-0.5 bg-white border rounded">F5</kbd> to refresh data</div>
                            <div>• Press <kbd className="px-1 py-0.5 bg-white border rounded">Ctrl+Shift+V</kbd> to toggle mobile view</div>
                            <div>• Press <kbd className="px-1 py-0.5 bg-white border rounded">Ctrl+B</kbd> to switch to bulk edit</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </KeyboardNavigationProvider>
  );
};