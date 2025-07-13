# Phase 4: UI Components and User Interface

## Overview

This phase implements the user interface components for the library integration system, focusing on usability, accessibility, and responsive design.

## Component Architecture

```
src/features/estimates/components/
├── library-integration/
│   ├── LibraryBrowser/
│   │   ├── SearchBar/
│   │   ├── HierarchyTree/
│   │   └── SelectionPanel/
│   ├── FactorPreview/
│   │   ├── MaterialFactors/
│   │   ├── LabourFactors/
│   │   └── EquipmentFactors/
│   └── IntegrationDialog/
│       ├── StructureMapping/
│       ├── ElementMapping/
│       └── PreviewGrid/
└── shared/
    ├── DataGrid/
    ├── Filters/
    └── ExportTools/
```

## 1. Library Browser Component

### Main Component
```typescript
// src/features/estimates/components/library-integration/LibraryBrowser/LibraryBrowser.tsx

interface LibraryBrowserProps {
  onSelect: (items: LibraryItem[]) => void;
  selectedItems?: LibraryItem[];
  defaultExpanded?: string[];
}

export function LibraryBrowser({ onSelect, selectedItems = [], defaultExpanded = [] }: LibraryBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  return (
    <div className="flex h-[600px] border rounded-lg">
      <div className="w-1/3 border-r">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <HierarchyTree
          selectedNodes={selectedNodes}
          onNodeSelect={setSelectedNodes}
          defaultExpanded={defaultExpanded}
        />
      </div>
      
      <div className="w-2/3 p-4">
        <SelectionPanel
          selectedItems={selectedItems}
          onConfirm={onSelect}
        />
      </div>
    </div>
  );
}
```

### Search Bar Component
```typescript
// src/features/estimates/components/library-integration/LibraryBrowser/SearchBar/SearchBar.tsx

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="p-4 border-b">
      <Input
        type="search"
        placeholder="Search library items..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        leftIcon={<SearchIcon className="text-gray-400" />}
        className="w-full"
      />
      
      <div className="flex gap-2 mt-2">
        <FilterChip>Division</FilterChip>
        <FilterChip>Section</FilterChip>
        <FilterChip>Assembly</FilterChip>
      </div>
    </div>
  );
}
```

### Hierarchy Tree Component
```typescript
// src/features/estimates/components/library-integration/LibraryBrowser/HierarchyTree/HierarchyTree.tsx

interface HierarchyTreeProps {
  selectedNodes: string[];
  onNodeSelect: (nodes: string[]) => void;
  defaultExpanded: string[];
}

export function HierarchyTree({ selectedNodes, onNodeSelect, defaultExpanded }: HierarchyTreeProps) {
  return (
    <Tree
      className="p-4"
      defaultExpanded={defaultExpanded}
      selected={selectedNodes}
      onSelect={onNodeSelect}
    >
      {divisions.map(division => (
        <TreeItem
          key={division.id}
          nodeId={division.id}
          label={division.name}
        >
          {division.sections.map(section => (
            <TreeItem
              key={section.id}
              nodeId={section.id}
              label={section.name}
            >
              {section.assemblies.map(assembly => (
                <TreeItem
                  key={assembly.id}
                  nodeId={assembly.id}
                  label={assembly.name}
                />
              ))}
            </TreeItem>
          ))}
        </TreeItem>
      ))}
    </Tree>
  );
}
```

## 2. Factor Preview Component

### Main Component
```typescript
// src/features/estimates/components/library-integration/FactorPreview/FactorPreview.tsx

interface FactorPreviewProps {
  item: LibraryItem;
  quantity: number;
}

export function FactorPreview({ item, quantity }: FactorPreviewProps) {
  const { calculateFactors, isCalculating } = useFactorCalculation();
  const factors = calculateFactors(item, quantity);
  
  return (
    <div className="space-y-6">
      <MaterialFactors
        factors={factors?.materials}
        isLoading={isCalculating}
      />
      
      <LabourFactors
        factors={factors?.labour}
        isLoading={isCalculating}
      />
      
      <EquipmentFactors
        factors={factors?.equipment}
        isLoading={isCalculating}
      />
    </div>
  );
}
```

### Material Factors Component
```typescript
// src/features/estimates/components/library-integration/FactorPreview/MaterialFactors/MaterialFactors.tsx

interface MaterialFactorsProps {
  factors: MaterialFactor[];
  isLoading: boolean;
}

export function MaterialFactors({ factors, isLoading }: MaterialFactorsProps) {
  if (isLoading) return <FactorsSkeleton />;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Requirements</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Wastage</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {factors.map(factor => (
              <TableRow key={factor.materialId}>
                <TableCell>{factor.name}</TableCell>
                <TableCell>{factor.quantity}</TableCell>
                <TableCell>{factor.unit}</TableCell>
                <TableCell>{factor.wastagePercentage}%</TableCell>
                <TableCell>{factor.totalQuantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

## 3. Integration Dialog Component

### Main Component
```typescript
// src/features/estimates/components/library-integration/IntegrationDialog/IntegrationDialog.tsx

