'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { LibraryItem } from '../../types/library';

export interface FilterCondition {
  id: string;
  field: keyof LibraryItem;
  operator: FilterOperator;
  value: string | number | boolean;
  dataType: 'string' | 'number' | 'boolean' | 'date';
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
  createdBy: string;
  createdAt: string;
  isShared: boolean;
  usageCount: number;
}

type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with'
  | 'greater_than' 
  | 'less_than' 
  | 'greater_equal' 
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty';

const FILTERABLE_FIELDS = [
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'code', label: 'Code', type: 'string' },
  { key: 'description', label: 'Description', type: 'string' },
  { key: 'status', label: 'Status', type: 'string' },
  { key: 'type', label: 'Type', type: 'string' },
  { key: 'assembly', label: 'Assembly', type: 'string' },
  { key: 'unit', label: 'Unit', type: 'string' },
  { key: 'material_cost', label: 'Material Cost', type: 'number' },
  { key: 'labor_cost', label: 'Labor Cost', type: 'number' },
  { key: 'equipment_cost', label: 'Equipment Cost', type: 'number' },
  { key: 'material_waste_factor', label: 'Waste Factor', type: 'number' },
  { key: 'labor_productivity', label: 'Productivity', type: 'number' },
  { key: 'material_supplier', label: 'Supplier', type: 'string' },
  { key: 'keywords', label: 'Keywords', type: 'string' },
  { key: 'usage_count_30d', label: 'Usage (30d)', type: 'number' },
  { key: 'created_at', label: 'Created Date', type: 'date' },
  { key: 'updated_at', label: 'Updated Date', type: 'date' },
] as const;

const OPERATORS_BY_TYPE = {
  string: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'greater_equal', label: 'greater or equal' },
    { value: 'less_equal', label: 'less or equal' },
    { value: 'between', label: 'between' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { value: 'equals', label: 'on date' },
    { value: 'greater_than', label: 'after' },
    { value: 'less_than', label: 'before' },
    { value: 'between', label: 'between dates' },
  ],
} as const;

interface AdvancedFilterBuilderProps {
  items: LibraryItem[];
  onFiltersChange: (filteredItems: LibraryItem[]) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'>) => void;
  onDeleteFilter?: (filterId: string) => void;
  currentUserId?: string;
}

