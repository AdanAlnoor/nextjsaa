# Phase 4: Advanced UI Components

## Student-Friendly Overview 📚

**What We're Building:** Super-powered interfaces that make working with hundreds of items as easy as working with one. Like upgrading from a regular calculator to a spreadsheet.

**Think of it like:**
- **Before**: Clicking edit on 100 items = 100 clicks
- **After**: Select all 100, edit once = done!
- **Before**: Scroll through 1000 items to find one
- **After**: Type 3 letters, instantly filtered

**Duration**: 2 days  
**Priority**: MEDIUM  
**Prerequisites**: 
- Phase 0 (Architecture Migration) completed
- Phases 1 & 2 complete for full features
- Working with library-only items now (no detail_items!)

## What Problem Does This Solve? 🤔

### Current Pain Points
1. **Repetitive Work**: Updating 50 items = 50 separate edits
2. **Slow Navigation**: Scrolling through endless lists
3. **No Keyboard Shortcuts**: Everything needs mouse clicks
4. **Poor Mobile Experience**: Desktop-only interface
5. **Limited Filtering**: Can only search by name

### The Solution
1. **Bulk Operations**: Update 50 items in one action
2. **Smart Search**: Filter by any property instantly
3. **Keyboard Power**: Tab, Enter, Shortcuts for speed
4. **Mobile Responsive**: Works on phone/tablet
5. **Advanced Filters**: Save complex searches

## How Will We Know It Works? ✅

### Test Scenario 1: Spreadsheet-Style Editing
```typescript
// What you'll do:
1. Open library in "Spreadsheet Mode"
2. See items in Excel-like grid
3. Click cell, type new value, Tab to next
4. Copy/paste between cells
5. Undo mistakes with Ctrl+Z

// How to verify:
- Editing feels like Excel/Google Sheets
- Can edit without mouse (keyboard only)
- Changes save automatically
- Can undo last 10 actions
```

### Test Scenario 2: Bulk Operations
```typescript
// What you'll do:
1. Search "concrete" (shows 45 items)
2. Click "Select All"
3. Choose "Bulk Edit" → "Add 10% to prices"
4. Confirm action
5. All 45 items updated instantly

// How to verify:
- Selection works with Shift+Click
- Progress bar shows during operation
- Can cancel mid-operation
- Success message shows "45 items updated"
```

### Test Scenario 3: Smart Filtering
```typescript
// What you'll do:
1. Click "Advanced Filter"
2. Set: Status=Confirmed AND Assembly=Concrete AND Price>100
3. Save filter as "Expensive Concrete Items"
4. Results update instantly
5. Access saved filter from dropdown

// How to verify:
- Multiple conditions work together
- Results update as you type
- Saved filters persist between sessions
- Can share filters with team

## What Gets Built - Component by Component 🔨

### 1. Spreadsheet Factor Editor
**What:** Excel-like grid for editing multiple items
**Like:** Google Sheets but for construction items

```
Spreadsheet View:
┌─────────┬───────────────┬──────┬─────────┬─────────┬──────────┐
│ Code    │ Name          │ Unit │ Material│ Labor   │ Equipment│
├─────────┼───────────────┼──────┼─────────┼─────────┼──────────┤
│CONC-C25 │Concrete C25/30│ m³   │ 105.00  │ 12.50   │ 5.00     │
│CONC-C30 │Concrete C30/37│ m³   │ 115.00  │ 12.50   │ 5.00     │
│STL-BEAM │Steel Beam IPE │ ton  │ 1200.00 │ 150.00  │ 50.00    │
└─────────┴───────────────┴──────┴─────────┴─────────┴──────────┘

Features:
✓ Click any cell to edit
✓ Tab/Arrow keys to navigate
✓ Copy/Paste (Ctrl+C/V)
✓ Undo/Redo (Ctrl+Z/Y)
✓ Auto-save every change
```

### 2. Bulk Operations Panel
**What:** Control panel for mass actions
**Like:** Photoshop batch actions for data

```
Bulk Operations Control
━━━━━━━━━━━━━━━━━━━━━
Selected: 45 items

Choose Operation:
○ Update Status     → Change all to Confirmed
○ Adjust Prices     → Add 10% to all rates
○ Change Assembly   → Move to different category
○ Add Keywords      → Tag all with "concrete"
○ Clone Items       → Create copies with new codes

[Cancel] [Preview Changes] [Execute]

Progress: [████████░░] 80% (36/45 items)
Status: ✓ 36 complete, ⚠ 0 errors
```

### 3. Library Item Selector for Estimates (NEW!)
**What:** Smart interface for adding library items to estimate elements
**Like:** Shopping cart but for construction items

```
Add Items to Element: "Foundation - Footings"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Search: [concrete_________] 🔍  Filter: [All ▼]

Results (12 items):
┌────────────────┬────────────────────┬──────┬───────┬────────┐
│ Code           │ Name               │ Unit │ Rate  │ Select │
├────────────────┼────────────────────┼──────┼───────┼────────┤
│03.10.20.01     │Concrete C25/30     │ m³   │ $150  │   □    │
│03.10.20.02     │Concrete C30/37     │ m³   │ $165  │   ☑    │
│03.20.10.05     │Rebar 16mm          │ ton  │ $1200 │   ☑    │
└────────────────┴────────────────────┴──────┴───────┴────────┘

💡 Can't find what you need? [+ Quick Add to Library]

Selected Items (2):
━━━━━━━━━━━━━━━━━━━
• 03.10.20.02 - Concrete C30/37
  Quantity: [150] m³
  
• 03.20.10.05 - Rebar 16mm  
  Quantity: [12] ton

[Cancel] [Add 2 Items to Estimate]
```

### 4. Advanced Filter Builder
**What:** Create complex search queries visually
**Like:** Email filters but for library items

```
Advanced Filter Builder
━━━━━━━━━━━━━━━━━━━━━
Add Conditions:

[Status    ▼] [equals     ▼] [Confirmed ▼] [×]
[Assembly  ▼] [contains   ▼] [Concrete   ] [×]
[Price     ▼] [greater than] [100        ] [×]
[+Add Condition]

Logic: ○ Match ALL conditions ○ Match ANY condition

Results: 23 items found

[Clear] [Save Filter] [Apply]

Saved Filters:
├── My Filters
│   ├── 🔖 High-Value Concrete
│   ├── 🔖 Draft Steel Items
│   └── 🔖 Recently Updated
└── Team Filters
    └── 🔖 Standard Materials
