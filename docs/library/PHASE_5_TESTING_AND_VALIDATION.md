# Phase 5: Testing and Validation

## Overview

This phase establishes a comprehensive testing strategy for the library integration system, covering unit tests, integration tests, end-to-end tests, and performance validation.

## Test Structure

```
src/features/estimates/
├── __tests__/
│   ├── unit/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   ├── integration/
│   │   ├── library-integration/
│   │   └── schedule-calculation/
│   └── e2e/
│       ├── library-browser/
│       └── estimate-creation/
├── __mocks__/
│   ├── libraryData.ts
│   └── estimateData.ts
└── __fixtures__/
    ├── hierarchyData.ts
    └── factorData.ts
```

## 1. Unit Tests

### Service Tests
```typescript
// src/features/estimates/__tests__/unit/services/libraryIntegrationService.test.ts

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

    it('should handle empty input', async () => {
      const result = await service.mapLibraryToEstimate([]);
      expect(result).toEqual([]);
    });

    it('should handle invalid hierarchy', async () => {
      const invalidItems = mockInvalidLibraryItems();
      await expect(service.mapLibraryToEstimate(invalidItems))
        .rejects.toThrow('Invalid hierarchy');
    });
  });

  describe('createEstimateElements', () => {
    it('should create elements in correct order', async () => {
      const hierarchy = mockHierarchy();
      await service.createEstimateElements(hierarchy);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('estimate_elements');
      expect(mockSupabase.from('estimate_elements').insert)
        .toHaveBeenCalledWith(expect.arrayContaining([
          expect.objectContaining({ hierarchy_level: 1 }),
          expect.objectContaining({ hierarchy_level: 2 }),
          expect.objectContaining({ hierarchy_level: 3 })
        ]));
    });
  });
});
```

### Hook Tests
```typescript
// src/features/estimates/__tests__/unit/hooks/useFactorCalculation.test.ts

describe('useFactorCalculation', () => {
  it('should calculate material factors correctly', () => {
    const { result } = renderHook(() => useFactorCalculation());
    const item = mockLibraryItem();
    const quantity = 100;

    const factors = result.current.calculateFactors(item, quantity);

    expect(factors.materials).toEqual([
      {
        materialId: 'mat-1',
        quantity: 700,  // 7 bags/m³ × 100 m³
        wastageAdjusted: 735  // 700 × 1.05 wastage
      }
    ]);
  });

  it('should handle zero quantity', () => {
    const { result } = renderHook(() => useFactorCalculation());
    const item = mockLibraryItem();
    const quantity = 0;

    const factors = result.current.calculateFactors(item, quantity);

    expect(factors.materials).toEqual([
      {
        materialId: 'mat-1',
        quantity: 0,
        wastageAdjusted: 0
      }
    ]);
  });

  it('should handle calculation errors', () => {
    const { result } = renderHook(() => useFactorCalculation());
    const invalidItem = { ...mockLibraryItem(), materialFactors: null };

    expect(() => result.current.calculateFactors(invalidItem, 100))
      .toThrow('Invalid material factors');
  });
});
```

### Utility Tests
```typescript
// src/features/estimates/__tests__/unit/utils/hierarchyMapper.test.ts

describe('HierarchyMapper', () => {
  const mapper = new HierarchyMapper();

  describe('groupItems', () => {
    it('should group items by division, section, and assembly', () => {
      const items = [
        mockLibraryItem({ divisionId: 'd1', sectionId: 's1', assemblyId: 'a1' }),
        mockLibraryItem({ divisionId: 'd1', sectionId: 's1', assemblyId: 'a1' }),
        mockLibraryItem({ divisionId: 'd1', sectionId: 's2', assemblyId: 'a2' })
      ];

      const result = mapper.groupItems(items);

      expect(result).toEqual({
        'd1': {
          's1': {
            'a1': [items[0], items[1]]
          },
          's2': {
            'a2': [items[2]]
          }
        }
      });
    });
  });

  describe('createHierarchy', () => {
    it('should create correct hierarchy structure', () => {
      const grouped = {
        'd1': {
          's1': {
            'a1': [mockLibraryItem()]
          }
        }
      };

      const result = mapper.createHierarchy(grouped);

      expect(result).toMatchSnapshot();
    });
  });
});
```

## 2. Integration Tests

