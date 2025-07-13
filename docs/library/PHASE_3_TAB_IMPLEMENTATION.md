# Phase 3: Tab Implementation

## Overview

This phase implements the four main tabs of the estimate system:
1. BQ Tab (Bill of Quantities) - Main data entry
2. Materials Tab - Auto-calculated material schedule
3. Labour Tab - Auto-calculated workforce requirements
4. Equipment Tab - Auto-calculated equipment schedule

## Tab Architecture

### Data Flow
```
Library System (Master Data with Factors)
    ↓
BQ Tab (User Input)
├── Structure Selection/Creation
├── Element Selection/Creation
├── Library Item Selection
└── Quantity Entry
    ↓
Automatic Calculations
    ├── Materials Tab
    ├── Labour Tab
    └── Equipment Tab
```

## 1. BQ Tab Implementation

### Component Structure
```typescript
// src/features/estimates/components/tabs/BQTab/
├── BQTab.tsx
├── components/
│   ├── StructureSelector/
│   ├── ElementSelector/
│   ├── LibraryBrowser/
│   └── BQGrid/
└── hooks/
    ├── useBQData.ts
    └── useBQCalculations.ts
```

### Main Component
```typescript
// src/features/estimates/components/tabs/BQTab/BQTab.tsx

interface BQTabProps {
  projectId: string;
}

export function BQTab({ projectId }: BQTabProps) {
  const {
    structures,
    elements,
    selectedItems,
    isLoading,
    error,
    addStructure,
    addElement,
    selectLibraryItems,
    updateQuantity
  } = useBQData(projectId);

  const { totals, calculateTotals } = useBQCalculations();

  return (
    <div className="flex flex-col gap-4">
      <StructureSelector
        structures={structures}
        onAdd={addStructure}
      />
      
      <ElementSelector
        elements={elements}
        onAdd={addElement}
      />
      
      <LibraryBrowser
        selectedItems={selectedItems}
        onSelect={selectLibraryItems}
      />
      
      <BQGrid
        items={selectedItems}
        onQuantityChange={updateQuantity}
        totals={totals}
      />
    </div>
  );
}
```

### BQ Grid Component
```typescript
// src/features/estimates/components/tabs/BQTab/components/BQGrid/BQGrid.tsx

interface BQGridProps {
  items: BQItem[];
  onQuantityChange: (id: string, quantity: number) => void;
  totals: BQTotals;
}

export function BQGrid({ items, onQuantityChange, totals }: BQGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell>Code/Index</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Quantity</TableCell>
          <TableCell>Unit</TableCell>
          <TableCell>Rate (Manual)</TableCell>
          <TableCell>Rate (Calculated)</TableCell>
          <TableCell>Amount (Manual)</TableCell>
          <TableCell>Amount (Calculated)</TableCell>
        </TableRow>
      </TableHeader>
      
      <TableBody>
        {items.map(item => (
          <BQGridRow
            key={item.id}
            item={item}
            onQuantityChange={onQuantityChange}
          />
        ))}
        
        <BQTotalsRow totals={totals} />
      </TableBody>
    </Table>
  );
}
```

## 2. Materials Tab Implementation

### Component Structure
```typescript
// src/features/estimates/components/tabs/MaterialsTab/
├── MaterialsTab.tsx
├── components/
│   ├── MaterialScheduleGrid/
│   ├── MaterialFilters/
│   └── MaterialSummary/
└── hooks/
    └── useMaterialSchedule.ts
```

### Main Component
```typescript
// src/features/estimates/components/tabs/MaterialsTab/MaterialsTab.tsx

interface MaterialsTabProps {
  projectId: string;
}

export function MaterialsTab({ projectId }: MaterialsTabProps) {
  const {
    materials,
    isLoading,
    error,
    filters,
    updateFilters,
    exportSchedule
  } = useMaterialSchedule(projectId);

  return (
    <div className="flex flex-col gap-4">
      <MaterialFilters
        filters={filters}
        onChange={updateFilters}
      />
      
      <MaterialScheduleGrid
        materials={materials}
        isLoading={isLoading}
      />
      
      <MaterialSummary
        materials={materials}
        onExport={exportSchedule}
      />
    </div>
  );
}
```

