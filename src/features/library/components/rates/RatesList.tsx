/**
 * RatesList Component
 * Phase 1: Project-Specific Pricing Services
 * 
 * Displays and manages rates for a specific category (materials, labour, equipment).
 * Supports search, filtering, inline editing, and validation.
 */

"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { 
  Search, 
  Save, 
  X, 
  Edit3, 
  MoreVertical, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Loader2,
  Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RatesListProps {
  rates: Record<string, number>;
  category: 'materials' | 'labour' | 'equipment';
  editMode: boolean;
  projectId: string;
  onUpdate: (
    category: 'materials' | 'labour' | 'equipment', 
    itemCode: string, 
    rate: number,
    reason?: string
  ) => Promise<void>;
}

interface RateItem {
  itemCode: string;
  rate: number;
  catalogRate?: number;
  itemName?: string;
  unit?: string;
  variance?: number;
  variancePercent?: number;
}

export const RatesList: React.FC<RatesListProps> = ({
  rates,
  category,
  editMode,
  projectId,
  onUpdate
}) => {
  const [search, setSearch] = useState('');
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemRate, setNewItemRate] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  // Convert rates to enriched items
  const rateItems = useMemo<RateItem[]>(() => {
    return Object.entries(rates).map(([itemCode, rate]) => ({
      itemCode,
      rate,
      // TODO: In a real implementation, you would fetch catalog rates and item names
      catalogRate: undefined,
      itemName: itemCode, // Placeholder
      unit: category === 'materials' ? 'm³' : category === 'labour' ? 'hr' : 'hr',
      variance: undefined,
      variancePercent: undefined
    }));
  }, [rates, category]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return rateItems;
    
    const searchLower = search.toLowerCase();
    return rateItems.filter(item => 
      item.itemCode.toLowerCase().includes(searchLower) ||
      (item.itemName && item.itemName.toLowerCase().includes(searchLower))
    );
  }, [rateItems, search]);

  const handleEdit = useCallback((itemCode: string, value: string) => {
    setEditingRates(prev => ({ ...prev, [itemCode]: value }));
  }, []);

  const handleSave = useCallback(async (itemCode: string) => {
    const newRate = parseFloat(editingRates[itemCode]);
    
    if (isNaN(newRate) || newRate < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    const currentRate = rates[itemCode];
    if (newRate === currentRate) {
      // No change, just exit edit mode
      setEditingRates(prev => {
        const updated = { ...prev };
        delete updated[itemCode];
        return updated;
      });
      return;
    }

    setSavingItems(prev => new Set(prev).add(itemCode));
    
    try {
      await onUpdate(category, itemCode, newRate);
      
      setEditingRates(prev => {
        const updated = { ...prev };
        delete updated[itemCode];
        return updated;
      });
      
      toast.success(`${itemCode} rate updated to $${newRate.toFixed(2)}`);
    } catch (error) {
      toast.error('Failed to save rate');
    } finally {
      setSavingItems(prev => {
        const updated = new Set(prev);
        updated.delete(itemCode);
        return updated;
      });
    }
  }, [editingRates, rates, onUpdate, category]);

  const handleCancel = useCallback((itemCode: string) => {
    setEditingRates(prev => {
      const updated = { ...prev };
      delete updated[itemCode];
      return updated;
    });
  }, []);

  const handleAddNew = useCallback(async () => {
    if (!newItemCode.trim()) {
      toast.error('Please enter an item code');
      return;
    }

    const rate = parseFloat(newItemRate);
    if (isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid rate');
      return;
    }

    if (rates[newItemCode.trim()]) {
      toast.error('Item code already exists');
      return;
    }

    setAddingNew(true);
    
    try {
      await onUpdate(category, newItemCode.trim(), rate, 'New rate added');
      setNewItemCode('');
      setNewItemRate('');
      toast.success(`Added ${newItemCode} with rate $${rate.toFixed(2)}`);
    } catch (error) {
      toast.error('Failed to add new rate');
    } finally {
      setAddingNew(false);
    }
  }, [newItemCode, newItemRate, rates, onUpdate, category]);

  const getCategoryInfo = () => {
    switch (category) {
      case 'materials':
        return { 
          label: 'Materials', 
          color: 'blue',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      case 'labour':
        return { 
          label: 'Labour', 
          color: 'green',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'equipment':
        return { 
          label: 'Equipment', 
          color: 'orange',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200'
        };
    }
  };

  const { label, bgColor, textColor, borderColor } = getCategoryInfo();

  const renderVarianceIndicator = (item: RateItem) => {
    if (!item.catalogRate || !item.variance) return null;

    const isIncrease = item.variance > 0;
    const Icon = isIncrease ? TrendingUp : TrendingDown;
    const colorClass = isIncrease ? 'text-red-500' : 'text-green-500';

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs">
          {Math.abs(item.variancePercent || 0).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Add Controls */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={`Search ${label.toLowerCase()} codes or names...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {editMode && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // For now, just show the inline add form
              // In a real implementation, this might open a dialog to search catalog
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Rate
          </Button>
        )}
      </div>

      {/* Add New Rate Form (when in edit mode) */}
      {editMode && (
        <Card className={`${bgColor} ${borderColor} border`}>
          <CardContent className="pt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Item Code
                </label>
                <Input
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  placeholder="e.g., CONC-C25"
                  className="mt-1"
                />
              </div>
              <div className="w-32">
                <label className="text-sm font-medium text-muted-foreground">
                  Rate ($)
                </label>
                <Input
                  type="number"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleAddNew}
                disabled={addingNew || !newItemCode.trim() || !newItemRate}
                size="sm"
              >
                {addingNew ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rates Table */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              {search ? (
                <>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No {label.toLowerCase()} rates found matching &quot;{search}&quot;</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No custom {label.toLowerCase()} rates defined</p>
                  <p className="text-sm mt-1">Catalog rates will be used for calculations</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Custom Rate</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                {editMode && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isEditing = item.itemCode in editingRates;
                const isSaving = savingItems.has(item.itemCode);

                return (
                  <TableRow key={item.itemCode} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">
                      {item.itemCode}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{item.itemName}</span>
                        <Badge variant="outline" className={textColor}>
                          {label}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-muted-foreground">
                      {item.unit}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editingRates[item.itemCode]}
                          onChange={(e) => handleEdit(item.itemCode, e.target.value)}
                          className="w-24 ml-auto"
                          disabled={isSaving}
                          autoFocus
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <span className="font-mono font-semibold">
                          ${item.rate.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {renderVarianceIndicator(item)}
                    </TableCell>
                    
                    {editMode && (
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(item.itemCode)}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancel(item.itemCode)}
                              disabled={isSaving}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(item.itemCode, item.rate.toString())}
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit Rate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Summary */}
      {filteredItems.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {rateItems.length} {label.toLowerCase()} rates
          {search && ` matching "${search}"`}
        </div>
      )}
    </div>
  );
};