export const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  items,
  onFiltersChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  currentUserId = 'current-user'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [shareFilter, setShareFilter] = useState(false);

  // Apply filters whenever conditions change
  const filteredItems = useMemo(() => {
    if (conditions.length === 0) return items;

    return items.filter(item => {
      const results = conditions.map(condition => evaluateCondition(item, condition));
      
      if (logic === 'AND') {
        return results.every(result => result);
      } else {
        return results.some(result => result);
      }
    });
  }, [items, conditions, logic]);

  // Update parent when filtered items change
  useEffect(() => {
    onFiltersChange(filteredItems);
  }, [filteredItems, onFiltersChange]);

  // Evaluate a single condition against an item
  const evaluateCondition = (item: LibraryItem, condition: FilterCondition): boolean => {
    const itemValue = item[condition.field];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return itemValue === conditionValue;
        
      case 'not_equals':
        return itemValue !== conditionValue;
        
      case 'contains':
        return String(itemValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
        
      case 'not_contains':
        return !String(itemValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
        
      case 'starts_with':
        return String(itemValue || '').toLowerCase().startsWith(String(conditionValue).toLowerCase());
        
      case 'ends_with':
        return String(itemValue || '').toLowerCase().endsWith(String(conditionValue).toLowerCase());
        
      case 'greater_than':
        return Number(itemValue || 0) > Number(conditionValue);
        
      case 'less_than':
        return Number(itemValue || 0) < Number(conditionValue);
        
      case 'greater_equal':
        return Number(itemValue || 0) >= Number(conditionValue);
        
      case 'less_equal':
        return Number(itemValue || 0) <= Number(conditionValue);
        
      case 'is_empty':
        return itemValue === null || itemValue === undefined || itemValue === '';
        
      case 'is_not_empty':
        return itemValue !== null && itemValue !== undefined && itemValue !== '';
        
      default:
        return true;
    }
  };

  // Add new condition
  const addCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: 'name',
      operator: 'contains',
      value: '',
      dataType: 'string'
    };
    setConditions(prev => [...prev, newCondition]);
  }, []);

  // Remove condition
  const removeCondition = useCallback((conditionId: string) => {
    setConditions(prev => prev.filter(c => c.id !== conditionId));
  }, []);

  // Update condition
  const updateCondition = useCallback((conditionId: string, updates: Partial<FilterCondition>) => {
    setConditions(prev => prev.map(condition => 
      condition.id === conditionId ? { ...condition, ...updates } : condition
    ));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setConditions([]);
    setLogic('AND');
  }, []);

  // Load saved filter
  const loadSavedFilter = useCallback((savedFilter: SavedFilter) => {
    setConditions(savedFilter.conditions);
    setLogic(savedFilter.logic);
    setIsOpen(false);
  }, []);

  // Save current filter
  const saveCurrentFilter = useCallback(() => {
    if (!filterName.trim() || !onSaveFilter) return;

    const newFilter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'> = {
      name: filterName.trim(),
      description: filterDescription.trim(),
      conditions: [...conditions],
      logic,
      createdBy: currentUserId,
      isShared: shareFilter
    };

    onSaveFilter(newFilter);
    setShowSaveDialog(false);
    setFilterName('');
    setFilterDescription('');
    setShareFilter(false);
  }, [filterName, filterDescription, conditions, logic, currentUserId, shareFilter, onSaveFilter]);

  // Get field configuration
  const getFieldConfig = (fieldKey: keyof LibraryItem) => {
    return FILTERABLE_FIELDS.find(field => field.key === fieldKey);
  };

  // Get available operators for field type
  const getOperatorsForField = (fieldKey: keyof LibraryItem) => {
    const fieldConfig = getFieldConfig(fieldKey);
    if (!fieldConfig) return OPERATORS_BY_TYPE.string;
    return OPERATORS_BY_TYPE[fieldConfig.type as keyof typeof OPERATORS_BY_TYPE] || OPERATORS_BY_TYPE.string;
  };

  // Group saved filters
  const groupedFilters = useMemo(() => {
    const myFilters = savedFilters.filter(f => f.createdBy === currentUserId);
    const sharedFilters = savedFilters.filter(f => f.isShared && f.createdBy !== currentUserId);
    return { myFilters, sharedFilters };
  }, [savedFilters, currentUserId]);

  return (
    <div className="w-full space-y-4">
      {/* Filter Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                🔍 Advanced Filter
                {conditions.length > 0 && (
                  <Badge variant="secondary">{conditions.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-[600px] p-0" align="start">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Advanced Filter Builder</CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Conditions */}
                  <div className="space-y-4">
                    {conditions.map((condition, index) => {
                      const fieldConfig = getFieldConfig(condition.field);
                      const operators = getOperatorsForField(condition.field);
                      const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator);

                      return (
                        <div key={condition.id} className="flex items-center gap-2 p-3 border rounded">
                          {index > 0 && (
                            <div className="text-sm font-medium text-blue-600 mr-2">
                              {logic}
                            </div>
                          )}
                          
                          {/* Field Selection */}
                          <Select
                            value={condition.field}
                            onValueChange={(value) => {
                              const field = value as keyof LibraryItem;
                              const newFieldConfig = getFieldConfig(field);
                              const newOperators = getOperatorsForField(field);
                              updateCondition(condition.id, {
                                field,
                                dataType: newFieldConfig?.type as any || 'string',
                                operator: newOperators[0]?.value as FilterOperator,
                                value: ''
                              });
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILTERABLE_FIELDS.map(field => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator Selection */}
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(condition.id, { 
                              operator: value as FilterOperator,
                              value: ['is_empty', 'is_not_empty'].includes(value) ? '' : condition.value
                            })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Value Input */}
                          {needsValue && (
                            <Input
                              placeholder="Value"
                              value={condition.value}
                              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                              type={condition.dataType === 'number' ? 'number' : 'text'}
                              className="flex-1"
                            />
                          )}

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCondition(condition.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}

                    {/* Add Condition Button */}
                    <Button
                      variant="outline"
                      onClick={addCondition}
                      className="w-full border-dashed"
                    >
                      + Add Condition
                    </Button>
                  </div>

                  {/* Logic Selection */}
                  {conditions.length > 1 && (
                    <div className="space-y-2">
                      <Label>Logic</Label>
                      <RadioGroup value={logic} onValueChange={(value: 'AND' | 'OR') => setLogic(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="AND" id="and" />
                          <Label htmlFor="and">Match ALL conditions</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="OR" id="or" />
                          <Label htmlFor="or">Match ANY condition</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Results */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Results: {filteredItems.length} of {items.length} items
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear
                      </Button>
                      {conditions.length > 0 && onSaveFilter && (
                        <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                          Save Filter
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setIsOpen(false)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>

          {/* Saved Filters Dropdown */}
          {savedFilters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  📁 Saved Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {groupedFilters.myFilters.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-sm font-medium text-gray-500">My Filters</div>
                    {groupedFilters.myFilters.map(filter => (
                      <DropdownMenuItem
                        key={filter.id}
                        onClick={() => loadSavedFilter(filter)}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{filter.name}</div>
                          {filter.description && (
                            <div className="text-sm text-gray-500">{filter.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {filter.isShared && <Badge variant="outline" className="text-xs">Shared</Badge>}
                          {onDeleteFilter && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFilter(filter.id);
                              }}
                              className="h-6 w-6 p-0 text-red-500"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {groupedFilters.sharedFilters.length > 0 && (
                  <>
                    {groupedFilters.myFilters.length > 0 && <Separator />}
                    <div className="px-2 py-1 text-sm font-medium text-gray-500">Team Filters</div>
                    {groupedFilters.sharedFilters.map(filter => (
                      <DropdownMenuItem
                        key={filter.id}
                        onClick={() => loadSavedFilter(filter)}
                      >
                        <div>
                          <div className="font-medium">{filter.name}</div>
                          {filter.description && (
                            <div className="text-sm text-gray-500">{filter.description}</div>
                          )}
                          <div className="text-xs text-gray-400">by {filter.createdBy}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Active Filters Display */}
        {conditions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {conditions.map((condition, index) => (
              <Badge key={condition.id} variant="secondary" className="text-xs">
                {getFieldConfig(condition.field)?.label} {condition.operator} {condition.value}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(condition.id)}
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                >
                  ×
                </Button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {conditions.length > 0 && (
        <Alert>
          <AlertDescription>
            Showing {filteredItems.length} of {items.length} items matching your filters.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Filter name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="share"
                checked={shareFilter}
                onChange={(e) => setShareFilter(e.target.checked)}
              />
              <Label htmlFor="share">Share with team</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCurrentFilter} disabled={!filterName.trim()}>
                Save Filter
              </Button>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};