```

### 5. Mobile-Responsive Views
**What:** Touch-friendly interface for phones/tablets
**Like:** Mobile banking app but for construction

```
Mobile View (iPhone):
┌─────────────────┐
│ Library Items   │
│ ═══════════════ │
│ Search: [____🔍]│
│                 │
│ ┌─────────────┐ │
│ │CONC-C25    ▶│ │
│ │Concrete C25 │ │
│ │m³ • $105   │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │STL-BEAM    ▶│ │
│ │Steel Beam  │ │
│ │ton • $1200 │ │
│ └─────────────┘ │
│                 │
│ [+ New] [Filter]│
└─────────────────┘

Swipe Actions:
← Swipe left: Delete
→ Swipe right: Edit
↕ Pull down: Refresh
```

### 5. Keyboard Shortcuts System
**What:** Fast navigation without mouse
**Like:** Video game controls for data entry

```
Keyboard Shortcuts:
━━━━━━━━━━━━━━━━━
Navigation:
↑↓←→        Move between cells
Tab         Next field
Shift+Tab   Previous field
Home/End    Start/End of row

Editing:
Enter       Edit cell
Escape      Cancel edit
F2          Edit in place

Actions:
Ctrl+S      Save all
Ctrl+Z      Undo
Ctrl+Y      Redo
Ctrl+C      Copy
Ctrl+V      Paste
Ctrl+A      Select all
Delete      Clear cell

Quick Commands:
/search     Focus search
/filter     Open filters
/new        Create item
/help       Show shortcuts
```

## Step-by-Step: How Users Work With It 📝

### Bulk Price Update Workflow
```
1. User searches "steel" → 50 items shown
2. Clicks checkbox in header → All selected
3. Right-click → "Bulk Operations"
4. Selects "Adjust Prices" → "Increase by %"
5. Enters "15" → Preview shows changes
6. Clicks "Apply"

What happens:
→ Progress bar appears
→ Updates happen in batches
→ Each success marked ✓
→ Any errors shown ⚠
→ Summary: "50 items updated in 3.2 seconds"
```

### Mobile Estimate Creation
```
On construction site with iPad:
1. Open library on tablet
2. Search "foundation"
3. Tap items to add to estimate
4. Swipe to adjust quantities
5. Review on larger screen later

Touch gestures:
- Pinch to zoom in/out
- Swipe to delete/edit
- Long press for options
- Pull to refresh
```

## How to Test Everything Works 🧪

### Developer Testing
```typescript
// Test 1: Spreadsheet Performance
async function testSpreadsheetPerformance() {
  // Load 1000 items
  const items = await generateTestItems(1000);
  
  // Measure render time
  const start = performance.now();
  await renderSpreadsheet(items);
  const renderTime = performance.now() - start;
  
  // Should render in <100ms
  assert(renderTime < 100, `Slow render: ${renderTime}ms`);
  
  // Test smooth scrolling
  const scrollFPS = await measureScrollFPS();
  assert(scrollFPS > 30, "Scrolling not smooth");
}

// Test 2: Bulk Operations
async function testBulkOperations() {
  // Select 100 items
  const items = await selectItems(100);
  
  // Execute bulk update
  const result = await bulkUpdate(items, {
    operation: 'increase_price',
    value: 10 // 10%
  });
  
  // Verify all updated
  assert(result.success === 100);
  assert(result.failed === 0);
  
  // Check can undo
  await undo();
  const reverted = await getItems(items.map(i => i.id));
  assert(reverted.every(i => i.price === i.originalPrice));
}
```

### User Testing Checklist
```
□ Spreadsheet Editing
  1. Open spreadsheet view
  2. Edit 10 cells rapidly
  3. Use only keyboard (no mouse)
  4. Copy/paste between cells
  5. Undo several changes

□ Bulk Operations  
  1. Select 50+ items
  2. Apply bulk price change
  3. Watch progress bar
  4. Verify all items updated
  5. Check operation can be undone

□ Advanced Filtering
  1. Create complex filter (3+ conditions)
  2. Save filter with name
  3. Clear and reload filter
  4. Share filter with teammate
  5. Export filtered results

□ Mobile Testing
  1. Open on phone/tablet
  2. Search and filter items
  3. Use swipe gestures
  4. Edit item on mobile
  5. Verify sync with desktop

□ Keyboard Shortcuts
  1. Navigate without mouse
  2. Edit using shortcuts only
  3. Execute commands with /
  4. Test all documented shortcuts
  5. Verify shortcut help menu
```

## Common Issues and Solutions 🔧

### Issue: "Spreadsheet laggy with many items"
**Solution:**
- Enable virtualization (only render visible rows)
- Implement pagination (load 100 at a time)
- Use web workers for calculations

### Issue: "Bulk operation failed halfway"
**Solution:**
- Implement transaction rollback
- Show which items failed
- Offer retry for failed items only

### Issue: "Can't see all columns on mobile"
**Solution:**
- Horizontal scroll with momentum
- Column picker to show/hide
- Responsive column priorities

## Success Metrics 📊

Phase 4 is successful when:
1. **Speed**: Edit 100 items in <5 minutes (vs 30 min before)
2. **Efficiency**: 90% of edits use keyboard (not mouse)
3. **Mobile**: 100% features work on tablet/phone
4. **Filters**: Average filter creation <30 seconds
5. **Performance**: Smooth scrolling with 1000+ items
6. **Adoption**: 75% of users use bulk operations weekly

## Technical Implementation

### Step 1: Create Spreadsheet Factor Editor

**File**: `src/features/library/components/editors/SpreadsheetFactorEditor.tsx`

```typescript
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from '@/shared/components/ui/use-toast';
import { LibraryItem, Factor } from '../../types/library';
import { CatalogService } from '../../services/catalogService';
import { 
  Copy, 
  Paste, 
  Save, 
  Undo, 
  Redo,
  Download,
  Upload 
} from 'lucide-react';

interface SpreadsheetFactorEditorProps {
  items: LibraryItem[];
  onSave: (updates: FactorUpdate[]) => Promise<void>;
  readOnly?: boolean;
}

interface FactorUpdate {
  itemId: string;
  factors: {
    materials?: Factor[];
    labour?: Factor[];
    equipment?: Factor[];
  };
}

interface CellData {
  rowIndex: number;
  columnIndex: number;
  value: string | number;
  type: 'code' | 'name' | 'unit' | 'material' | 'labour' | 'equipment';
}

const COLUMN_WIDTHS = {
  code: 120,
  name: 250,
  unit: 80,
  factor: 100
};

const ROW_HEIGHT = 36;

