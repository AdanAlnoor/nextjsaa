'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { LibraryItem } from '../../types/library';

interface SpreadsheetCell {
  row: number;
  col: number;
  value: string;
  field: keyof LibraryItem;
  originalValue?: string;
  isEditing?: boolean;
  hasChanges?: boolean;
}

interface SpreadsheetFactorEditorProps {
  items: LibraryItem[];
  onItemsUpdate: (items: LibraryItem[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export const SpreadsheetFactorEditor: React.FC<SpreadsheetFactorEditorProps> = ({
  items,
  onItemsUpdate,
  onSave,
  readOnly = false
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<LibraryItem[][]>([]);
  const [redoStack, setRedoStack] = useState<LibraryItem[][]>([]);
  const [clipboard, setClipboard] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('materials');
  
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Define columns based on current tab
  const getColumns = () => {
    const baseColumns = [
      { key: 'code', label: 'Code', width: '120px' },
      { key: 'name', label: 'Name', width: '300px' },
      { key: 'unit', label: 'Unit', width: '80px' },
    ];

    switch (currentTab) {
      case 'materials':
        return [
          ...baseColumns,
          { key: 'material_cost', label: 'Material Cost', width: '120px' },
          { key: 'material_waste_factor', label: 'Waste %', width: '100px' },
          { key: 'material_supplier', label: 'Supplier', width: '150px' },
        ];
      case 'labor':
        return [
          ...baseColumns,
          { key: 'labor_cost', label: 'Labor Cost', width: '120px' },
          { key: 'labor_productivity', label: 'Productivity', width: '120px' },
          { key: 'labor_skill_level', label: 'Skill Level', width: '120px' },
        ];
      case 'equipment':
        return [
          ...baseColumns,
          { key: 'equipment_cost', label: 'Equipment Cost', width: '140px' },
          { key: 'equipment_depreciation', label: 'Depreciation', width: '120px' },
          { key: 'equipment_maintenance', label: 'Maintenance', width: '120px' },
        ];
      default:
        return baseColumns;
    }
  };

  const columns = getColumns();

  // Filter items based on search and tab
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by type based on tab
    switch (currentTab) {
      case 'materials':
        return matchesSearch && (item.material_cost > 0 || item.type === 'material');
      case 'labor':
        return matchesSearch && (item.labor_cost > 0 || item.type === 'labor');
      case 'equipment':
        return matchesSearch && (item.equipment_cost > 0 || item.type === 'equipment');
      default:
        return matchesSearch;
    }
  });

  // Save state for undo/redo
  const saveState = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-9), [...items]]);
    setRedoStack([]);
  }, [items]);

  // Update cell value
  const updateCellValue = useCallback((rowIndex: number, field: keyof LibraryItem, value: string) => {
    const updatedItems = [...items];
    const itemIndex = items.findIndex(item => item.id === filteredItems[rowIndex].id);
    
    if (itemIndex !== -1) {
      // Type-safe value conversion
      let processedValue: any = value;
      if (field.includes('cost') || field.includes('factor') || field.includes('productivity')) {
        processedValue = parseFloat(value) || 0;
      }
      
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        [field]: processedValue
      };
      
      onItemsUpdate(updatedItems);
    }
  }, [items, filteredItems, onItemsUpdate]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
        if (nextCol >= 0 && nextCol < columns.length) {
          setEditingCell({ row: rowIndex, col: nextCol });
        } else {
          const nextRow = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
          if (nextRow >= 0 && nextRow < filteredItems.length) {
            setEditingCell({ row: nextRow, col: e.shiftKey ? columns.length - 1 : 0 });
          }
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        const nextRowIndex = rowIndex + 1;
        if (nextRowIndex < filteredItems.length) {
          setEditingCell({ row: nextRowIndex, col: colIndex });
        } else {
          setEditingCell(null);
        }
        break;
        
      case 'Escape':
        setEditingCell(null);
        break;
        
      case 'ArrowUp':
        if (rowIndex > 0) {
          setEditingCell({ row: rowIndex - 1, col: colIndex });
        }
        break;
        
      case 'ArrowDown':
        if (rowIndex < filteredItems.length - 1) {
          setEditingCell({ row: rowIndex + 1, col: colIndex });
        }
        break;
        
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleUndo();
        }
        break;
        
      case 'y':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleRedo();
        }
        break;
        
      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleCopy(rowIndex, colIndex);
        }
        break;
        
      case 'v':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handlePaste(rowIndex, colIndex);
        }
        break;
    }
  }, [columns.length, filteredItems.length]);

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, [...items]]);
      setUndoStack(prev => prev.slice(0, -1));
      onItemsUpdate(previousState);
    }
  }, [undoStack, items, onItemsUpdate]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, [...items]]);
      setRedoStack(prev => prev.slice(0, -1));
      onItemsUpdate(nextState);
    }
  }, [redoStack, items, onItemsUpdate]);

  // Copy functionality
  const handleCopy = useCallback((rowIndex: number, colIndex: number) => {
    const item = filteredItems[rowIndex];
    const field = columns[colIndex].key as keyof LibraryItem;
    const value = item[field]?.toString() || '';
    setClipboard(value);
    navigator.clipboard?.writeText(value);
  }, [filteredItems, columns]);

  // Paste functionality
  const handlePaste = useCallback((rowIndex: number, colIndex: number) => {
    if (clipboard) {
      saveState();
      const field = columns[colIndex].key as keyof LibraryItem;
      updateCellValue(rowIndex, field, clipboard);
    }
  }, [clipboard, columns, saveState, updateCellValue]);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const getCellValue = (item: LibraryItem, field: keyof LibraryItem): string => {
    const value = item[field];
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value.toString();
    return value.toString();
  };

  const formatCellValue = (item: LibraryItem, field: keyof LibraryItem): string => {
    const value = getCellValue(item, field);
    if (field.includes('cost') && value) {
      const num = parseFloat(value);
      return isNaN(num) ? value : `$${num.toFixed(2)}`;
    }
    if (field.includes('factor') && value) {
      const num = parseFloat(value);
      return isNaN(num) ? value : `${(num * 100).toFixed(1)}%`;
    }
    return value;
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Spreadsheet Factor Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredItems.length} items
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            >
              Redo
            </Button>
            {onSave && (
              <Button onClick={onSave} size="sm">
                Save Changes
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <div className="text-sm text-gray-500">
            Use Tab/Arrow keys to navigate • Ctrl+Z/Y for undo/redo • Ctrl+C/V for copy/paste
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mx-4 mb-4">
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
          </TabsList>

          <TabsContent value={currentTab} className="mt-0">
            <div className="overflow-auto max-h-[600px]">
              <table ref={tableRef} className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50 border-b">
                  <tr>
                    {columns.map((column, colIndex) => (
                      <th
                        key={column.key}
                        className="px-3 py-2 text-left text-sm font-medium border-r border-gray-200"
                        style={{ width: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, rowIndex) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      {columns.map((column, colIndex) => {
                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                        const field = column.key as keyof LibraryItem;
                        const value = getCellValue(item, field);
                        
                        return (
                          <td
                            key={`${item.id}-${column.key}`}
                            className="px-3 py-1 border-r border-gray-200 relative cursor-cell"
                            onClick={() => !readOnly && setEditingCell({ row: rowIndex, col: colIndex })}
                          >
                            {isEditing && !readOnly ? (
                              <Input
                                ref={inputRef}
                                value={value}
                                onChange={(e) => updateCellValue(rowIndex, field, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                className="border-0 p-0 h-auto focus:ring-0 bg-blue-50"
                              />
                            ) : (
                              <div className="py-1 min-h-[24px] flex items-center">
                                {formatCellValue(item, field)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};