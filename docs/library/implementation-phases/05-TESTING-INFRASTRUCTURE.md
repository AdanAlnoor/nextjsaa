# Phase 5: Testing Infrastructure

## Student-Friendly Overview 📚

**What We're Building:** A safety net that catches bugs before users see them. Like spell-check for code - it finds mistakes automatically.

**Think of it like:**
- **Building without tests**: Like construction without safety inspections
- **Building with tests**: Every beam tested, every connection verified
- **Result**: Confidence that nothing will break unexpectedly

**Duration**: 2 days  
**Priority**: MEDIUM  
**Prerequisites**: Core features (Phases 1-3) implemented

## What Problem Does This Solve? 🤔

### Current Nightmare Scenarios
1. **Friday Deploy**: Push update, go home, get called at 9 PM - "Everything's broken!"
2. **Mystery Bugs**: "It worked on my computer" but fails for users
3. **Fear of Change**: Nobody wants to update old code - might break
4. **Manual Testing**: Click through 50 screens after every change
5. **Performance Degradation**: App gets slower, nobody notices until too late

### Testing Saves the Day
1. **Confident Deploys**: Tests pass = safe to release
2. **Catch Bugs Early**: Failed test tells you exactly what broke
3. **Refactor Fearlessly**: Change code, tests verify nothing broke
4. **Automated Checking**: Computer tests everything in seconds
5. **Performance Tracking**: Know if changes make app slower

## How Will We Know It Works? ✅

### Test Scenario 1: Unit Tests Catch Bugs
```typescript
// What happens:
1. Developer changes price calculation formula
2. Runs tests before committing
3. Test fails: "Expected $150, got $1500"
4. Bug caught! Decimal point error
5. Fix bug, test passes, commit safely

// How to verify:
- Intentionally break something
- Run tests
- Should see clear error message
- Fix it, tests pass
```

### Test Scenario 2: Integration Tests Verify Flow
```typescript
// What happens:
1. Test simulates user creating estimate
2. Adds library item
3. Changes project rates
4. Verifies calculation uses new rates
5. All automatic, runs in 2 seconds

// How to verify:
- Run integration test suite
- See each step reported
- Any failures show exact step
- Can debug step-by-step
```

### Test Scenario 3: E2E Tests Like Real User
```typescript
// What happens:
1. Automated browser opens
2. Logs in as test user
3. Creates new project
4. Adds items to estimate
5. Verifies total calculation
6. Takes screenshots of any errors

// How to verify:
- Watch test run (optional)
- See video of what happened
- Screenshots at each step
- Runs on different browsers

## What Gets Built - Component by Component 🔨

### 1. Unit Test Suite
**What:** Tests individual functions/components
**Like:** Testing each LEGO piece before building

```
Unit Test Example:
━━━━━━━━━━━━━━━━
Testing: calculateItemCost()

Test 1: Basic Calculation ✓
  Input: quantity=10, rate=15
  Expected: 150
  Got: 150 ✓

Test 2: With Factors ✓
  Input: base=100, factors=[1.1, 1.2]
  Expected: 132
  Got: 132 ✓

Test 3: Null Handling ✓
  Input: null quantity
  Expected: 0
  Got: 0 ✓

Coverage: 100% (15/15 lines)
Time: 0.003s
```

### 2. Integration Test Suite
**What:** Tests components working together
**Like:** Testing car engine + transmission together

```
Integration Test Flow:
━━━━━━━━━━━━━━━━━━━━
Test: "User creates estimate with custom rates"

1. Setup test database ✓
2. Create test project ✓
3. Set custom rates ✓
4. Add library items ✓
5. Calculate total ✓
6. Verify uses custom rates ✓

Result: PASS
Time: 1.2s
DB cleaned up ✓
```

### 3. End-to-End Test Suite
**What:** Tests complete user journeys
**Like:** Test driving the whole car

```
E2E Test Running:
━━━━━━━━━━━━━━━━
Scenario: "Create and approve estimate"

Browser: Chrome v120
[▶] Recording...

Step 1/8: Navigate to login
Step 2/8: Enter credentials
Step 3/8: Click "New Project"
Step 4/8: Fill project details
Step 5/8: Add items to estimate
Step 6/8: Submit for approval
Step 7/8: Manager approves
Step 8/8: Verify status change

✓ Test passed
📸 Screenshots saved
🎥 Video saved
```

### 4. Performance Test Suite
**What:** Measures speed and resource usage
**Like:** Timing lap speeds at race track

```
Performance Report:
━━━━━━━━━━━━━━━━━
Load 1000 items:
  First paint: 145ms ✓
  Interactive: 389ms ✓
  Complete: 512ms ✓

Bulk update 100 items:
  Time: 2.3s ✓
  Memory: +12MB ✓
  
Search response:
  Avg: 45ms ✓
  P95: 89ms ✓
  P99: 134ms ✓

❌ Regression detected:
  Search 20% slower than baseline
  Investigate changes in v2.3.1
```

### 5. Test Dashboard
**What:** Shows all test results at a glance
**Like:** Mission control for quality

```
Test Dashboard
━━━━━━━━━━━━━━
Last Run: 5 min ago

