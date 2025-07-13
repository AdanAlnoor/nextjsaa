'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Separator } from '@/shared/components/ui/separator';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { LibraryItem } from '../../types/library';

type BulkOperationType = 
  | 'update_status'
  | 'adjust_prices'
  | 'change_assembly'
  | 'add_keywords'
  | 'clone_items'
  | 'update_factors'
  | 'change_supplier'
  | 'apply_discount';

interface BulkOperationConfig {
  type: BulkOperationType;
  label: string;
  description: string;
  icon: string;
  requiresInput: boolean;
  inputType?: 'text' | 'number' | 'select' | 'percentage';
  selectOptions?: { value: string; label: string }[];
}

interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  currentItem?: string;
  errors: string[];
}

const BULK_OPERATIONS: BulkOperationConfig[] = [
  {
    type: 'update_status',
    label: 'Update Status',
    description: 'Change status for all selected items',
    icon: '📋',
    requiresInput: true,
    inputType: 'select',
    selectOptions: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'actual', label: 'Actual' },
      { value: 'archived', label: 'Archived' }
    ]
  },
  {
    type: 'adjust_prices',
    label: 'Adjust Prices',
    description: 'Apply percentage increase/decrease to all costs',
    icon: '💰',
    requiresInput: true,
    inputType: 'percentage'
  },
  {
    type: 'change_assembly',
    label: 'Change Assembly',
    description: 'Move items to different assembly/division',
    icon: '📁',
    requiresInput: true,
    inputType: 'select',
    selectOptions: [
      { value: 'concrete', label: 'Concrete Work' },
      { value: 'steel', label: 'Steel Work' },
      { value: 'masonry', label: 'Masonry' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'plumbing', label: 'Plumbing' }
    ]
  },
  {
    type: 'add_keywords',
    label: 'Add Keywords',
    description: 'Add tags/keywords to all selected items',
    icon: '🏷️',
    requiresInput: true,
    inputType: 'text'
  },
  {
    type: 'clone_items',
    label: 'Clone Items',
    description: 'Create copies with new codes',
    icon: '📋',
    requiresInput: true,
    inputType: 'text'
  },
  {
    type: 'update_factors',
    label: 'Update Factors',
    description: 'Apply waste factors, productivity adjustments',
    icon: '⚙️',
    requiresInput: true,
    inputType: 'percentage'
  },
  {
    type: 'change_supplier',
    label: 'Change Supplier',
    description: 'Update supplier for material items',
    icon: '🏢',
    requiresInput: true,
    inputType: 'text'
  },
  {
    type: 'apply_discount',
    label: 'Apply Discount',
    description: 'Apply bulk discount to selected items',
    icon: '🎯',
    requiresInput: true,
    inputType: 'percentage'
  }
];