interface IntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: LibraryItem[];
  onConfirm: (mapping: HierarchyMapping) => void;
}

export function IntegrationDialog({
  isOpen,
  onClose,
  selectedItems,
  onConfirm
}: IntegrationDialogProps) {
  const [step, setStep] = useState(1);
  const [mapping, setMapping] = useState<HierarchyMapping>({});
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Map Library Items to Estimate Structure
          </DialogTitle>
        </DialogHeader>
        
        <Steps
          current={step}
          items={[
            { title: 'Structure Mapping' },
            { title: 'Element Mapping' },
            { title: 'Preview' }
          ]}
        />
        
        {step === 1 && (
          <StructureMapping
            items={selectedItems}
            mapping={mapping}
            onChange={setMapping}
          />
        )}
        
        {step === 2 && (
          <ElementMapping
            items={selectedItems}
            mapping={mapping}
            onChange={setMapping}
          />
        )}
        
        {step === 3 && (
          <PreviewGrid
            items={selectedItems}
            mapping={mapping}
          />
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Previous
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!mapping.isValid(step)}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => onConfirm(mapping)}
              disabled={!mapping.isComplete()}
            >
              Confirm Integration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## 4. Shared Components

### Data Grid Component
```typescript
// src/features/estimates/components/shared/DataGrid/DataGrid.tsx

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  pagination?: PaginationProps;
}

export function DataGrid<T>({
  data,
  columns,
  onRowClick,
  isLoading,
  pagination
}: DataGridProps<T>) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableCell
                key={column.key}
                className={column.className}
              >
                {column.title}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {isLoading ? (
            <TableRowSkeleton columns={columns.length} />
          ) : (
            data.map((row, index) => (
              <TableRow
                key={index}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'cursor-pointer',
                  onRowClick && 'hover:bg-gray-50'
                )}
              >
                {columns.map(column => (
                  <TableCell
                    key={column.key}
                    className={column.className}
                  >
                    {column.render?.(row) ?? row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {pagination && (
        <div className="border-t p-4">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}
```

### Filter Component
```typescript
// src/features/estimates/components/shared/Filters/Filter.tsx

interface FilterProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  options: FilterOption[];
  type: 'select' | 'multiSelect' | 'date' | 'number';
}

export function Filter({
  label,
  value,
  onChange,
  options,
  type
}: FilterProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {type === 'select' && (
        <Select
          value={value}
          onChange={onChange}
          options={options}
        />
      )}
      
      {type === 'multiSelect' && (
        <MultiSelect
          value={value}
          onChange={onChange}
          options={options}
        />
      )}
      
      {type === 'date' && (
        <DatePicker
          value={value}
          onChange={onChange}
        />
      )}
      
      {type === 'number' && (
        <NumberInput
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}
```

## 5. Accessibility Features

### Keyboard Navigation
```typescript
// src/features/estimates/hooks/useKeyboardNavigation.ts

interface UseKeyboardNavigation {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusedIndex: number;
}

export function useKeyboardNavigation(
  items: any[],
  onSelect: (item: any) => void
): UseKeyboardNavigation {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        onSelect(items[focusedIndex]);
        break;
    }
  }, [items, focusedIndex, onSelect]);
  
  return { handleKeyDown, focusedIndex };
}
```

### Screen Reader Support
```typescript
// src/features/estimates/components/shared/ScreenReaderOnly.tsx

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
}

export function ScreenReaderOnly({ children }: ScreenReaderOnlyProps) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}
```

## 6. Responsive Design

### Breakpoint Hooks
```typescript
// src/features/estimates/hooks/useBreakpoint.ts

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(getBreakpoint());
  
  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return breakpoint;
}
```

### Responsive Layout Components
```typescript
// src/features/estimates/components/shared/ResponsiveLayout.tsx

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export function ResponsiveLayout({ sidebar, main }: ResponsiveLayoutProps) {
  const breakpoint = useBreakpoint();
  
  if (breakpoint === 'mobile') {
    return (
      <div className="flex flex-col h-full">
        <div className="h-[300px] border-b">
          {sidebar}
        </div>
        <div className="flex-1">
          {main}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r">
        {sidebar}
      </div>
      <div className="flex-1">
        {main}
      </div>
    </div>
  );
}
```

## 7. Theme Support

### Theme Provider
```typescript
// src/features/estimates/components/shared/ThemeProvider.tsx

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
```

### Theme Hook
```typescript
// src/features/estimates/hooks/useTheme.ts

interface UseTheme {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: boolean;
}

export function useTheme(): UseTheme {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return {
    ...context,
    isDark: context.theme === 'dark'
  };
}
``` 