Overall Health: 🟢 98%

Unit Tests:      245/245 ✓
Integration:     48/49   ⚠️
E2E:            12/12   ✓
Performance:     8/8     ✓

Failed Test:
❌ Integration > Bulk Operations > Cancel midway
   Error: Timeout after 5000ms
   Last passed: 2 days ago
   
Coverage: 87% (target: 80%) ✓

[Run All] [Run Failed] [View History]
```

## Step-by-Step: How Testing Works 📝

### Developer Workflow with Tests
```
1. Developer writes new feature
2. Writes test for the feature
3. Runs test → Fails (red)
4. Implements feature
5. Runs test → Passes (green)
6. Refactors code (if needed)
7. Test still passes → Safe!

This is "Test-Driven Development" (TDD)
```

### Continuous Integration Flow
```
Developer pushes code to GitHub
↓
GitHub Actions triggered
↓
1. Install dependencies (30s)
2. Run unit tests (45s)
3. Run integration tests (2m)
4. Run E2E tests (5m)
5. Check code coverage (10s)
6. Performance benchmarks (1m)
↓
All pass? → ✅ Merge allowed
Any fail? → ❌ Fix required

Developers see:
✅ All checks passed (9m 25s)
```

## How to Test Everything Works 🧪

### Setting Up Tests
```bash
# Install test dependencies
npm install --save-dev jest @testing-library/react playwright

# Run different test types
npm run test:unit      # Fast, runs often
npm run test:integration # Medium speed
npm run test:e2e       # Slow, before deploy
npm run test:all       # Everything

# Watch mode for development
npm run test:watch     # Re-runs on file change
```

### Writing Your First Test
```typescript
// Simple unit test example
describe('ProjectRatesService', () => {
  it('should calculate correct rate with factors', () => {
    // Arrange
    const baseRate = 100;
    const factors = [1.1, 1.2]; // 10% and 20% markup
    
    // Act
    const result = calculateWithFactors(baseRate, factors);
    
    // Assert
    expect(result).toBe(132); // 100 * 1.1 * 1.2
  });
  
  it('should handle empty factors', () => {
    const result = calculateWithFactors(100, []);
    expect(result).toBe(100);
  });
});
```

### Test Checklist for Developers
```
Before Every Commit:
□ Run unit tests (must be fast <30s)
□ New code has tests
□ All tests pass
□ No console errors

Before Pull Request:
□ Run all tests
□ Coverage > 80%
□ Integration tests pass
□ Update test documentation

Before Deploy:
□ Full E2E suite passes
□ Performance benchmarks OK
□ Test on staging environment
□ Smoke tests ready
```

## Common Issues and Solutions 🔧

### Issue: "Tests take too long"
**Solution:**
```javascript
// Use test categories
npm run test:unit --watch  // During development
npm run test:integration   // Before commit
npm run test:e2e          // Before deploy

// Parallelize tests
jest --maxWorkers=4       // Use 4 CPU cores
```

### Issue: "Flaky tests (random failures)"
**Solution:**
```javascript
// Bad: Depends on timing
await sleep(1000);
expect(element).toBeVisible();

// Good: Wait for specific condition
await waitFor(() => 
  expect(element).toBeVisible()
);
```

### Issue: "Hard to test database code"
**Solution:**
```javascript
// Use test database
beforeEach(async () => {
  await testDb.clear();
  await testDb.seed(testData);
});

afterEach(async () => {
  await testDb.clear();
});
```

## Success Metrics 📊

Phase 5 is successful when:
1. **Coverage**: 80%+ of business logic covered
2. **Speed**: Unit tests run in <30 seconds
3. **Reliability**: Zero flaky tests
4. **Automation**: All tests run on every commit
5. **Clarity**: Failed tests clearly show the problem
6. **Confidence**: Team deploys without fear

## Business Requirements

- Ensure 80%+ code coverage for critical paths
- Validate business logic correctness
- Prevent regressions during updates
- Verify performance meets requirements
- Test error handling and edge cases
- Validate security measures

## Technical Implementation

### Step 1: Set Up Testing Framework

#### 1.1 Update Test Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/test/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
};
```

#### 1.2 Create Test Setup File

**File**: `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
```

### Step 2: Create Test Utilities

#### 2.1 Test Factories

**File**: `src/test/factories/libraryFactory.ts`

```typescript
import { LibraryItem, Factor } from '@/features/library/types/library';
import { faker } from '@faker-js/faker';

export const createLibraryItem = (overrides?: Partial<LibraryItem>): LibraryItem => ({
  id: faker.string.uuid(),
  code: faker.string.alphanumeric(6).toUpperCase(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  unit: faker.helpers.arrayElement(['m²', 'm³', 'kg', 'pcs', 'hr']),
  assembly_id: faker.string.uuid(),
  status: faker.helpers.arrayElement(['draft', 'confirmed', 'actual']),
  version: 1,
  is_active: true,
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  created_by: faker.string.uuid(),
  ...overrides,
});

export const createFactor = (overrides?: Partial<Factor>): Factor => ({
  item_id: faker.string.alphanumeric(6).toUpperCase(),
  quantity: faker.number.float({ min: 0.1, max: 100, fractionDigits: 2 }),
  ...overrides,
});

export const createLibraryItemWithFactors = (
  overrides?: Partial<LibraryItem>
): LibraryItem => {
  const item = createLibraryItem(overrides);
  return {
    ...item,
    materials: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      createFactor()
    ),
    labour: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () =>
      createFactor()
    ),
    equipment: Array.from({ length: faker.number.int({ min: 0, max: 2 }) }, () =>
      createFactor()
    ),
  };
};

export const createLibraryItemBatch = (
  count: number,
  overrides?: Partial<LibraryItem>
): LibraryItem[] => {
  return Array.from({ length: count }, () => createLibraryItem(overrides));
};
```