export const SpreadsheetFactorEditor: React.FC<SpreadsheetFactorEditorProps> = ({
  items,
  onSave,
  readOnly = false
}) => {
  const [data, setData] = useState<Map<string, any>>(new Map());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasChanges, setHasChanges] = useState(false);
  
  const gridRef = useRef<any>(null);
  const catalogService = CatalogService.getInstance();

  // Initialize data from items
  useEffect(() => {
    const initialData = new Map();
    items.forEach(item => {
      initialData.set(item.id, {
        code: item.code,
        name: item.name,
        unit: item.unit,
        materials: item.materials || [],
        labour: item.labour || [],
        equipment: item.equipment || []
      });
    });
    setData(initialData);
  }, [items]);

  // Column definitions
  const columns = [
    { key: 'code', label: 'Code', width: COLUMN_WIDTHS.code },
    { key: 'name', label: 'Name', width: COLUMN_WIDTHS.name },
    { key: 'unit', label: 'Unit', width: COLUMN_WIDTHS.unit },
    ...getFactorColumns('materials'),
    ...getFactorColumns('labour'),
    ...getFactorColumns('equipment')
  ];

  function getFactorColumns(category: string): any[] {
    const maxFactors = Math.max(
      ...Array.from(data.values()).map(item => 
        (item[category] || []).length
      ),
      3 // Minimum 3 columns per category
    );

    return Array.from({ length: maxFactors }, (_, i) => ({
      key: `${category}_${i}`,
      label: `${category.charAt(0).toUpperCase() + category.slice(1)} ${i + 1}`,
      width: COLUMN_WIDTHS.factor,
      category,
      factorIndex: i
    }));
  }

  // Cell renderer
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const itemId = Array.from(data.keys())[rowIndex];
    const item = data.get(itemId);
    const column = columns[columnIndex];
    const cellKey = `${rowIndex}-${columnIndex}`;
    const isSelected = selectedCells.has(cellKey);
    const isEditing = editingCell === cellKey;

    if (!item) return null;

    let value = '';
    if (column.category && column.factorIndex !== undefined) {
      const factors = item[column.category] || [];
      const factor = factors[column.factorIndex];
      if (factor) {
        value = `${factor.item_id}:${factor.quantity}`;
      }
    } else {
      value = item[column.key] || '';
    }

    const handleClick = (e: React.MouseEvent) => {
      if (e.shiftKey) {
        // Range selection
        handleRangeSelection(rowIndex, columnIndex);
      } else if (e.ctrlKey || e.metaKey) {
        // Multi-selection
        handleMultiSelection(cellKey);
      } else {
        // Single selection
        setSelectedCells(new Set([cellKey]));
      }
    };

    const handleDoubleClick = () => {
      if (!readOnly && column.key !== 'code') {
        setEditingCell(cellKey);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          handleCellEdit(cellKey, (e.target as HTMLInputElement).value);
          setEditingCell(null);
          break;
        case 'Escape':
          setEditingCell(null);
          break;
        case 'Tab':
          e.preventDefault();
          navigateCell(e.shiftKey ? -1 : 1, 0);
          break;
      }
    };

    return (
      <div
        style={style}
        className={`
          border-r border-b p-2 cursor-pointer
          ${isSelected ? 'bg-blue-50' : ''}
          ${rowIndex === 0 ? 'font-semibold bg-gray-50' : ''}
          hover:bg-gray-50
        `}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <Input
            defaultValue={value}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="h-6 px-1"
          />
        ) : (
          <span className="truncate block">{value}</span>
        )}
      </div>
    );
  };

  // Handle cell editing
  const handleCellEdit = (cellKey: string, value: string) => {
    const [rowIndex, columnIndex] = cellKey.split('-').map(Number);
    const itemId = Array.from(data.keys())[rowIndex];
    const column = columns[columnIndex];
    const item = data.get(itemId);

    if (!item) return;

    const newItem = { ...item };

    if (column.category && column.factorIndex !== undefined) {
      // Parse factor value (format: "itemId:quantity")
      const [factorItemId, quantity] = value.split(':');
      if (factorItemId && quantity) {
        const factors = [...(newItem[column.category] || [])];
        factors[column.factorIndex] = {
          item_id: factorItemId,
          quantity: parseFloat(quantity)
        };
        newItem[column.category] = factors;
      }
    } else {
      newItem[column.key] = value;
    }

    const newData = new Map(data);
    newData.set(itemId, newItem);
    setData(newData);
    setHasChanges(true);
    addToHistory(newData);
  };

  // History management
  const addToHistory = (newData: Map<string, any>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setData(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setData(history[historyIndex + 1]);
    }
  };

  // Copy/Paste functionality
  const handleCopy = () => {
    const copiedData: any[] = [];
    selectedCells.forEach(cellKey => {
      const [rowIndex, columnIndex] = cellKey.split('-').map(Number);
      const itemId = Array.from(data.keys())[rowIndex];
      const item = data.get(itemId);
      const column = columns[columnIndex];
      
      if (item) {
        copiedData.push({
          cellKey,
          column: column.key,
          value: item[column.key] || ''
        });
      }
    });
    setClipboard(copiedData);
    toast({
      title: 'Copied',
      description: `${copiedData.length} cells copied to clipboard`
    });
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;

    const newData = new Map(data);
    // Paste logic implementation
    setData(newData);
    setHasChanges(true);
    addToHistory(newData);
  };

  // Save changes
  const handleSave = async () => {
    const updates: FactorUpdate[] = [];
    
    data.forEach((item, itemId) => {
      const original = items.find(i => i.id === itemId);
      if (original && hasItemChanged(original, item)) {
        updates.push({
          itemId,
          factors: {
            materials: item.materials,
            labour: item.labour,
            equipment: item.equipment
          }
        });
      }
    });

    if (updates.length > 0) {
      try {
        await onSave(updates);
        setHasChanges(false);
        toast({
          title: 'Success',
          description: `Updated ${updates.length} items`
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save changes',
          variant: 'destructive'
        });
      }
    }
  };

  const hasItemChanged = (original: LibraryItem, current: any): boolean => {
    // Compare original vs current to detect changes
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [selectedCells, clipboard]);

  // Export/Import functionality
  const handleExport = () => {
    const csvContent = exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-factors-${new Date().toISOString()}.csv`;
    a.click();
  };

  const exportToCSV = (): string => {
    const headers = columns.map(c => c.label).join(',');
    const rows = Array.from(data.values()).map(item => {
      return columns.map(column => {
        if (column.category && column.factorIndex !== undefined) {
          const factor = (item[column.category] || [])[column.factorIndex];
          return factor ? `${factor.item_id}:${factor.quantity}` : '';
        }
        return item[column.key] || '';
      }).join(',');
    });
    return [headers, ...rows].join('\n');
  };

  const handleImport = async (file: File) => {
    // CSV import logic
    const text = await file.text();
    const lines = text.split('\n');
    // Parse CSV and update data
    setHasChanges(true);
  };

  // Navigation helpers
  const navigateCell = (dx: number, dy: number) => {
    if (selectedCells.size !== 1) return;
    
    const [rowIndex, columnIndex] = Array.from(selectedCells)[0]
      .split('-')
      .map(Number);
    
    const newRow = Math.max(0, Math.min(items.length - 1, rowIndex + dy));
    const newCol = Math.max(0, Math.min(columns.length - 1, columnIndex + dx));
    
    setSelectedCells(new Set([`${newRow}-${newCol}`]));
  };

  const handleRangeSelection = (endRow: number, endCol: number) => {
    if (selectedCells.size === 0) return;
    
    const [startRow, startCol] = Array.from(selectedCells)[0]
      .split('-')
      .map(Number);
    
    const newSelection = new Set<string>();
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newSelection.add(`${r}-${c}`);
      }
    }
    
    setSelectedCells(newSelection);
  };

  const handleMultiSelection = (cellKey: string) => {
    const newSelection = new Set(selectedCells);
    if (newSelection.has(cellKey)) {
      newSelection.delete(cellKey);
    } else {
      newSelection.add(cellKey);
    }
    setSelectedCells(newSelection);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={selectedCells.size === 0}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePaste}
            disabled={clipboard.length === 0}
          >
            <Paste className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => document.getElementById('import-file')?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved changes
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || readOnly}
          >
            <Save className="w-4 h-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <Grid
          ref={gridRef}
          columnCount={columns.length}
          columnWidth={(index) => columns[index].width}
          height={600}
          rowCount={items.length}
          rowHeight={() => ROW_HEIGHT}
          width={1200}
        >
          {Cell}
        </Grid>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-t bg-gray-50 text-sm text-gray-600">
        <div>
          {selectedCells.size} cells selected
        </div>
        <div>
          {items.length} items × {columns.length} columns
        </div>
      </div>
    </div>
  );
};
```

### Step 2: Create Bulk Operations Panel

**File**: `src/features/library/components/bulk/BulkOperationsPanel.tsx`

```typescript
import React, { useState } from 'react';
import { LibraryItem } from '../../types/library';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { toast } from '@/shared/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Trash2,
  Copy,
  Edit,
  Archive
} from 'lucide-react';

interface BulkOperationsProps {
  selectedItems: LibraryItem[];
  onComplete: () => void;
}

type BulkOperation = 
  | 'confirm'
  | 'clone'
  | 'delete'
  | 'archive'
  | 'update-status'
  | 'update-assembly'
  | 'add-keywords';

interface OperationProgress {
  total: number;
  completed: number;
  failed: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  errors: string[];
}

export const BulkOperationsPanel: React.FC<BulkOperationsProps> = ({
  selectedItems,
  onComplete
}) => {
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [progress, setProgress] = useState<OperationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    status: 'idle',
    errors: []
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const libraryService = LibraryManagementService.getInstance();

  const operations = [
    {
      value: 'confirm',
      label: 'Confirm Items',
      icon: CheckCircle,
      description: 'Mark draft items as confirmed',
      color: 'green'
    },
    {
      value: 'clone',
      label: 'Clone Items',
      icon: Copy,
      description: 'Create copies of selected items',
      color: 'blue'
    },
    {
      value: 'update-status',
      label: 'Update Status',
      icon: Edit,
      description: 'Change status of multiple items',
      color: 'orange'
    },
    {
      value: 'archive',
      label: 'Archive Items',
      icon: Archive,
      description: 'Move items to archive',
      color: 'gray'
    },
    {
      value: 'delete',
      label: 'Delete Items',
      icon: Trash2,
      description: 'Permanently delete items',
      color: 'red'
    }
  ];

  const executeOperation = async () => {
    if (!selectedOperation || selectedItems.length === 0) return;

    setProgress({
      total: selectedItems.length,
      completed: 0,
      failed: 0,
      status: 'running',
      errors: []
    });

    const errors: string[] = [];
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      if (isPaused) {
        setProgress(prev => ({ ...prev, status: 'paused' }));
        return;
      }

      const item = selectedItems[i];
      
      try {
        switch (selectedOperation) {
          case 'confirm':
            await libraryService.confirmLibraryItem(item.id);
            break;
          
          case 'clone':
            await libraryService.cloneLibraryItem(item.id);
            break;
          
          case 'delete':
            await libraryService.deleteLibraryItem(item.id);
            break;
          
          case 'archive':
            await libraryService.updateLibraryItem(item.id, {
              is_active: false
            });
            break;
          
          case 'update-status':
            // Additional UI needed for status selection
            await libraryService.updateLibraryItem(item.id, {
              status: 'confirmed' // Example
            });
            break;
        }
        
        completed++;
      } catch (error: any) {
        failed++;
        errors.push(`${item.code}: ${error.message}`);
      }

      setProgress({
        total: selectedItems.length,
        completed,
        failed,
        status: 'running',
        errors
      });
    }

    setProgress(prev => ({
      ...prev,
      status: failed > 0 ? 'error' : 'completed'
    }));

    toast({
      title: failed > 0 ? 'Operation completed with errors' : 'Operation completed',
      description: `Processed ${completed} items successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      variant: failed > 0 ? 'destructive' : 'default'
    });

    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleOperationSelect = (operation: BulkOperation) => {
    setSelectedOperation(operation);
    if (operation === 'delete') {
      setShowConfirmDialog(true);
    } else {
      executeOperation();
    }
  };

  const pauseOperation = () => {
    setIsPaused(true);
    setProgress(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeOperation = () => {
    setIsPaused(false);
    executeOperation();
  };

  const resetOperation = () => {
    setProgress({
      total: 0,
      completed: 0,
      failed: 0,
      status: 'idle',
      errors: []
    });
    setSelectedOperation(null);
    setIsPaused(false);
  };

  const getProgressPercentage = () => {
    if (progress.total === 0) return 0;
    return (progress.completed / progress.total) * 100;
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'running':
        return <PlayCircle className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'paused':
        return <PauseCircle className="w-5 h-5 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Bulk Operations</h3>
            <p className="text-sm text-muted-foreground">
              {selectedItems.length} items selected
            </p>
          </div>
          {progress.status !== 'idle' && (
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Badge variant="outline">
                {progress.completed} / {progress.total}
              </Badge>
            </div>
          )}
        </div>

        {/* Operation selector */}
        {progress.status === 'idle' && (
          <div className="grid grid-cols-2 gap-2">
            {operations.map(op => {
              const Icon = op.icon;
              return (
                <Button
                  key={op.value}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleOperationSelect(op.value as BulkOperation)}
                  disabled={selectedItems.length === 0}
                >
                  <Icon className={`w-4 h-4 mr-2 text-${op.color}-500`} />
                  <div className="text-left">
                    <div className="font-medium">{op.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {op.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        )}

        {/* Progress display */}
        {progress.status !== 'idle' && (
          <div className="space-y-3">
            <Progress value={getProgressPercentage()} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {progress.completed}
                </div>
                <div className="text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {progress.total - progress.completed - progress.failed}
                </div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {progress.failed}
                </div>
                <div className="text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Error list */}
            {progress.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Errors:
                </h4>
                <ul className="text-xs text-red-700 space-y-1">
                  {progress.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {progress.errors.length > 5 && (
                    <li>• ... and {progress.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {progress.status === 'running' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={pauseOperation}
                >
                  <PauseCircle className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              )}
              {progress.status === 'paused' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resumeOperation}
                >
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Resume
                </Button>
              )}
              {(progress.status === 'completed' || progress.status === 'error') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetOperation}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.length} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowConfirmDialog(false);
                executeOperation();
              }}
            >
              Delete Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
```

### Step 3: Create Library Item Selector (NEW!)

**File**: `src/features/library/components/estimates/LibraryItemSelector.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { LibraryItem } from '../../types/library';
import { LibraryService } from '../../services/libraryService';
import { EstimateService } from '@/features/estimates/services/estimateService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { Search, Plus, AlertCircle } from 'lucide-react';
import { toast } from '@/shared/components/ui/use-toast';
import { QuickAddFromEstimateDialog } from '../management/QuickAddFromEstimateDialog';

interface LibraryItemSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementId: string;
  elementName: string;
  projectId: string;
  onSuccess: () => void;
}

interface SelectedItem {
  libraryItem: LibraryItem;
  quantity: number;
}

export const LibraryItemSelector: React.FC<LibraryItemSelectorProps> = ({
  open,
  onOpenChange,
  elementId,
  elementName,
  projectId,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [divisions, setDivisions] = useState([]);

  const libraryService = LibraryService.getInstance();
  const estimateService = EstimateService.getInstance();

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchLibrary();
    }
  }, [searchTerm]);

  const searchLibrary = async () => {
    try {
      setLoading(true);
      const results = await libraryService.searchItems({
        query: searchTerm,
        status: 'confirmed',
        limit: 20
      });
      setItems(results);
    } catch (error) {
      toast({
        title: 'Search Error',
        description: 'Failed to search library items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (item: LibraryItem, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => new Map(prev).set(item.id, {
        libraryItem: item,
        quantity: 1
      }));
    } else {
      setSelectedItems(prev => {
        const newMap = new Map(prev);
        newMap.delete(item.id);
        return newMap;
      });
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      const item = newMap.get(itemId);
      if (item) {
        newMap.set(itemId, { ...item, quantity });
      }
      return newMap;
    });
  };

  const handleAddToEstimate = async () => {
    try {
      setLoading(true);
      
      // Add each selected item to the element
      for (const [itemId, selection] of selectedItems) {
        await estimateService.addLibraryItemToElement(
          elementId,
          itemId,
          selection.quantity
        );
      }

      toast({
        title: 'Success',
        description: `Added ${selectedItems.size} items to ${elementName}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add items to estimate',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Library Items to: {elementName}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search library items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickAdd(true)}
              disabled={!searchTerm || items.length > 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              Quick Add
            </Button>
          </div>

          {searchTerm.length < 2 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2" />
              Type at least 2 characters to search
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>No items found for "{searchTerm}"</p>
              <Button
                variant="link"
                onClick={() => setShowQuickAdd(true)}
                className="mt-2"
              >
                Add it to the library
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="w-24">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const isSelected = selectedItems.has(item.id);
                    const selection = selectedItems.get(item.id);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleItemToggle(item, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.code}</Badge>
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          ${item.total_rate?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          {isSelected && (
                            <Input
                              type="number"
                              value={selection?.quantity || 1}
                              onChange={(e) => 
                                handleQuantityChange(item.id, parseFloat(e.target.value) || 1)
                              }
                              className="w-24"
                              min="0"
                              step="0.01"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedItems.size > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Selected: {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToEstimate}
              disabled={selectedItems.size === 0 || loading}
            >
              Add {selectedItems.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickAddFromEstimateDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        searchTerm={searchTerm}
        elementId={elementId}
        divisions={divisions}
        onSuccess={(itemId) => {
          setShowQuickAdd(false);
          searchLibrary(); // Refresh search
        }}
      />
    </>
  );
};
```

### Step 4: Create Advanced Filter Interface

**File**: `src/features/library/components/filters/AdvancedFilterPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { LibraryItemFilter } from '../../types/library';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Calendar } from '@/shared/components/ui/calendar';
import { format } from 'date-fns';
import {
  Filter,
  X,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  Save,
  RotateCcw
} from 'lucide-react';

interface AdvancedFilterPanelProps {
  onFilterChange: (filter: LibraryItemFilter) => void;
  divisions: Array<{ id: string; name: string; code: string }>;
  sections: Array<{ id: string; name: string; code: string; division_id: string }>;
  assemblies: Array<{ id: string; name: string; code: string; section_id: string }>;
}

interface FilterPreset {
  id: string;
  name: string;
  filter: LibraryItemFilter;
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  onFilterChange,
  divisions,
  sections,
  assemblies
}) => {
  const [filter, setFilter] = useState<LibraryItemFilter>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  // Load saved presets
  useEffect(() => {
    const stored = localStorage.getItem('library-filter-presets');
    if (stored) {
      setSavedPresets(JSON.parse(stored));
    }
  }, []);

  // Update active filters display
  useEffect(() => {
    const active = [];
    if (filter.query) active.push(`Search: "${filter.query}"`);
    if (filter.status) active.push(`Status: ${filter.status}`);
    if (filter.divisionId) {
      const division = divisions.find(d => d.id === filter.divisionId);
      if (division) active.push(`Division: ${division.name}`);
    }
    if (filter.sectionId) {
      const section = sections.find(s => s.id === filter.sectionId);
      if (section) active.push(`Section: ${section.name}`);
    }
    if (filter.assemblyId) {
      const assembly = assemblies.find(a => a.id === filter.assemblyId);
      if (assembly) active.push(`Assembly: ${assembly.name}`);
    }
    if (filter.isActive !== undefined) {
      active.push(`Active: ${filter.isActive ? 'Yes' : 'No'}`);
    }
    if (filter.hasFactors !== undefined) {
      active.push(`Has Factors: ${filter.hasFactors ? 'Yes' : 'No'}`);
    }
    setActiveFilters(active);
  }, [filter, divisions, sections, assemblies]);

  const handleFilterUpdate = (updates: Partial<LibraryItemFilter>) => {
    const newFilter = { ...filter, ...updates };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const clearFilter = (key: keyof LibraryItemFilter) => {
    const newFilter = { ...filter };
    delete newFilter[key];
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const clearAllFilters = () => {
    setFilter({});
    onFilterChange({});
    setDateRange({});
  };

  const savePreset = () => {
    if (!presetName) return;

    const preset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filter: { ...filter }
    };

    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    localStorage.setItem('library-filter-presets', JSON.stringify(updated));
    
    setShowSavePreset(false);
    setPresetName('');
  };

  const loadPreset = (preset: FilterPreset) => {
    setFilter(preset.filter);
    onFilterChange(preset.filter);
  };

  const deletePreset = (id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('library-filter-presets', JSON.stringify(updated));
  };

  // Get filtered sections and assemblies based on selection
  const filteredSections = filter.divisionId
    ? sections.filter(s => s.division_id === filter.divisionId)
    : sections;

  const filteredAssemblies = filter.sectionId
    ? assemblies.filter(a => a.section_id === filter.sectionId)
    : filter.divisionId
    ? assemblies.filter(a => {
        const section = sections.find(s => s.id === a.section_id);
        return section?.division_id === filter.divisionId;
      })
    : assemblies;

  return (
    <div className="space-y-4">
      {/* Quick search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by code, name, or keywords..."
          value={filter.query || ''}
          onChange={(e) => handleFilterUpdate({ query: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Filter groups */}
      <div className="flex flex-wrap gap-2">
        {/* Hierarchy filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Hierarchy
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <Label>Division</Label>
                <Select
                  value={filter.divisionId || ''}
                  onValueChange={(value) => {
                    handleFilterUpdate({
                      divisionId: value,
                      sectionId: undefined,
                      assemblyId: undefined
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All divisions</SelectItem>
                    {divisions.map(division => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.code} - {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Section</Label>
                <Select
                  value={filter.sectionId || ''}
                  onValueChange={(value) => {
                    handleFilterUpdate({
                      sectionId: value,
                      assemblyId: undefined
                    });
                  }}
                  disabled={filteredSections.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sections</SelectItem>
                    {filteredSections.map(section => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.code} - {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assembly</Label>
                <Select
                  value={filter.assemblyId || ''}
                  onValueChange={(value) => handleFilterUpdate({ assemblyId: value })}
                  disabled={filteredAssemblies.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All assemblies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All assemblies</SelectItem>
                    {filteredAssemblies.map(assembly => (
                      <SelectItem key={assembly.id} value={assembly.id}>
                        {assembly.code} - {assembly.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Status filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Status
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              {['draft', 'confirmed', 'actual'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={status}
                    checked={filter.status === status}
                    onCheckedChange={(checked) => {
                      handleFilterUpdate({
                        status: checked ? status as any : undefined
                      });
                    }}
                  />
                  <Label htmlFor={status} className="capitalize">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Properties filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Properties
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-active"
                  checked={filter.isActive === true}
                  onCheckedChange={(checked) => {
                    handleFilterUpdate({
                      isActive: checked ? true : undefined
                    });
                  }}
                />
                <Label htmlFor="is-active">Active items only</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-factors"
                  checked={filter.hasFactors === true}
                  onCheckedChange={(checked) => {
                    handleFilterUpdate({
                      hasFactors: checked ? true : undefined
                    });
                  }}
                />
                <Label htmlFor="has-factors">Has factors defined</Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Date filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="w-4 h-4 mr-1" />
              Date Range
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range: any) => setDateRange(range || {})}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Preset filters */}
        {savedPresets.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Saved Filters
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="space-y-2">
                {savedPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <span
                      className="flex-1"
                      onClick={() => loadPreset(preset)}
                    >
                      {preset.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePreset(preset.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Actions */}
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSavePreset(true)}
            disabled={activeFilters.length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Save Filter
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            disabled={activeFilters.length === 0}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary">
              {filter}
              <button
                className="ml-1 hover:text-red-500"
                onClick={() => {
                  // Parse and remove specific filter
                  const [key] = filter.split(':');
                  switch (key) {
                    case 'Search':
                      clearFilter('query');
                      break;
                    case 'Status':
                      clearFilter('status');
                      break;
                    case 'Division':
                      clearFilter('divisionId');
                      break;
                    case 'Section':
                      clearFilter('sectionId');
                      break;
                    case 'Assembly':
                      clearFilter('assemblyId');
                      break;
                    case 'Active':
                      clearFilter('isActive');
                      break;
                    case 'Has Factors':
                      clearFilter('hasFactors');
                      break;
                  }
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Save preset dialog */}
      {showSavePreset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
            <Input
              placeholder="Enter preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSavePreset(false);
                  setPresetName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={savePreset}
                disabled={!presetName}
              >
                Save Preset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Step 4: Create Mobile-Responsive Library View

**File**: `src/features/library/components/mobile/MobileLibraryView.tsx`

```typescript
import React, { useState } from 'react';
import { LibraryItem } from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronRight,
  Edit,
  Copy,
  Trash
} from 'lucide-react';

interface MobileLibraryViewProps {
  items: LibraryItem[];
  onItemSelect: (item: LibraryItem) => void;
  onItemEdit: (item: LibraryItem) => void;
  onItemClone: (item: LibraryItem) => void;
  onItemDelete: (item: LibraryItem) => void;
}

export const MobileLibraryView: React.FC<MobileLibraryViewProps> = ({
  items,
  onItemSelect,
  onItemEdit,
  onItemClone,
  onItemDelete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleItemClick = (item: LibraryItem) => {
    setSelectedItem(item);
    onItemSelect(item);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Library Items</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowFilters(true)}>
              <Filter className="w-4 h-4" />
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No items found
          </div>
        ) : (
          <div className="divide-y">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.code}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {item.unit}
                      </Badge>
                      <Badge 
                        variant={item.status === 'confirmed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item detail sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="h-[80vh]">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedItem.code}</SheetTitle>
                <SheetDescription>{selectedItem.name}</SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {/* Item details */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit</label>
                    <p className="text-sm">{selectedItem.unit}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-sm capitalize">{selectedItem.status}</p>
                  </div>
                  
                  {selectedItem.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="text-sm">{selectedItem.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assembly</label>
                    <p className="text-sm">
                      {selectedItem.assembly?.code} - {selectedItem.assembly?.name}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-4 border-t">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => onItemEdit(selectedItem)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Item
                  </Button>
                  
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => onItemClone(selectedItem)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Clone Item
                  </Button>
                  
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => onItemDelete(selectedItem)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Item
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
```

### Step 5: Create Drag-and-Drop Hierarchy Manager

**File**: `src/features/library/components/hierarchy/DragDropHierarchyManager.tsx`

```typescript
import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LibraryItem } from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { 
  GripVertical, 
  ChevronRight, 
  ChevronDown,
  Folder,
  File
} from 'lucide-react';

interface HierarchyNode {
  id: string;
  type: 'division' | 'section' | 'assembly' | 'item';
  name: string;
  code: string;
  children: HierarchyNode[];
  expanded: boolean;
  parentId?: string;
}

interface DragDropHierarchyManagerProps {
  data: HierarchyNode[];
  onReorder: (updatedData: HierarchyNode[]) => void;
  onMove: (itemId: string, newParentId: string) => void;
}

const SortableItem: React.FC<{
  node: HierarchyNode;
  depth: number;
  onToggle: (id: string) => void;
}> = ({ node, depth, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const getIcon = () => {
    switch (node.type) {
      case 'division':
      case 'section':
      case 'assembly':
        return <Folder className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (node.type) {
      case 'division': return 'blue';
      case 'section': return 'green';
      case 'assembly': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-2 p-2 rounded hover:bg-gray-50
        ${isDragging ? 'shadow-lg' : ''}
      `}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      
      <div
        style={{ paddingLeft: `${depth * 20}px` }}
        className="flex items-center gap-2 flex-1"
      >
        {node.children.length > 0 && (
          <button
            onClick={() => onToggle(node.id)}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {node.expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        
        {getIcon()}
        
        <span className="font-medium text-sm">{node.code}</span>
        <span className="text-sm text-gray-600">{node.name}</span>
        
        <Badge 
          variant="outline" 
          className={`ml-auto text-xs text-${getColor()}-600`}
        >
          {node.type}
        </Badge>
      </div>
    </div>
  );
};

export const DragDropHierarchyManager: React.FC<DragDropHierarchyManagerProps> = ({
  data,
  onReorder,
  onMove
}) => {
  const [hierarchyData, setHierarchyData] = useState(data);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    // Find the items being moved
    const findNode = (nodes: HierarchyNode[], id: string): HierarchyNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
      }
      return null;
    };

    const activeNode = findNode(hierarchyData, active.id as string);
    const overNode = findNode(hierarchyData, over.id as string);

    if (!activeNode || !overNode) return;

    // Determine if this is a reorder or a move
    if (activeNode.parentId === overNode.parentId) {
      // Reorder within same parent
      handleReorder(activeNode, overNode);
    } else if (canMoveToParent(activeNode, overNode)) {
      // Move to new parent
      onMove(activeNode.id, overNode.id);
    }
  };

  const canMoveToParent = (node: HierarchyNode, parent: HierarchyNode): boolean => {
    // Define rules for valid moves
    const validMoves: Record<string, string[]> = {
      'item': ['assembly'],
      'assembly': ['section'],
      'section': ['division']
    };

    return validMoves[node.type]?.includes(parent.type) || false;
  };

  const handleReorder = (activeNode: HierarchyNode, overNode: HierarchyNode) => {
    // Implementation for reordering nodes
    const updated = [...hierarchyData];
    // Reorder logic here
    setHierarchyData(updated);
    onReorder(updated);
  };

  const toggleNode = (nodeId: string) => {
    const updated = new Set(expandedNodes);
    if (updated.has(nodeId)) {
      updated.delete(nodeId);
    } else {
      updated.add(nodeId);
    }
    setExpandedNodes(updated);
  };

  const renderNodes = (nodes: HierarchyNode[], depth = 0): React.ReactNode[] => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        <SortableItem
          node={{ ...node, expanded: expandedNodes.has(node.id) }}
          depth={depth}
          onToggle={toggleNode}
        />
        {node.children.length > 0 && expandedNodes.has(node.id) && (
          <div>
            {renderNodes(node.children, depth + 1)}
          </div>
        )}
      </React.Fragment>
    ));
  };

  const getAllNodeIds = (nodes: HierarchyNode[]): string[] => {
    let ids: string[] = [];
    nodes.forEach(node => {
      ids.push(node.id);
      if (node.children.length > 0) {
        ids = [...ids, ...getAllNodeIds(node.children)];
      }
    });
    return ids;
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Library Hierarchy</h3>
        <p className="text-sm text-gray-600">
          Drag items to reorder or move between categories
        </p>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={getAllNodeIds(hierarchyData)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {renderNodes(hierarchyData)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
```

### Step 6: Add Keyboard Shortcuts Hook

**File**: `src/features/library/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    shortcuts.forEach(shortcut => {
      const isCtrlPressed = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
      const isShiftPressed = shortcut.shift ? event.shiftKey : true;
      const isAltPressed = shortcut.alt ? event.altKey : true;
      
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        isCtrlPressed &&
        isShiftPressed &&
        isAltPressed
      ) {
        event.preventDefault();
        shortcut.handler();
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

// Common library shortcuts
export const libraryShortcuts: ShortcutConfig[] = [
  {
    key: 'n',
    ctrl: true,
    handler: () => console.log('New item'),
    description: 'Create new library item'
  },
  {
    key: 'f',
    ctrl: true,
    handler: () => console.log('Focus search'),
    description: 'Focus search input'
  },
  {
    key: 's',
    ctrl: true,
    handler: () => console.log('Save'),
    description: 'Save changes'
  },
  {
    key: 'e',
    ctrl: true,
    handler: () => console.log('Edit'),
    description: 'Edit selected item'
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    handler: () => console.log('Duplicate'),
    description: 'Duplicate selected item'
  },
  {
    key: 'Delete',
    handler: () => console.log('Delete'),
    description: 'Delete selected items'
  },
  {
    key: 'a',
    ctrl: true,
    handler: () => console.log('Select all'),
    description: 'Select all items'
  },
  {
    key: 'Escape',
    handler: () => console.log('Clear selection'),
    description: 'Clear selection'
  }
];
```

### Step 7: Element Items List with Dual Rates

**File**: `src/features/estimates/components/ElementItemsList.tsx`

```typescript
import React, { useState } from 'react';
import { ElementItem } from '../../types/estimate';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { Info, Edit2, Trash2 } from 'lucide-react';

interface ElementItemsListProps {
  elementId: string;
  items: ElementItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateManualRate: (itemId: string, rate: number | null) => void;
  onRemoveItem: (itemId: string) => void;
  showActions?: boolean;
}

export const ElementItemsList: React.FC<ElementItemsListProps> = ({
  elementId,
  items,
  onUpdateQuantity,
  onUpdateManualRate,
  onRemoveItem,
  showActions = true
}) => {
  const [editingRates, setEditingRates] = useState<Set<string>>(new Set());

  const handleManualRateEdit = (itemId: string) => {
    setEditingRates(prev => new Set(prev).add(itemId));
  };

  const handleManualRateSave = (itemId: string, value: string) => {
    const rate = value ? parseFloat(value) : null;
    onUpdateManualRate(itemId, rate);
    setEditingRates(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return '-';
    return `$${value.toFixed(2)}`;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const rate = item.rate_manual || item.rate_calculated || 0;
      return sum + (item.quantity * rate);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center w-24">Qty</TableHead>
            <TableHead className="text-center w-16">Unit</TableHead>
            <TableHead className="text-right w-28">Manual Rate</TableHead>
            <TableHead className="text-right w-28">
              Calculated Rate
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Includes materials, labor, equipment</p>
                    <p>+ overheads, profit, and VAT</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="text-right w-32">Amount</TableHead>
            {showActions && <TableHead className="w-20">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => {
            const effectiveRate = item.rate_manual || item.rate_calculated || 0;
            const amount = item.quantity * effectiveRate;
            const isEditingRate = editingRates.has(item.id);

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline">{item.library_code}</Badge>
                </TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                    min="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell className="text-center">{item.unit}</TableCell>
                <TableCell className="text-right">
                  {isEditingRate ? (
                    <Input
                      type="number"
                      defaultValue={item.rate_manual || ''}
                      onBlur={(e) => handleManualRateSave(item.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualRateSave(item.id, e.currentTarget.value);
                        }
                      }}
                      className="w-24 text-right"
                      placeholder="0.00"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => handleManualRateEdit(item.id)}
                      className="w-full text-right hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      {formatCurrency(item.rate_manual)}
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {formatCurrency(item.rate_calculated)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <p>Material: ${item.rate_breakdown?.material || 0}</p>
                          <p>Labour: ${item.rate_breakdown?.labour || 0}</p>
                          <p>Equipment: ${item.rate_breakdown?.equipment || 0}</p>
                          <hr className="my-1" />
                          <p>+ Overheads & Profit</p>
                          <p>+ VAT</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(amount)}
                </TableCell>
                {showActions && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
        <tfoot>
          <TableRow>
            <TableCell colSpan={6} className="text-right font-medium">
              Total:
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatCurrency(calculateTotal())}
            </TableCell>
            {showActions && <TableCell />}
          </TableRow>
        </tfoot>
      </Table>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <p>
          Note: Amount uses manual rate if provided, otherwise calculated rate
        </p>
        <p>
          Items: {items.length}
        </p>
      </div>
    </div>
  );
};
```

## Testing Guidelines

### Component Tests

**File**: `src/features/library/components/__tests__/SpreadsheetFactorEditor.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpreadsheetFactorEditor } from '../editors/SpreadsheetFactorEditor';
import { LibraryItem } from '../../types/library';

const mockItems: LibraryItem[] = [
  {
    id: '1',
    code: 'MAT001',
    name: 'Concrete',
    unit: 'm³',
    status: 'confirmed',
    assembly_id: 'asm-1',
    materials: [
      { item_id: 'cement', quantity: 300 },
      { item_id: 'sand', quantity: 500 }
    ],
    labour: [],
    equipment: []
  }
];

describe('SpreadsheetFactorEditor', () => {
  it('renders items in spreadsheet format', () => {
    render(
      <SpreadsheetFactorEditor
        items={mockItems}
        onSave={jest.fn()}
      />
    );

    expect(screen.getByText('MAT001')).toBeInTheDocument();
    expect(screen.getByText('Concrete')).toBeInTheDocument();
  });

  it('supports cell editing', async () => {
    const onSave = jest.fn();
    render(
      <SpreadsheetFactorEditor
        items={mockItems}
        onSave={onSave}
      />
    );

    const cell = screen.getByText('cement:300');
    fireEvent.doubleClick(cell);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'cement:350' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            itemId: '1',
            factors: expect.objectContaining({
              materials: expect.arrayContaining([
                { item_id: 'cement', quantity: 350 }
              ])
            })
          })
        ])
      );
    });
  });

  it('supports copy and paste', () => {
    render(
      <SpreadsheetFactorEditor
        items={mockItems}
        onSave={jest.fn()}
      />
    );

    // Select cell
    const cell = screen.getByText('cement:300');
    fireEvent.click(cell);

    // Copy
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(screen.getByText(/1 cells copied/)).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

1. **Spreadsheet Editor**
   - [ ] Can edit cells with double-click
   - [ ] Keyboard navigation works (Tab, Arrow keys)
   - [ ] Copy/paste functionality works
   - [ ] Undo/redo maintains history
   - [ ] Export to CSV generates valid file
   - [ ] Import from CSV updates data

2. **Bulk Operations**
   - [ ] Can select multiple items
   - [ ] Operations execute with progress tracking
   - [ ] Can pause and resume operations
   - [ ] Errors are displayed clearly
   - [ ] Confirmation dialog for destructive actions

3. **Advanced Filters**
   - [ ] All filter types work correctly
   - [ ] Filter combinations apply properly
   - [ ] Can save and load filter presets
   - [ ] Active filters display correctly
   - [ ] Clear filters resets state

4. **Mobile View**
   - [ ] Responsive layout on mobile devices
   - [ ] Touch interactions work smoothly
   - [ ] Sheet drawer displays item details
   - [ ] Actions accessible on mobile

5. **Drag & Drop**
   - [ ] Can drag items to reorder
   - [ ] Valid drop zones highlighted
   - [ ] Invalid moves prevented
   - [ ] Visual feedback during drag

6. **Keyboard Shortcuts**
   - [ ] All shortcuts trigger correct actions
   - [ ] Shortcuts don't conflict with browser
   - [ ] Modifier keys work correctly
   - [ ] Help dialog shows shortcuts

## Performance Optimization

### Virtual Scrolling
- Spreadsheet uses react-window for efficient rendering
- Only visible cells are rendered in DOM
- Smooth scrolling with large datasets

### Debounced Updates
- Search input debounced to 300ms
- Batch factor updates before saving
- Optimistic UI updates with rollback

### Lazy Loading
- Load assemblies/sections on demand
- Paginate large result sets
- Progressive enhancement for mobile

## Accessibility

### Keyboard Navigation
- Full keyboard support in spreadsheet
- Tab order follows logical flow
- Focus indicators clearly visible
- Shortcuts don't override assistive tech

### Screen Reader Support
- Proper ARIA labels on interactive elements
- Live regions for status updates
- Semantic HTML structure
- Alternative text for icons

### Color Contrast
- WCAG AA compliant color choices
- Not relying solely on color for meaning
- High contrast mode support
- Focus indicators meet contrast requirements

## Next Steps

After completing this phase:

1. Proceed to [Phase 5: Testing Infrastructure](./05-TESTING-INFRASTRUCTURE.md)
2. Gather user feedback on UI components
3. Optimize performance for large datasets
4. Add more keyboard shortcuts based on usage
5. Create user documentation for advanced features

---

*Phase 4 Complete: Advanced UI components enhance productivity and user experience*