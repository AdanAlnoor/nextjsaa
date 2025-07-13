# Phase 2: Core Integration Components

## Overview

This phase implements the core integration components that handle the mapping between library and estimate systems, including services, hooks, and utility functions.

## Project Structure

```
src/features/estimates/
├── components/
│   └── library-integration/
│       ├── LibraryItemSelector/
│       ├── FactorPreview/
│       └── IntegrationDialog/
├── services/
│   ├── libraryIntegrationService.ts
│   ├── factorCalculatorService.ts
│   └── scheduleAggregationService.ts
├── hooks/
│   ├── useLibraryIntegration.ts
│   ├── useFactorCalculation.ts
│   └── useScheduleAggregation.ts
└── utils/
    ├── hierarchyMapper.ts
    └── costCalculator.ts
```

## Core Services Implementation

### 1. Library Integration Service
```typescript
// src/features/estimates/services/libraryIntegrationService.ts

interface LibraryIntegrationService {
  mapLibraryToEstimate(items: LibraryItem[]): EstimateHierarchy;
  createEstimateElements(hierarchy: EstimateHierarchy): Promise<void>;
  updateExistingElements(updates: ElementUpdate[]): Promise<void>;
}

class LibraryIntegrationServiceImpl implements LibraryIntegrationService {
  private hierarchyMapper: HierarchyMapper;
  private supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.hierarchyMapper = new HierarchyMapper();
    this.supabaseClient = supabaseClient;
  }

  async mapLibraryToEstimate(items: LibraryItem[]): Promise<EstimateHierarchy> {
    // Group items by division, section, assembly
    const grouped = this.hierarchyMapper.groupItems(items);
    
    // Create estimate hierarchy
    return this.hierarchyMapper.createHierarchy(grouped);
  }

  async createEstimateElements(hierarchy: EstimateHierarchy): Promise<void> {
    const { data, error } = await this.supabaseClient
      .from('estimate_elements')
      .insert(this.hierarchyMapper.toElementRecords(hierarchy));

    if (error) throw new Error(`Failed to create elements: ${error.message}`);
  }

  async updateExistingElements(updates: ElementUpdate[]): Promise<void> {
    // Batch update existing elements
    const { data, error } = await this.supabaseClient
      .from('estimate_elements')
      .upsert(updates);

    if (error) throw new Error(`Failed to update elements: ${error.message}`);
  }
}
```

### 2. Factor Calculator Service
```typescript
// src/features/estimates/services/factorCalculatorService.ts

interface FactorCalculatorService {
  calculateMaterialFactors(item: LibraryItem, quantity: number): MaterialFactor[];
  calculateLabourFactors(item: LibraryItem, quantity: number): LabourFactor[];
  calculateEquipmentFactors(item: LibraryItem, quantity: number): EquipmentFactor[];
}

class FactorCalculatorServiceImpl implements FactorCalculatorService {
  calculateMaterialFactors(item: LibraryItem, quantity: number): MaterialFactor[] {
    return item.materialFactors.map(factor => ({
      materialId: factor.materialId,
      quantity: quantity * factor.quantityPerUnit,
      wastageAdjusted: quantity * factor.quantityPerUnit * (1 + factor.wastagePercentage/100)
    }));
  }

  calculateLabourFactors(item: LibraryItem, quantity: number): LabourFactor[] {
    return item.labourFactors.map(factor => ({
      labourId: factor.labourId,
      hours: quantity * factor.hoursPerUnit,
      productivityAdjusted: quantity * factor.hoursPerUnit / factor.productivityFactor
    }));
  }

  calculateEquipmentFactors(item: LibraryItem, quantity: number): EquipmentFactor[] {
    return item.equipmentFactors.map(factor => ({
      equipmentId: factor.equipmentId,
      hours: quantity * factor.hoursPerUnit,
      utilizationAdjusted: quantity * factor.hoursPerUnit / factor.utilizationFactor
    }));
  }
}
```