#### 2.2 Custom Render Function

**File**: `src/test/utils/testUtils.tsx`

```typescript
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/shared/components/ui/toaster';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

interface TestProviderProps {
  children: React.ReactNode;
}

const TestProvider: React.FC<TestProviderProps> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestProvider, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Step 3: Unit Tests for Services

#### 3.1 Library Management Service Tests

**File**: `src/features/library/services/__tests__/libraryManagementService.test.ts`

```typescript
import { LibraryManagementService } from '../libraryManagementService';
import { createClient } from '@/shared/lib/supabase/client';
import { createLibraryItem, createLibraryItemBatch } from '@/test/factories/libraryFactory';

jest.mock('@/shared/lib/supabase/client');

describe('LibraryManagementService', () => {
  let service: LibraryManagementService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = LibraryManagementService.getInstance();
  });

  describe('createLibraryItem', () => {
    it('should create a new library item', async () => {
      const draft = {
        code: 'TEST001',
        name: 'Test Item',
        unit: 'm²',
        assembly_id: 'assembly-1',
      };

      const created = createLibraryItem({
        ...draft,
        status: 'draft',
      });

      mockSupabase.single.mockResolvedValue({ data: created, error: null });

      const result = await service.createLibraryItem(draft);

      expect(mockSupabase.from).toHaveBeenCalledWith('library_items');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...draft,
          status: 'draft',
          version: 1,
          is_active: true,
        })
      );
      expect(result).toEqual(created);
    });

    it('should validate required fields', async () => {
      const invalidDraft = {
        code: '',
        name: 'Test',
        unit: 'm²',
        assembly_id: 'assembly-1',
      };

      await expect(service.createLibraryItem(invalidDraft)).rejects.toThrow(
        'Code is required'
      );
    });

    it('should check for duplicate codes', async () => {
      const draft = {
        code: 'EXISTING',
        name: 'Test Item',
        unit: 'm²',
        assembly_id: 'assembly-1',
      };

      mockSupabase.single.mockResolvedValue({
        data: createLibraryItem({ code: 'EXISTING' }),
        error: null,
      });

      await expect(service.createLibraryItem(draft)).rejects.toThrow(
        'Item with code EXISTING already exists'
      );
    });
  });

  describe('confirmLibraryItem', () => {
    it('should confirm a draft item', async () => {
      const draftItem = createLibraryItem({ status: 'draft' });
      const confirmedItem = { ...draftItem, status: 'confirmed' };

      mockSupabase.single
        .mockResolvedValueOnce({ data: draftItem, error: null })
        .mockResolvedValueOnce({ data: confirmedItem, error: null });

      const result = await service.confirmLibraryItem(draftItem.id);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'confirmed',
        confirmed_at: expect.any(String),
      });
      expect(result.status).toBe('confirmed');
    });

    it('should not confirm already confirmed items', async () => {
      const confirmedItem = createLibraryItem({ status: 'confirmed' });

      mockSupabase.single.mockResolvedValue({ data: confirmedItem, error: null });

      await expect(service.confirmLibraryItem(confirmedItem.id)).rejects.toThrow(
        'Item is already confirmed'
      );
    });

    it('should validate item has factors before confirmation', async () => {
      const itemWithoutFactors = createLibraryItem({
        status: 'draft',
        materials: [],
        labour: [],
        equipment: [],
      });

      mockSupabase.single.mockResolvedValue({ data: itemWithoutFactors, error: null });

      await expect(service.confirmLibraryItem(itemWithoutFactors.id)).rejects.toThrow(
        'Item must have at least one factor defined'
      );
    });
  });

  describe('searchLibraryItems', () => {
    it('should search items by query', async () => {
      const items = createLibraryItemBatch(5);
      mockSupabase.range.mockResolvedValue({ data: items, error: null, count: 5 });

      const result = await service.searchLibraryItems({
        query: 'concrete',
        status: 'confirmed',
        divisionId: 'div-1',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('library_items');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'confirmed');
      expect(result.items).toEqual(items);
      expect(result.total).toBe(5);
    });

    it('should handle empty results', async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 });

      const result = await service.searchLibraryItems({ query: 'nonexistent' });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple items status', async () => {
      const itemIds = ['1', '2', '3'];
      const items = itemIds.map(id => createLibraryItem({ id, status: 'draft' }));

      mockSupabase.in.mockResolvedValue({ data: items, error: null });
      mockSupabase.update.mockResolvedValue({ data: items, error: null });

      const result = await service.bulkUpdateStatus(itemIds, 'confirmed');

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'confirmed',
        confirmed_at: expect.any(String),
      });
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      const itemIds = ['1', '2', '3'];
      
      mockSupabase.in.mockResolvedValue({
        data: [createLibraryItem({ id: '1' }), createLibraryItem({ id: '2' })],
        error: null,
      });

      const result = await service.bulkUpdateStatus(itemIds, 'confirmed');

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Item 3 not found');
    });
  });

  describe('cloneLibraryItem', () => {
    it('should create a copy with new code', async () => {
      const original = createLibraryItemWithFactors();
      const cloned = {
        ...original,
        id: 'new-id',
        code: `${original.code}_COPY`,
        status: 'draft',
        version: 1,
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: original, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: cloned, error: null });

      const result = await service.cloneLibraryItem(original.id);

      expect(result.code).toBe(`${original.code}_COPY`);
      expect(result.status).toBe('draft');
      expect(result.materials).toEqual(original.materials);
    });

    it('should generate unique code if copy exists', async () => {
      const original = createLibraryItem({ code: 'TEST001' });

      mockSupabase.single
        .mockResolvedValueOnce({ data: original, error: null })
        .mockResolvedValueOnce({ data: { code: 'TEST001_COPY' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      await service.cloneLibraryItem(original.id);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TEST001_COPY_2',
        })
      );
    });
  });

  describe('version control', () => {
    it('should save version before update', async () => {
      const item = createLibraryItem({ version: 1 });
      const updated = { ...item, name: 'Updated Name', version: 2 };

      mockSupabase.single
        .mockResolvedValueOnce({ data: item, error: null })
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: updated, error: null });

      await service.updateLibraryItem(item.id, { name: 'Updated Name' });

      expect(mockSupabase.from).toHaveBeenCalledWith('library_item_versions');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        library_item_id: item.id,
        version_number: 1,
        data: item,
      });
    });
  });
});
```

#### 3.2 Factor Calculator Service Tests

**File**: `src/features/estimates/services/__tests__/factorCalculatorService.test.ts`

```typescript
import { FactorCalculatorService } from '../factorCalculatorService';
import { ProjectRatesService } from '@/features/library/services/projectRatesService';
import { createLibraryItemWithFactors, createFactor } from '@/test/factories/libraryFactory';

