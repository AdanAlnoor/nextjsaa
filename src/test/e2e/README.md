# E2E Testing Guide

## Overview
This directory contains comprehensive end-to-end tests for the Library-to-Estimate Integration system using Playwright. These tests cover complete user journeys across desktop and mobile platforms.

## Test Structure

### 1. Library Management Tests (`library-management.spec.ts`)
- **Library Item Creation Workflow**: Complete item creation process with validation
- **Factor Management**: Adding material, labour, and equipment factors
- **Item Lifecycle Management**: Draft → Confirmed → Actual transitions
- **Bulk Operations**: Mass updates, price adjustments, cloning
- **Search and Filtering**: Advanced search and filter combinations
- **Mobile Responsiveness**: Mobile-specific UI testing
- **Error Handling**: Network errors, validation failures
- **Performance**: Large dataset handling and user interaction speed

### 2. Estimate Integration Tests (`estimate-integration.spec.ts`)
- **Library Item Selection**: Adding items to estimates with quantities and notes
- **Quick Add Functionality**: Creating new library items from estimates
- **Factor Calculation Integration**: Detailed cost breakdowns and calculations
- **Schedule Integration**: Material, labour, and equipment schedule generation
- **Rate Management**: Project-specific rates and rate history
- **Export and Reporting**: Excel exports and detailed cost reports
- **Error Handling**: Missing factors, rate calculation errors
- **Performance**: Large estimate handling

### 3. Mobile Workflow Tests (`mobile-workflow.spec.ts`)
- **Mobile Interface**: Touch-optimized library interface
- **Touch Interactions**: Tap, swipe, scroll gestures
- **Mobile Search and Filtering**: Category sheets, sort menus
- **Item Detail Drawer**: Bottom-up mobile detail view
- **Bulk Operations**: Mobile bulk selection and actions
- **Navigation and Gestures**: Pull-to-refresh, infinite scroll
- **Performance**: Mobile load times and smooth scrolling
- **Offline Capabilities**: Offline mode and data sync
- **Accessibility**: Screen readers, high contrast, large text
- **Error Handling**: Mobile-friendly error messages

## Running Tests

### Prerequisites
```bash
npm install @playwright/test
npx playwright install
```

### Running All E2E Tests
```bash
npm run test:e2e
```

### Running Specific Test Suites
```bash
# Library management tests only
npx playwright test library-management

# Estimate integration tests only
npx playwright test estimate-integration

# Mobile workflow tests only
npx playwright test mobile-workflow
```

### Running Tests in Different Browsers
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# All browsers
npx playwright test
```

### Debug Mode
```bash
npx playwright test --debug
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
```

## Test Configuration

### Environment Variables
- `E2E_BASE_URL`: Base URL for testing (default: http://localhost:3000)
- `CI`: Set to true for CI environment optimizations

### Test Data
Tests use factory functions from `@/test/factories/libraryFactory` to generate consistent test data:
- `createLibraryItem()`: Basic library item
- `createRealisticLibraryItem()`: Industry-specific items (concrete, steel, etc.)
- `createLibraryItemBatch()`: Multiple items for testing

### Test Selectors
All tests use `data-testid` attributes for reliable element selection:
```html
<button data-testid="create-item-button">Create Item</button>
<input data-testid="item-name-input" />
<div data-testid="library-item-card-1">...</div>
```

## Browser Coverage
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: Mobile Chrome, Mobile Safari
- **Viewports**: Various screen sizes from 320px to 1920px

## Performance Benchmarks
Tests include performance assertions:
- Page load time: < 3 seconds
- Search response: < 500ms
- Bulk operations: < 5 seconds for 100 items
- Mobile scroll: Smooth 60fps performance

## Accessibility Testing
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- High contrast mode
- Large text support
- Touch target sizes (minimum 44px)

## Error Scenarios Covered
- Network timeouts and failures
- Server validation errors
- Missing data scenarios
- Rate calculation failures
- Offline mode handling
- Concurrent user conflicts

## CI/CD Integration
Tests are configured for CI environments:
- Parallel execution disabled in CI
- 2 retries on failure
- Multiple output formats (HTML, JSON, JUnit)
- Video recording on failure
- Screenshot capture on failure

## Best Practices

### Writing New Tests
1. Use descriptive test names that explain the user journey
2. Group related tests in `describe` blocks
3. Use `data-testid` attributes for element selection
4. Include performance assertions where relevant
5. Test both happy path and error scenarios
6. Add mobile-specific tests for touch interactions

### Test Maintenance
1. Keep test data factories up to date
2. Update selectors when UI changes
3. Review and update performance benchmarks
4. Ensure tests remain stable across browser updates
5. Add tests for new features and bug fixes

### Debugging Tips
1. Use `--debug` flag to step through tests
2. Add `await page.pause()` for manual inspection
3. Use `console.log()` for debugging test state
4. Check browser developer tools during test runs
5. Record videos of failing tests for analysis

## Reporting
Test results are output in multiple formats:
- **HTML Report**: Interactive results with screenshots and videos
- **JSON Report**: Machine-readable results for CI integration
- **JUnit Report**: XML format for build systems

Access reports at:
- HTML: `./playwright-report/index.html`
- JSON: `./test-results/e2e-results.json`
- JUnit: `./test-results/e2e-results.xml`

## Contributing
When adding new E2E tests:
1. Follow the existing test structure and naming conventions
2. Add appropriate test data selectors to components
3. Include both desktop and mobile test coverage
4. Document any new test patterns or utilities
5. Ensure tests are reliable and don't create false positives