interface BulkOperationsPanelProps {
  selectedItems: LibraryItem[];
  onItemsUpdate: (items: LibraryItem[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  allItems: LibraryItem[];
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  selectedItems,
  onItemsUpdate,
  onSelectionChange,
  allItems
}) => {
  const [selectedOperation, setSelectedOperation] = useState<BulkOperationType | null>(null);
  const [operationValue, setOperationValue] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [applyToFields, setApplyToFields] = useState<string[]>(['material_cost']);

  const selectedConfig = BULK_OPERATIONS.find(op => op.type === selectedOperation);

  const handleSelectAll = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(allItems.map(item => item.id));
    }
  }, [allItems, onSelectionChange]);

  const handleClearSelection = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  }, [onSelectionChange]);

  const generatePreview = useCallback(() => {
    if (!selectedOperation || !selectedItems.length) return [];

    const preview: Array<{ item: LibraryItem; changes: Partial<LibraryItem> }> = [];

    selectedItems.forEach(item => {
      const changes: Partial<LibraryItem> = {};

      switch (selectedOperation) {
        case 'update_status':
          changes.status = operationValue as 'draft' | 'confirmed' | 'actual';
          break;

        case 'adjust_prices':
          const percentage = parseFloat(operationValue) / 100;
          applyToFields.forEach(field => {
            if (field === 'material_cost' && item.material_cost) {
              changes.material_cost = item.material_cost * (1 + percentage);
            }
            if (field === 'labor_cost' && item.labor_cost) {
              changes.labor_cost = item.labor_cost * (1 + percentage);
            }
            if (field === 'equipment_cost' && item.equipment_cost) {
              changes.equipment_cost = item.equipment_cost * (1 + percentage);
            }
          });
          break;

        case 'change_assembly':
          changes.assembly = operationValue;
          break;

        case 'add_keywords':
          const currentKeywords = item.keywords || [];
          const newKeywords = operationValue.split(',').map(k => k.trim());
          changes.keywords = [...currentKeywords, ...newKeywords];
          break;

        case 'clone_items':
          const suffix = operationValue || 'COPY';
          changes.code = `${item.code}-${suffix}`;
          changes.name = `${item.name} (${suffix})`;
          changes.status = 'draft';
          break;

        case 'update_factors':
          const factor = parseFloat(operationValue) / 100;
          if (item.material_waste_factor !== undefined) {
            changes.material_waste_factor = factor;
          }
          break;

        case 'change_supplier':
          changes.material_supplier = operationValue;
          break;

        case 'apply_discount':
          const discount = parseFloat(operationValue) / 100;
          if (item.material_cost) {
            changes.material_cost = item.material_cost * (1 - discount);
          }
          if (item.labor_cost) {
            changes.labor_cost = item.labor_cost * (1 - discount);
          }
          if (item.equipment_cost) {
            changes.equipment_cost = item.equipment_cost * (1 - discount);
          }
          break;
      }

      if (Object.keys(changes).length > 0) {
        preview.push({ item, changes });
      }
    });

    return preview;
  }, [selectedOperation, selectedItems, operationValue, applyToFields]);

  const executeOperation = useCallback(async () => {
    if (!selectedOperation || !selectedItems.length) return;

    setIsExecuting(true);
    setProgress({
      total: selectedItems.length,
      completed: 0,
      failed: 0,
      errors: []
    });

    const updatedItems = [...allItems];
    const preview = generatePreview();

    for (let i = 0; i < preview.length; i++) {
      const { item, changes } = preview[i];
      
      setProgress(prev => ({
        ...prev!,
        completed: i,
        currentItem: item.name
      }));

      try {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));

        if (selectedOperation === 'clone_items') {
          // Add new item
          const newItem: LibraryItem = {
            ...item,
            ...changes,
            id: `${item.id}-clone-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          updatedItems.push(newItem);
        } else {
          // Update existing item
          const itemIndex = updatedItems.findIndex(i => i.id === item.id);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              ...changes,
              updated_at: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        setProgress(prev => ({
          ...prev!,
          failed: prev!.failed + 1,
          errors: [...prev!.errors, `Failed to update ${item.name}: ${error}`]
        }));
      }
    }

    setProgress(prev => ({
      ...prev!,
      completed: preview.length,
      currentItem: undefined
    }));

    onItemsUpdate(updatedItems);

    // Clear selection after operation
    setTimeout(() => {
      setIsExecuting(false);
      setProgress(null);
      setSelectedOperation(null);
      setOperationValue('');
      setShowPreview(false);
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }, 2000);
  }, [selectedOperation, selectedItems, allItems, generatePreview, onItemsUpdate, onSelectionChange]);

  const preview = showPreview ? generatePreview() : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            ⚡ Bulk Operations
            {selectedItems.length > 0 && (
              <Badge variant="secondary">
                {selectedItems.length} selected
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {selectedItems.length === 0 ? (
          <Alert>
            <AlertDescription>
              Select items to perform bulk operations. You can select items from the library browser or use "Select All" above.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Operation Selection */}
            <div className="space-y-4">
              <h4 className="font-medium">Choose Operation</h4>
              <RadioGroup
                value={selectedOperation || ''}
                onValueChange={(value) => setSelectedOperation(value as BulkOperationType)}
              >
                <div className="grid grid-cols-2 gap-4">
                  {BULK_OPERATIONS.map((operation) => (
                    <div key={operation.type} className="flex items-center space-x-2">
                      <RadioGroupItem value={operation.type} id={operation.type} />
                      <Label
                        htmlFor={operation.type}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <span>{operation.icon}</span>
                        <div>
                          <div className="font-medium">{operation.label}</div>
                          <div className="text-sm text-gray-500">{operation.description}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Operation Configuration */}
            {selectedConfig && selectedConfig.requiresInput && (
              <div className="space-y-4">
                <Separator />
                <h4 className="font-medium">Configure Operation</h4>
                
                {selectedConfig.inputType === 'select' ? (
                  <Select value={operationValue} onValueChange={setOperationValue}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${selectedConfig.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedConfig.selectOptions?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={
                      selectedConfig.inputType === 'percentage' 
                        ? 'Enter percentage (e.g., 10 for +10%, -5 for -5%)'
                        : selectedConfig.inputType === 'number'
                        ? 'Enter number'
                        : 'Enter value'
                    }
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    type={selectedConfig.inputType === 'number' || selectedConfig.inputType === 'percentage' ? 'number' : 'text'}
                  />
                )}

                {/* Additional options for price adjustments */}
                {selectedOperation === 'adjust_prices' && (
                  <div className="space-y-2">
                    <Label>Apply to:</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="material_cost"
                          checked={applyToFields.includes('material_cost')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setApplyToFields([...applyToFields, 'material_cost']);
                            } else {
                              setApplyToFields(applyToFields.filter(f => f !== 'material_cost'));
                            }
                          }}
                        />
                        <Label htmlFor="material_cost">Material Cost</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="labor_cost"
                          checked={applyToFields.includes('labor_cost')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setApplyToFields([...applyToFields, 'labor_cost']);
                            } else {
                              setApplyToFields(applyToFields.filter(f => f !== 'labor_cost'));
                            }
                          }}
                        />
                        <Label htmlFor="labor_cost">Labor Cost</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="equipment_cost"
                          checked={applyToFields.includes('equipment_cost')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setApplyToFields([...applyToFields, 'equipment_cost']);
                            } else {
                              setApplyToFields(applyToFields.filter(f => f !== 'equipment_cost'));
                            }
                          }}
                        />
                        <Label htmlFor="equipment_cost">Equipment Cost</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {selectedOperation && (!selectedConfig?.requiresInput || operationValue) && (
              <div className="space-y-4">
                <Separator />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Hide Preview' : 'Preview Changes'}
                  </Button>
                  <Button
                    onClick={executeOperation}
                    disabled={isExecuting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isExecuting ? 'Executing...' : `Execute on ${selectedItems.length} items`}
                  </Button>
                </div>
              </div>
            )}

            {/* Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress.completed}/{progress.total}</span>
                </div>
                <Progress value={(progress.completed / progress.total) * 100} />
                {progress.currentItem && (
                  <div className="text-sm text-gray-600">
                    Processing: {progress.currentItem}
                  </div>
                )}
                {progress.failed > 0 && (
                  <div className="text-sm text-red-600">
                    {progress.failed} items failed
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {showPreview && preview.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <h4 className="font-medium">Preview ({preview.length} changes)</h4>
                <div className="max-h-40 overflow-auto border rounded p-2 text-sm space-y-1">
                  {preview.slice(0, 10).map(({ item, changes }, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600">
                        {Object.entries(changes).map(([key, value]) => (
                          `${key}: ${value}`
                        )).join(', ')}
                      </span>
                    </div>
                  ))}
                  {preview.length > 10 && (
                    <div className="text-gray-500">
                      ... and {preview.length - 10} more items
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};