jest.mock('@/features/library/services/projectRatesService');

describe('FactorCalculatorService', () => {
  let service: FactorCalculatorService;
  let mockProjectRatesService: jest.Mocked<ProjectRatesService>;

  beforeEach(() => {
    mockProjectRatesService = {
      getCurrentRates: jest.fn(),
    } as any;

    (ProjectRatesService.getInstance as jest.Mock).mockReturnValue(
      mockProjectRatesService
    );

    service = FactorCalculatorService.getInstance();
  });

  describe('calculateFactors', () => {
    it('should calculate material costs correctly', async () => {
      const item = createLibraryItemWithFactors({
        materials: [
          createFactor({ item_id: 'MAT001', quantity: 10 }),
          createFactor({ item_id: 'MAT002', quantity: 5 }),
        ],
        labour: [],
        equipment: [],
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue({
        projectId: 'project-1',
        materials: {
          MAT001: 100,
          MAT002: 200,
        },
        labour: {},
        equipment: {},
        effectiveDate: new Date(),
      });

      const result = await service.calculateFactors(
        'project-1',
        item,
        100 // quantity
      );

      expect(result.materials.totalCost).toBe(200000); // (10*100 + 5*200) * 100
      expect(result.materials.items).toHaveLength(2);
      expect(result.materials.items[0]).toEqual({
        itemId: 'MAT001',
        quantity: 1000, // 10 * 100
        rate: 100,
        totalCost: 100000,
      });
    });

    it('should handle missing rates gracefully', async () => {
      const item = createLibraryItemWithFactors({
        materials: [createFactor({ item_id: 'MAT999', quantity: 10 })],
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue({
        projectId: 'project-1',
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: new Date(),
      });

      const result = await service.calculateFactors('project-1', item, 100);

      expect(result.materials.items[0].rate).toBe(0);
      expect(result.materials.items[0].totalCost).toBe(0);
      expect(result.errors).toContain('Missing rate for material: MAT999');
    });

    it('should calculate labor with productivity factor', async () => {
      const item = createLibraryItemWithFactors({
        labour: [
          createFactor({ item_id: 'LAB001', quantity: 8 }), // 8 hours
        ],
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue({
        projectId: 'project-1',
        materials: {},
        labour: {
          LAB001: 50, // $50/hour
        },
        equipment: {},
        effectiveDate: new Date(),
      });

      const result = await service.calculateFactors(
        'project-1',
        item,
        100,
        1.2 // 20% productivity loss
      );

      expect(result.labour.items[0].quantity).toBe(960); // 8 * 100 * 1.2
      expect(result.labour.totalCost).toBe(48000); // 960 * 50
    });

    it('should apply wastage factor to materials', async () => {
      const item = createLibraryItemWithFactors({
        materials: [createFactor({ item_id: 'MAT001', quantity: 10 })],
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue({
        projectId: 'project-1',
        materials: { MAT001: 100 },
        labour: {},
        equipment: {},
        effectiveDate: new Date(),
      });

      const result = await service.calculateFactors(
        'project-1',
        item,
        100,
        1.0,
        1.1 // 10% wastage
      );

      expect(result.materials.items[0].quantity).toBe(1100); // 10 * 100 * 1.1
      expect(result.materials.totalCost).toBe(110000); // 1100 * 100
    });
  });

  describe('performance', () => {
    it('should calculate large batches efficiently', async () => {
      const items = createLibraryItemBatch(100).map(item =>
        createLibraryItemWithFactors({
          ...item,
          materials: Array.from({ length: 10 }, () => createFactor()),
          labour: Array.from({ length: 5 }, () => createFactor()),
          equipment: Array.from({ length: 3 }, () => createFactor()),
        })
      );

      mockProjectRatesService.getCurrentRates.mockResolvedValue({
        projectId: 'project-1',
        materials: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`MAT${i}`, 100])
        ),
        labour: Object.fromEntries(
          Array.from({ length: 20 }, (_, i) => [`LAB${i}`, 50])
        ),
        equipment: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`EQP${i}`, 200])
        ),
        effectiveDate: new Date(),
      });

      const start = Date.now();
      const results = await Promise.all(
        items.map(item => service.calculateFactors('project-1', item, 100))
      );
      const duration = Date.now() - start;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
```

### Step 4: Integration Tests

#### 4.1 Library to Estimate Integration Test

**File**: `src/features/estimates/services/__tests__/integration.test.ts`

```typescript
import { LibraryIntegrationService } from '../libraryIntegrationService';
import { LibraryManagementService } from '@/features/library/services/libraryManagementService';
import { FactorCalculatorService } from '../factorCalculatorService';
import { createLibraryItemWithFactors } from '@/test/factories/libraryFactory';
import { createClient } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('Library to Estimate Integration', () => {
  let integrationService: LibraryIntegrationService;
  let libraryService: LibraryManagementService;
  let factorService: FactorCalculatorService;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Initialize services
    integrationService = LibraryIntegrationService.getInstance();
    libraryService = LibraryManagementService.getInstance();
    factorService = FactorCalculatorService.getInstance();
  });

  describe('Full workflow test', () => {
    it('should create estimate from library items with calculations', async () => {
      // Step 1: Create library items
      const libraryItems = [
        createLibraryItemWithFactors({
          code: 'CONC001',
          name: 'Concrete Foundation',
          unit: 'm³',
          assembly_id: 'found-asm-1',
          materials: [
            { item_id: 'CEMENT', quantity: 300 }, // kg/m³
            { item_id: 'SAND', quantity: 500 },   // kg/m³
            { item_id: 'GRAVEL', quantity: 800 }, // kg/m³
          ],
          labour: [
            { item_id: 'MASON', quantity: 2 },    // hours/m³
            { item_id: 'HELPER', quantity: 4 },   // hours/m³
          ],
          equipment: [
            { item_id: 'MIXER', quantity: 0.5 },  // hours/m³
          ],
        }),
        createLibraryItemWithFactors({
          code: 'STEEL001',
          name: 'Steel Reinforcement',
          unit: 'kg',
          assembly_id: 'found-asm-2',
          materials: [
            { item_id: 'REBAR12', quantity: 1 },  // kg/kg
          ],
          labour: [
            { item_id: 'STEELFIXER', quantity: 0.02 }, // hours/kg
          ],
        }),
      ];

      // Mock library service responses
      libraryItems.forEach(item => {
        mockSupabase.single.mockResolvedValueOnce({ data: item, error: null });
      });

      // Step 2: Create estimate structure
      const estimateData = {
        projectId: 'project-123',
        items: [
          {
            libraryItemId: libraryItems[0].id,
            quantity: 50, // 50 m³ of concrete
            location: 'Foundation - Block A',
          },
          {
            libraryItemId: libraryItems[1].id,
            quantity: 2000, // 2000 kg of steel
            location: 'Foundation - Block A',
          },
        ],
      };

      // Mock project rates
      jest.spyOn(factorService as any, 'getProjectRates').mockResolvedValue({
        materials: {
          CEMENT: 0.15,    // $/kg
          SAND: 0.05,      // $/kg
          GRAVEL: 0.03,    // $/kg
          REBAR12: 1.20,   // $/kg
        },
        labour: {
          MASON: 40,       // $/hour
          HELPER: 20,      // $/hour
          STEELFIXER: 35,  // $/hour
        },
        equipment: {
          MIXER: 50,       // $/hour
        },
      });

      // Step 3: Create estimate from library items
      const result = await integrationService.createEstimateFromLibraryItems(
        estimateData.projectId,
        estimateData.items
      );

      // Verify estimate structure created
      expect(result.summary).toBeDefined();
      expect(result.details).toHaveLength(2);

      // Verify concrete calculations
      const concreteDetail = result.details[0];
      expect(concreteDetail.libraryItemCode).toBe('CONC001');
      expect(concreteDetail.quantity).toBe(50);
      
      // Material calculations: 50 m³
      expect(concreteDetail.materials.totalCost).toBe(
        50 * (300 * 0.15 + 500 * 0.05 + 800 * 0.03) // = 4700
      );
      
      // Labour calculations: 50 m³
      expect(concreteDetail.labour.totalCost).toBe(
        50 * (2 * 40 + 4 * 20) // = 8000
      );
      
      // Equipment calculations: 50 m³
      expect(concreteDetail.equipment.totalCost).toBe(
        50 * (0.5 * 50) // = 1250
      );

      // Verify steel calculations
      const steelDetail = result.details[1];
      expect(steelDetail.libraryItemCode).toBe('STEEL001');
      expect(steelDetail.quantity).toBe(2000);
      
      // Material: 2000 kg * 1 * $1.20 = $2400
      expect(steelDetail.materials.totalCost).toBe(2400);
      
      // Labour: 2000 kg * 0.02 hours/kg * $35/hour = $1400
      expect(steelDetail.labour.totalCost).toBe(1400);

      // Verify summary totals
      expect(result.summary.totalMaterials).toBe(7100);  // 4700 + 2400
      expect(result.summary.totalLabour).toBe(9400);     // 8000 + 1400
      expect(result.summary.totalEquipment).toBe(1250);  // 1250 + 0
      expect(result.summary.grandTotal).toBe(17750);     // Sum of all
    });

    it('should handle errors in calculation gracefully', async () => {
      const libraryItem = createLibraryItemWithFactors({
        materials: [{ item_id: 'UNKNOWN', quantity: 100 }],
      });

      mockSupabase.single.mockResolvedValue({ data: libraryItem, error: null });

      // Mock missing rates
      jest.spyOn(factorService as any, 'getProjectRates').mockResolvedValue({
        materials: {},
        labour: {},
        equipment: {},
      });

      const result = await integrationService.createEstimateFromLibraryItems(
        'project-123',
        [{ libraryItemId: libraryItem.id, quantity: 10 }]
      );

      expect(result.details[0].errors).toContain('Missing rate for material: UNKNOWN');
      expect(result.details[0].materials.totalCost).toBe(0);
    });
  });
});
```

### Step 5: Component Tests

#### 5.1 Library Browser Component Test

**File**: `src/features/library/components/__tests__/LibraryBrowser.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor, within } from '@/test/utils/testUtils';
import userEvent from '@testing-library/user-event';
import { LibraryBrowser } from '../LibraryBrowser';
import { createLibraryItemBatch } from '@/test/factories/libraryFactory';
import { LibraryManagementService } from '../../services/libraryManagementService';

jest.mock('../../services/libraryManagementService');

describe('LibraryBrowser', () => {
  const mockLibraryService = LibraryManagementService.getInstance as jest.MockedFunction<
    typeof LibraryManagementService.getInstance
  >;

  const mockSearchLibraryItems = jest.fn();
  const mockGetLibraryItem = jest.fn();

  beforeEach(() => {
    mockLibraryService.mockReturnValue({
      searchLibraryItems: mockSearchLibraryItems,
      getLibraryItem: mockGetLibraryItem,
    } as any);
  });

  it('renders search interface', () => {
    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    expect(screen.getByPlaceholderText(/search library/i)).toBeInTheDocument();
    expect(screen.getByText(/filters/i)).toBeInTheDocument();
  });

  it('searches items on input', async () => {
    const items = createLibraryItemBatch(5);
    mockSearchLibraryItems.mockResolvedValue({
      items,
      total: 5,
      page: 1,
      pageSize: 20,
    });

    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search library/i);
    await userEvent.type(searchInput, 'concrete');

    await waitFor(() => {
      expect(mockSearchLibraryItems).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'concrete',
        })
      );
    });

    items.forEach(item => {
      expect(screen.getByText(item.code)).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    const filterButton = screen.getByText(/filters/i);
    fireEvent.click(filterButton);

    const statusFilter = screen.getByLabelText(/confirmed/i);
    fireEvent.click(statusFilter);

    await waitFor(() => {
      expect(mockSearchLibraryItems).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
        })
      );
    });
  });

  it('selects item and shows details', async () => {
    const items = createLibraryItemBatch(3);
    const selectedItem = items[0];
    
    mockSearchLibraryItems.mockResolvedValue({
      items,
      total: 3,
      page: 1,
      pageSize: 20,
    });
    
    mockGetLibraryItem.mockResolvedValue(selectedItem);

    const onItemSelect = jest.fn();
    render(<LibraryBrowser onItemSelect={onItemSelect} />);

    await waitFor(() => {
      expect(screen.getByText(selectedItem.code)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(selectedItem.code));

    await waitFor(() => {
      expect(mockGetLibraryItem).toHaveBeenCalledWith(selectedItem.id);
    });

    // Check details panel
    expect(screen.getByText(selectedItem.name)).toBeInTheDocument();
    expect(screen.getByText(selectedItem.unit)).toBeInTheDocument();
    
    // Check select button
    const selectButton = screen.getByText(/select item/i);
    fireEvent.click(selectButton);

    expect(onItemSelect).toHaveBeenCalledWith(selectedItem);
  });

  it('handles pagination', async () => {
    mockSearchLibraryItems
      .mockResolvedValueOnce({
        items: createLibraryItemBatch(20),
        total: 50,
        page: 1,
        pageSize: 20,
      })
      .mockResolvedValueOnce({
        items: createLibraryItemBatch(20),
        total: 50,
        page: 2,
        pageSize: 20,
      });

    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText(/next page/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockSearchLibraryItems).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('displays loading state', async () => {
    mockSearchLibraryItems.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles errors gracefully', async () => {
    mockSearchLibraryItems.mockRejectedValue(new Error('Network error'));

    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading items/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    const items = createLibraryItemBatch(5);
    mockSearchLibraryItems.mockResolvedValue({
      items,
      total: 5,
      page: 1,
      pageSize: 20,
    });

    render(<LibraryBrowser onItemSelect={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(items[0].code)).toBeInTheDocument();
    });

    const firstItem = screen.getByText(items[0].code);
    firstItem.focus();

    // Navigate with arrow keys
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    expect(screen.getByText(items[1].code)).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(screen.getByText(items[0].code)).toHaveFocus();

    // Select with Enter
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    await waitFor(() => {
      expect(mockGetLibraryItem).toHaveBeenCalledWith(items[0].id);
    });
  });
});
```

### Step 6: E2E Tests

#### 6.1 Playwright Configuration

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 6.2 E2E Test Suite

**File**: `e2e/library-to-estimate.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Library to Estimate Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('complete workflow from library to estimate', async ({ page }) => {
    // Navigate to project
    await page.goto('/projects/test-project-id');
    await page.click('text=Estimates');

    // Open library browser
    await page.click('text=Add from Library');
    await expect(page.locator('h2:has-text("Library Browser")')).toBeVisible();

    // Search for concrete item
    await page.fill('[placeholder*="Search library"]', 'concrete');
    await page.waitForTimeout(500); // Wait for debounce

    // Select first item
    await page.click('.library-item-row:first-child');
    await expect(page.locator('text=Concrete Foundation')).toBeVisible();
    
    // Check factors are displayed
    await expect(page.locator('text=Materials (3 items)')).toBeVisible();
    await expect(page.locator('text=Labour (2 items)')).toBeVisible();

    // Add to estimate
    await page.fill('[name="quantity"]', '50');
    await page.fill('[name="location"]', 'Foundation - Block A');
    await page.click('text=Add to Estimate');

    // Verify item added
    await expect(page.locator('text=Item added successfully')).toBeVisible();
    await expect(page.locator('text=CONC001')).toBeVisible();
    await expect(page.locator('text=50 m³')).toBeVisible();

    // Check calculations
    await page.click('text=View Details');
    await expect(page.locator('text=Material Cost: $4,700')).toBeVisible();
    await expect(page.locator('text=Labour Cost: $8,000')).toBeVisible();
    await expect(page.locator('text=Equipment Cost: $1,250')).toBeVisible();
  });

  test('bulk operations on library items', async ({ page }) => {
    await page.goto('/admin/library');

    // Select multiple items
    await page.check('.select-all-checkbox');
    await expect(page.locator('text=10 items selected')).toBeVisible();

    // Open bulk operations
    await page.click('text=Bulk Actions');
    await page.click('text=Confirm Items');

    // Confirm dialog
    await page.click('dialog >> text=Confirm');

    // Wait for operation to complete
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('text=10 items confirmed')).toBeVisible({
      timeout: 10000,
    });
  });

  test('mobile responsive library browser', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/projects/test-project-id/estimates');
    await page.click('[aria-label="Menu"]');
    await page.click('text=Add from Library');

    // Mobile-specific UI
    await expect(page.locator('.mobile-search-bar')).toBeVisible();
    await page.fill('.mobile-search-bar input', 'steel');

    // Touch to select
    await page.tap('.library-item-card:first-child');
    await expect(page.locator('.bottom-sheet')).toBeVisible();

    // Swipe up for details
    const sheet = page.locator('.bottom-sheet');
    await sheet.dragTo(sheet, {
      sourcePosition: { x: 100, y: 50 },
      targetPosition: { x: 100, y: -200 },
    });

    await expect(page.locator('text=Steel Reinforcement')).toBeVisible();
  });

  test('keyboard shortcuts', async ({ page }) => {
    await page.goto('/admin/library');

    // Focus search with Ctrl+F
    await page.keyboard.press('Control+f');
    await expect(page.locator('[placeholder*="Search"]')).toBeFocused();

    // Create new item with Ctrl+N
    await page.keyboard.press('Control+n');
    await expect(page.locator('h2:has-text("New Library Item")')).toBeVisible();

    // Cancel with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('h2:has-text("New Library Item")')).not.toBeVisible();
  });
});
```

### Step 7: Performance Tests

**File**: `src/test/performance/library.perf.test.ts`

```typescript
import { performance } from 'perf_hooks';
import { LibraryManagementService } from '@/features/library/services/libraryManagementService';
import { FactorCalculatorService } from '@/features/estimates/services/factorCalculatorService';
import { createLibraryItemBatch } from '@/test/factories/libraryFactory';