### Material Schedule Grid
```typescript
// src/features/estimates/components/tabs/MaterialsTab/components/MaterialScheduleGrid/MaterialScheduleGrid.tsx

interface MaterialScheduleGridProps {
  materials: MaterialScheduleItem[];
  isLoading: boolean;
}

export function MaterialScheduleGrid({ materials, isLoading }: MaterialScheduleGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell>Code</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Source Items</TableCell>
          <TableCell>Base Quantity</TableCell>
          <TableCell>Wastage Factor</TableCell>
          <TableCell>Total Quantity</TableCell>
          <TableCell>Unit</TableCell>
          <TableCell>Rate (Market)</TableCell>
          <TableCell>Rate (Contract)</TableCell>
          <TableCell>Amount (Market)</TableCell>
          <TableCell>Amount (Contract)</TableCell>
        </TableRow>
      </TableHeader>
      
      <TableBody>
        {materials.map(material => (
          <MaterialScheduleRow
            key={material.id}
            material={material}
          />
        ))}
      </TableBody>
    </Table>
  );
}
```

## 3. Labour Tab Implementation

### Component Structure
```typescript
// src/features/estimates/components/tabs/LabourTab/
├── LabourTab.tsx
├── components/
│   ├── LabourScheduleGrid/
│   ├── TradeFilters/
│   └── LabourSummary/
└── hooks/
    └── useLabourSchedule.ts
```

### Main Component
```typescript
// src/features/estimates/components/tabs/LabourTab/LabourTab.tsx

interface LabourTabProps {
  projectId: string;
}

export function LabourTab({ projectId }: LabourTabProps) {
  const {
    labour,
    isLoading,
    error,
    filters,
    updateFilters,
    exportSchedule
  } = useLabourSchedule(projectId);

  return (
    <div className="flex flex-col gap-4">
      <TradeFilters
        filters={filters}
        onChange={updateFilters}
      />
      
      <LabourScheduleGrid
        labour={labour}
        isLoading={isLoading}
      />
      
      <LabourSummary
        labour={labour}
        onExport={exportSchedule}
      />
    </div>
  );
}
```

## 4. Equipment Tab Implementation

### Component Structure
```typescript
// src/features/estimates/components/tabs/EquipmentTab/
├── EquipmentTab.tsx
├── components/
│   ├── EquipmentScheduleGrid/
│   ├── EquipmentFilters/
│   └── EquipmentSummary/
└── hooks/
    └── useEquipmentSchedule.ts
```

### Main Component
```typescript
// src/features/estimates/components/tabs/EquipmentTab/EquipmentTab.tsx

interface EquipmentTabProps {
  projectId: string;
}

export function EquipmentTab({ projectId }: EquipmentTabProps) {
  const {
    equipment,
    isLoading,
    error,
    filters,
    updateFilters,
    exportSchedule
  } = useEquipmentSchedule(projectId);

  return (
    <div className="flex flex-col gap-4">
      <EquipmentFilters
        filters={filters}
        onChange={updateFilters}
      />
      
      <EquipmentScheduleGrid
        equipment={equipment}
        isLoading={isLoading}
      />
      
      <EquipmentSummary
        equipment={equipment}
        onExport={exportSchedule}
      />
    </div>
  );
}
```

## Shared Components

### 1. Tab Container
```typescript
// src/features/estimates/components/tabs/TabContainer.tsx

interface TabContainerProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function TabContainer({ activeTab, onTabChange, children }: TabContainerProps) {
  return (
    <div className="flex flex-col h-full">
      <TabList
        value={activeTab}
        onValueChange={onTabChange}
      >
        <TabTrigger value="bq">BQ</TabTrigger>
        <TabTrigger value="materials">Materials</TabTrigger>
        <TabTrigger value="labour">Labour</TabTrigger>
        <TabTrigger value="equipment">Equipment</TabTrigger>
      </TabList>
      
      <TabContent>{children}</TabContent>
    </div>
  );
}
```