### 3. Schedule Aggregation Service
```typescript
// src/features/estimates/services/scheduleAggregationService.ts

interface ScheduleAggregationService {
  aggregateMaterialSchedule(projectId: string): Promise<MaterialSchedule>;
  aggregateLabourSchedule(projectId: string): Promise<LabourSchedule>;
  aggregateEquipmentSchedule(projectId: string): Promise<EquipmentSchedule>;
}

class ScheduleAggregationServiceImpl implements ScheduleAggregationService {
  private supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  async aggregateMaterialSchedule(projectId: string): Promise<MaterialSchedule> {
    const { data, error } = await this.supabaseClient
      .from('estimate_material_schedule')
      .select('*')
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to aggregate materials: ${error.message}`);
    return this.processMaterialSchedule(data);
  }

  async aggregateLabourSchedule(projectId: string): Promise<LabourSchedule> {
    const { data, error } = await this.supabaseClient
      .from('estimate_labour_schedule')
      .select('*')
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to aggregate labour: ${error.message}`);
    return this.processLabourSchedule(data);
  }

  async aggregateEquipmentSchedule(projectId: string): Promise<EquipmentSchedule> {
    const { data, error } = await this.supabaseClient
      .from('estimate_equipment_schedule')
      .select('*')
      .eq('project_id', projectId);

    if (error) throw new Error(`Failed to aggregate equipment: ${error.message}`);
    return this.processEquipmentSchedule(data);
  }
}
```

## Custom Hooks Implementation

### 1. Library Integration Hook
```typescript
// src/features/estimates/hooks/useLibraryIntegration.ts

interface UseLibraryIntegration {
  selectedItems: LibraryItem[];
  hierarchy: EstimateHierarchy | null;
  isLoading: boolean;
  error: Error | null;
  selectItems: (items: LibraryItem[]) => void;
  createElements: () => Promise<void>;
}

function useLibraryIntegration(): UseLibraryIntegration {
  const [selectedItems, setSelectedItems] = useState<LibraryItem[]>([]);
  const [hierarchy, setHierarchy] = useState<EstimateHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const integrationService = useMemo(() => 
    new LibraryIntegrationServiceImpl(supabase), []);

  const selectItems = useCallback((items: LibraryItem[]) => {
    setSelectedItems(items);
    setHierarchy(null);
  }, []);

  const createElements = useCallback(async () => {
    if (!selectedItems.length) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const hierarchy = await integrationService.mapLibraryToEstimate(selectedItems);
      setHierarchy(hierarchy);
      await integrationService.createEstimateElements(hierarchy);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedItems, integrationService]);

  return {
    selectedItems,
    hierarchy,
    isLoading,
    error,
    selectItems,
    createElements
  };
}
```

### 2. Factor Calculation Hook
```typescript
// src/features/estimates/hooks/useFactorCalculation.ts

interface UseFactorCalculation {
  calculateFactors: (item: LibraryItem, quantity: number) => ItemFactors;
  isCalculating: boolean;
  error: Error | null;
}

function useFactorCalculation(): UseFactorCalculation {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculator = useMemo(() => new FactorCalculatorServiceImpl(), []);

  const calculateFactors = useCallback((item: LibraryItem, quantity: number) => {
    setIsCalculating(true);
    setError(null);

    try {
      return {
        materials: calculator.calculateMaterialFactors(item, quantity),
        labour: calculator.calculateLabourFactors(item, quantity),
        equipment: calculator.calculateEquipmentFactors(item, quantity)
      };
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [calculator]);

  return { calculateFactors, isCalculating, error };
}
```

## Utility Functions

### 1. Hierarchy Mapper
```typescript
// src/features/estimates/utils/hierarchyMapper.ts

class HierarchyMapper {
  groupItems(items: LibraryItem[]): GroupedItems {
    return items.reduce((grouped, item) => {
      const { divisionId, sectionId, assemblyId } = item;
      
      if (!grouped[divisionId]) {
        grouped[divisionId] = {};
      }
      if (!grouped[divisionId][sectionId]) {
        grouped[divisionId][sectionId] = {};
      }
      if (!grouped[divisionId][sectionId][assemblyId]) {
        grouped[divisionId][sectionId][assemblyId] = [];
      }
      
      grouped[divisionId][sectionId][assemblyId].push(item);
      return grouped;
    }, {} as GroupedItems);
  }

  createHierarchy(grouped: GroupedItems): EstimateHierarchy {
    return Object.entries(grouped).map(([divisionId, sections]) => ({
      type: 'division',
      id: divisionId,
      children: this.createSectionNodes(sections)
    }));
  }

  private createSectionNodes(sections: GroupedSections): HierarchyNode[] {
    return Object.entries(sections).map(([sectionId, assemblies]) => ({
      type: 'section',
      id: sectionId,
      children: this.createAssemblyNodes(assemblies)
    }));
  }

  private createAssemblyNodes(assemblies: GroupedAssemblies): HierarchyNode[] {
    return Object.entries(assemblies).map(([assemblyId, items]) => ({
      type: 'assembly',
      id: assemblyId,
      children: items.map(item => ({
        type: 'item',
        id: item.id,
        data: item
      }))
    }));
  }
}
```

### 2. Cost Calculator
```typescript
// src/features/estimates/utils/costCalculator.ts

class CostCalculator {
  calculateItemCost(item: LibraryItem, quantity: number): ItemCost {
    const materialCost = this.calculateMaterialCost(item.materialFactors, quantity);
    const labourCost = this.calculateLabourCost(item.labourFactors, quantity);
    const equipmentCost = this.calculateEquipmentCost(item.equipmentFactors, quantity);

    return {
      materials: materialCost,
      labour: labourCost,
      equipment: equipmentCost,
      total: materialCost + labourCost + equipmentCost
    };
  }

  private calculateMaterialCost(factors: MaterialFactor[], quantity: number): number {
    return factors.reduce((total, factor) => 
      total + (quantity * factor.quantityPerUnit * factor.rate), 0);
  }

  private calculateLabourCost(factors: LabourFactor[], quantity: number): number {
    return factors.reduce((total, factor) => 
      total + (quantity * factor.hoursPerUnit * factor.rate), 0);
  }

  private calculateEquipmentCost(factors: EquipmentFactor[], quantity: number): number {
    return factors.reduce((total, factor) => 
      total + (quantity * factor.hoursPerUnit * factor.rate), 0);
  }
}
```

## Integration Testing

### 1. Service Tests
```typescript
// src/features/estimates/services/__tests__/libraryIntegrationService.test.ts

describe('LibraryIntegrationService', () => {
  let service: LibraryIntegrationService;
  let mockSupabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new LibraryIntegrationServiceImpl(mockSupabase);
  });

  describe('mapLibraryToEstimate', () => {
    it('should correctly group items by hierarchy', async () => {
      const items = mockLibraryItems();
      const result = await service.mapLibraryToEstimate(items);
      
      expect(result).toMatchSnapshot();
    });
  });

  // Additional test cases...
});
```

### 2. Hook Tests
```typescript
// src/features/estimates/hooks/__tests__/useLibraryIntegration.test.tsx

describe('useLibraryIntegration', () => {
  it('should handle item selection', () => {
    const { result } = renderHook(() => useLibraryIntegration());
    const items = mockLibraryItems();

    act(() => {
      result.current.selectItems(items);
    });

    expect(result.current.selectedItems).toEqual(items);
    expect(result.current.hierarchy).toBeNull();
  });

  // Additional test cases...
});
```

## Error Handling

### 1. Custom Error Types
```typescript
// src/features/estimates/utils/errors.ts

export class LibraryIntegrationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LibraryIntegrationError';
  }
}

export class FactorCalculationError extends Error {
  constructor(message: string, public itemId: string) {
    super(message);
    this.name = 'FactorCalculationError';
  }
}
```

### 2. Error Boundaries
```typescript
// src/features/estimates/components/ErrorBoundary.tsx

class LibraryIntegrationErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Library integration error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }

    return this.props.children;
  }
}
``` 