describe('Performance Benchmarks', () => {
  const libraryService = LibraryManagementService.getInstance();
  const factorService = FactorCalculatorService.getInstance();

  describe('Library Search Performance', () => {
    it('should search 10,000 items in under 500ms', async () => {
      const items = createLibraryItemBatch(10000);
      
      // Mock database response time
      jest.spyOn(libraryService as any, 'searchDatabase')
        .mockImplementation(async (query) => {
          // Simulate database search
          const start = performance.now();
          const filtered = items.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.code.toLowerCase().includes(query.toLowerCase())
          );
          const duration = performance.now() - start;
          
          expect(duration).toBeLessThan(100); // DB query should be fast
          return filtered;
        });

      const start = performance.now();
      await libraryService.searchLibraryItems({ query: 'concrete' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Factor Calculation Performance', () => {
    it('should calculate 1000 items in under 10 seconds', async () => {
      const items = createLibraryItemBatch(1000);
      const projectId = 'perf-test-project';

      const start = performance.now();
      const results = await Promise.all(
        items.map(item => 
          factorService.calculateFactors(projectId, item, 100)
        )
      );
      const duration = performance.now() - start;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(10000);
      
      // Average time per item
      const avgTime = duration / 1000;
      expect(avgTime).toBeLessThan(10); // Less than 10ms per item
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should update 500 items status in under 5 seconds', async () => {
      const itemIds = Array.from({ length: 500 }, (_, i) => `item-${i}`);

      jest.spyOn(libraryService as any, 'updateBatch')
        .mockImplementation(async (ids, update) => {
          // Simulate batch update
          await new Promise(resolve => setTimeout(resolve, 10));
          return { successful: ids.length, failed: 0, errors: [] };
        });

      const start = performance.now();
      const result = await libraryService.bulkUpdateStatus(itemIds, 'confirmed');
      const duration = performance.now() - start;

      expect(result.successful).toBe(500);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Memory Usage', () => {
    it('should handle large datasets without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process large dataset
      for (let i = 0; i < 10; i++) {
        const items = createLibraryItemBatch(1000);
        await Promise.all(
          items.map(item => 
            factorService.calculateFactors('project-1', item, 100)
          )
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
```

### Step 8: Test Data Management

**File**: `src/test/fixtures/seed-test-data.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';
import { createLibraryItemBatch } from '../factories/libraryFactory';

export async function seedTestDatabase() {
  const supabase = createClient();
  
  // Clear existing test data
  await supabase.from('library_items').delete().eq('created_by', 'test-user');
  
  // Create test divisions, sections, and assemblies
  const divisions = [
    { id: 'div-1', code: '03', name: 'Concrete' },
    { id: 'div-2', code: '04', name: 'Masonry' },
    { id: 'div-3', code: '05', name: 'Metals' },
  ];
  
  await supabase.from('divisions').upsert(divisions);
  
  // Create library items
  const items = createLibraryItemBatch(100, {
    created_by: 'test-user',
  });
  
  await supabase.from('library_items').insert(items);
  
  // Create project rates
  const projectRates = {
    project_id: 'test-project-id',
    materials: Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`MAT${i}`, Math.random() * 100])
    ),
    labour: Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`LAB${i}`, Math.random() * 50 + 20])
    ),
    equipment: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`EQP${i}`, Math.random() * 200 + 50])
    ),
    effective_date: new Date().toISOString(),
  };
  
  await supabase.from('project_rates').upsert(projectRates);
  
  console.log('Test database seeded successfully');
}

export async function cleanupTestDatabase() {
  const supabase = createClient();
  
  await supabase.from('library_items').delete().eq('created_by', 'test-user');
  await supabase.from('project_rates').delete().eq('project_id', 'test-project-id');
  
  console.log('Test database cleaned up');
}
```

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:14.1.0.89
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npx supabase db reset
          npm run test:seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Performance tests
        run: npm run test:performance
        
      - name: Store test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
            test-results/
```

## Testing Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use clear, descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and independent

### 2. Mock Strategy
- Mock external dependencies (Supabase, APIs)
- Use factories for consistent test data
- Avoid over-mocking; test real implementations when possible
- Clear mocks between tests

### 3. Async Testing
- Always use async/await for asynchronous operations
- Use waitFor for DOM updates
- Set appropriate timeouts for long operations
- Handle promise rejections properly

### 4. Performance Testing
- Set realistic performance benchmarks
- Test with production-like data volumes
- Monitor memory usage for leaks
- Profile slow tests and optimize

### 5. E2E Testing
- Test critical user journeys
- Use page objects for maintainability
- Take screenshots on failures
- Run on multiple browsers/devices

## Debugging Tests

### VSCode Debug Configuration

**File**: `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-coverage",
        "${relativeFile}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Playwright Test",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": [
        "test",
        "${relativeFile}",
        "--debug"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

## Next Steps

After completing this phase:

1. Proceed to [Phase 6: Production Deployment](./06-PRODUCTION-DEPLOYMENT.md)
2. Set up continuous monitoring for test results
3. Create test coverage reports dashboard
4. Establish performance regression alerts
5. Document testing procedures for team

---

*Phase 5 Complete: Comprehensive testing ensures reliability and quality*