### 2. Export Button
```typescript
// src/features/estimates/components/shared/ExportButton.tsx

interface ExportButtonProps {
  onExport: () => void;
  format: 'excel' | 'pdf';
  isLoading?: boolean;
}

export function ExportButton({ onExport, format, isLoading }: ExportButtonProps) {
  return (
    <Button
      onClick={onExport}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <>
          <FileIcon className="mr-2" />
          Export to {format.toUpperCase()}
        </>
      )}
    </Button>
  );
}
```

## Real-time Updates

### WebSocket Integration
```typescript
// src/features/estimates/hooks/useRealtimeUpdates.ts

interface UseRealtimeUpdates {
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export function useRealtimeUpdates(): UseRealtimeUpdates {
  const supabase = useSupabaseClient();

  const subscribe = useCallback((channel: string) => {
    const subscription = supabase
      .channel(channel)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public' 
      }, (payload) => {
        // Handle different types of changes
        switch (payload.eventType) {
          case 'INSERT':
            handleInsert(payload.new);
            break;
          case 'UPDATE':
            handleUpdate(payload.old, payload.new);
            break;
          case 'DELETE':
            handleDelete(payload.old);
            break;
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { subscribe, unsubscribe };
}
```

## Performance Optimization

### 1. Data Caching
```typescript
// src/features/estimates/hooks/useScheduleCache.ts

interface UseScheduleCache<T> {
  getCached: (key: string) => T | null;
  setCache: (key: string, data: T) => void;
  clearCache: () => void;
}

export function useScheduleCache<T>(): UseScheduleCache<T> {
  const cache = useMemo(() => new Map<string, T>(), []);

  const getCached = useCallback((key: string) => {
    return cache.get(key) || null;
  }, [cache]);

  const setCache = useCallback((key: string, data: T) => {
    cache.set(key, data);
  }, [cache]);

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  return { getCached, setCache, clearCache };
}
```

### 2. Virtualized Grid
```typescript
// src/features/estimates/components/shared/VirtualGrid.tsx

interface VirtualGridProps<T> {
  items: T[];
  rowHeight: number;
  renderRow: (item: T) => React.ReactNode;
}

export function VirtualGrid<T>({ items, rowHeight, renderRow }: VirtualGridProps<T>) {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          itemCount={items.length}
          itemSize={rowHeight}
        >
          {({ index, style }) => (
            <div style={style}>
              {renderRow(items[index])}
            </div>
          )}
        </List>
      )}
    </AutoSizer>
  );
}
```

## Testing Strategy

### 1. Component Tests
```typescript
// src/features/estimates/components/tabs/__tests__/BQTab.test.tsx

describe('BQTab', () => {
  it('should render all required columns', () => {
    render(<BQTab projectId="test-project" />);
    
    expect(screen.getByText('Code/Index')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    // ... other columns
  });

  it('should update quantity when changed', async () => {
    const { user } = render(<BQTab projectId="test-project" />);
    
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '100');
    
    expect(quantityInput).toHaveValue('100');
  });
});
```

### 2. Integration Tests
```typescript
// src/features/estimates/components/tabs/__tests__/TabIntegration.test.tsx

describe('Tab Integration', () => {
  it('should update material schedule when BQ quantities change', async () => {
    const { user } = render(
      <TabContainer activeTab="bq">
        <BQTab projectId="test-project" />
        <MaterialsTab projectId="test-project" />
      </TabContainer>
    );
    
    // Update quantity in BQ tab
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '100');
    
    // Switch to materials tab
    const materialsTab = screen.getByText('Materials');
    await user.click(materialsTab);
    
    // Verify material quantities updated
    const materialQuantity = screen.getByText('100');
    expect(materialQuantity).toBeInTheDocument();
  });
});
```

## Error Handling

### 1. Tab Error Boundary
```typescript
// src/features/estimates/components/tabs/TabErrorBoundary.tsx

interface TabErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class TabErrorBoundary extends React.Component<TabErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tab error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <TabErrorFallback />;
    }

    return this.props.children;
  }
}
```

### 2. Loading States
```typescript
// src/features/estimates/components/shared/LoadingState.tsx

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Spinner size="lg" />
      <span className="ml-4">{message}</span>
    </div>
  );
}
``` 