### Library Integration Flow
```typescript
// src/features/estimates/__tests__/integration/library-integration/integrationFlow.test.ts

describe('Library Integration Flow', () => {
  it('should complete full integration flow', async () => {
    // Setup
    const { user } = render(<LibraryIntegrationFlow />);
    
    // Step 1: Select library items
    await user.click(screen.getByText('Select Items'));
    await user.click(screen.getByText('Concrete Grade 25'));
    await user.click(screen.getByText('Confirm Selection'));
    
    // Step 2: Map to structure
    await user.click(screen.getByText('Main House'));
    await user.click(screen.getByText('Next'));
    
    // Step 3: Map to element
    await user.click(screen.getByText('Substructure'));
    await user.click(screen.getByText('Next'));
    
    // Step 4: Confirm mapping
    await user.click(screen.getByText('Confirm Integration'));
    
    // Verify results
    expect(screen.getByText('Integration Complete')).toBeInTheDocument();
    expect(mockSupabase.from('estimate_elements').insert)
      .toHaveBeenCalledTimes(1);
  });

  it('should handle integration errors', async () => {
    mockSupabase.from('estimate_elements').insert.mockRejectedValue(
      new Error('Database error')
    );

    const { user } = render(<LibraryIntegrationFlow />);
    
    // Complete flow until error
    await user.click(screen.getByText('Select Items'));
    await user.click(screen.getByText('Confirm Selection'));
    
    // Verify error handling
    expect(screen.getByText('Integration failed')).toBeInTheDocument();
    expect(screen.getByText('Database error')).toBeInTheDocument();
  });
});
```

### Schedule Calculation Flow
```typescript
// src/features/estimates/__tests__/integration/schedule-calculation/calculationFlow.test.ts

describe('Schedule Calculation Flow', () => {
  it('should update all schedules when BQ changes', async () => {
    const { user } = render(<EstimateSchedules />);
    
    // Update BQ quantity
    await user.click(screen.getByText('BQ'));
    const quantityInput = screen.getByLabelText('Quantity');
    await user.type(quantityInput, '100');
    
    // Verify material schedule updates
    await user.click(screen.getByText('Materials'));
    expect(screen.getByText('735')).toBeInTheDocument(); // 700 × 1.05 wastage
    
    // Verify labour schedule updates
    await user.click(screen.getByText('Labour'));
    expect(screen.getByText('80')).toBeInTheDocument(); // 0.8 hours/m³ × 100
    
    // Verify equipment schedule updates
    await user.click(screen.getByText('Equipment'));
    expect(screen.getByText('10')).toBeInTheDocument(); // 0.1 hours/m³ × 100
  });

  it('should handle calculation errors gracefully', async () => {
    mockSupabase.from('estimate_material_schedule')
      .select.mockRejectedValue(new Error('Calculation error'));

    const { user } = render(<EstimateSchedules />);
    
    await user.click(screen.getByText('Materials'));
    
    expect(screen.getByText('Failed to calculate schedule'))
      .toBeInTheDocument();
  });
});
```

## 3. End-to-End Tests

### Library Browser Flow
```typescript
// src/features/estimates/__tests__/e2e/library-browser/browserFlow.test.ts

describe('Library Browser E2E', () => {
  beforeAll(async () => {
    await setupE2EDatabase();
  });

  afterAll(async () => {
    await cleanupE2EDatabase();
  });

  it('should allow browsing and selecting items', async () => {
    const { user } = render(<LibraryBrowser />);
    
    // Search for items
    const searchInput = screen.getByPlaceholderText('Search library items...');
    await user.type(searchInput, 'concrete');
    
    // Expand hierarchy
    await user.click(screen.getByText('03 - Concrete'));
    await user.click(screen.getByText('03.10 - Concrete Materials'));
    
    // Select items
    await user.click(screen.getByText('03.10.10.01 - Concrete Grade 25'));
    await user.click(screen.getByText('03.10.10.02 - Concrete Grade 30'));
    
    // Confirm selection
    await user.click(screen.getByText('Confirm'));
    
    // Verify selection
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });
});
```

### Estimate Creation Flow
```typescript
// src/features/estimates/__tests__/e2e/estimate-creation/creationFlow.test.ts

describe('Estimate Creation E2E', () => {
  beforeAll(async () => {
    await setupE2EDatabase();
  });

  afterAll(async () => {
    await cleanupE2EDatabase();
  });

  it('should create complete estimate with library items', async () => {
    const { user } = render(<EstimateCreation />);
    
    // Create structure
    await user.click(screen.getByText('Add Structure'));
    await user.type(screen.getByLabelText('Structure Name'), 'Main House');
    await user.click(screen.getByText('Create'));
    
    // Create element
    await user.click(screen.getByText('Add Element'));
    await user.type(screen.getByLabelText('Element Name'), 'Substructure');
    await user.click(screen.getByText('Create'));
    
    // Add library items
    await user.click(screen.getByText('Add from Library'));
    await user.click(screen.getByText('03.10.10.01 - Concrete Grade 25'));
    await user.click(screen.getByText('Confirm'));
    
    // Enter quantity
    await user.type(screen.getByLabelText('Quantity'), '100');
    
    // Verify schedules
    expect(screen.getByText('735 bags')).toBeInTheDocument();
    expect(screen.getByText('80 hours')).toBeInTheDocument();
    expect(screen.getByText('10 hours')).toBeInTheDocument();
  });
});
```

## 4. Performance Testing

### Load Tests
```typescript
// src/features/estimates/__tests__/performance/loadTests.ts

describe('Performance Tests', () => {
  it('should handle large library (1000+ items)', async () => {
    const items = generateLargeLibrary(1000);
    const startTime = performance.now();
    
    const { user } = render(<LibraryBrowser items={items} />);
    await user.click(screen.getByText('03 - Concrete'));
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // Max 100ms
  });

  it('should efficiently calculate schedules', async () => {
    const items = generateLargeEstimate(100);
    const startTime = performance.now();
    
    const { user } = render(<EstimateSchedules items={items} />);
    await user.click(screen.getByText('Calculate'));
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(500); // Max 500ms
  });
});
```

### Memory Tests
```typescript
// src/features/estimates/__tests__/performance/memoryTests.ts

describe('Memory Usage', () => {
  it('should maintain stable memory usage', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform multiple operations
    for (let i = 0; i < 100; i++) {
      const { user } = render(<LibraryBrowser />);
      await user.click(screen.getByText('03 - Concrete'));
      cleanup();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const diff = finalMemory - initialMemory;
    
    expect(diff).toBeLessThan(5 * 1024 * 1024); // Max 5MB increase
  });
});
```

## 5. Test Utilities

### Mock Data Generators
```typescript
// src/features/estimates/__mocks__/libraryData.ts

export function mockLibraryItem(overrides = {}) {
  return {
    id: 'item-1',
    divisionId: 'div-1',
    sectionId: 'sec-1',
    assemblyId: 'asm-1',
    code: '03.10.10.01',
    name: 'Concrete Grade 25',
    materialFactors: [
      {
        materialId: 'mat-1',
        quantityPerUnit: 7,
        wastagePercentage: 5
      }
    ],
    labourFactors: [
      {
        labourId: 'lab-1',
        hoursPerUnit: 0.8,
        productivityFactor: 0.85
      }
    ],
    equipmentFactors: [
      {
        equipmentId: 'eqp-1',
        hoursPerUnit: 0.1,
        utilizationFactor: 0.75
      }
    ],
    ...overrides
  };
}

export function mockLibraryItems(count = 10) {
  return Array.from({ length: count }, (_, i) => 
    mockLibraryItem({ id: `item-${i + 1}` })
  );
}
```

### Test Helpers
```typescript
// src/features/estimates/__tests__/helpers/testUtils.ts

export async function setupTestDatabase() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
  
  // Clear existing data
  await supabase.from('estimate_elements').delete().neq('id', 0);
  await supabase.from('estimate_detail_items').delete().neq('id', 0);
  
  // Insert test data
  await supabase
    .from('divisions')
    .insert(mockDivisions);
    
  await supabase
    .from('sections')
    .insert(mockSections);
    
  await supabase
    .from('assemblies')
    .insert(mockAssemblies);
    
  await supabase
    .from('library_items')
    .insert(mockLibraryItems());
}

export function createMockSupabaseClient() {
  return {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockResolvedValue({ data: [], error: null }),
      delete: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  } as unknown as jest.Mocked<SupabaseClient>;
}
```

## 6. Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml

name: Test Library Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

## 7. Test Coverage

### Jest Configuration
```javascript
// jest.config.js

module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/features/estimates/**/*.{ts,tsx}',
    '!src/features/estimates/**/*.d.ts',
    '!src/features/estimates/**/__tests__/**',
    '!src/features/estimates/**/__mocks__/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
};
```

### Coverage Report Example
```
--------------------------|---------|----------|---------|---------|-------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------------|---------|----------|---------|---------|-------------------
All files                 |   85.71 |    83.33 |   88.89 |   85.71 |                   
 services/                |   90.91 |    85.71 |   88.89 |   90.91 |                   
  libraryIntegration.ts  |   92.86 |    87.50 |   90.00 |   92.86 | 45,67            
  factorCalculator.ts    |   88.89 |    83.33 |   87.50 |   88.89 | 34,56            
 hooks/                  |   83.33 |    81.82 |   85.71 |   83.33 |                   
  useFactorCalculation.ts|   85.71 |    83.33 |   88.89 |   85.71 | 23,45            
  useLibraryIntegration.ts|   81.82 |    80.00 |   83.33 |   81.82 | 34,56,78         
--------------------------|---------|----------|---------|---------|-------------------
``` 