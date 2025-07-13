/**
 * E2E Tests for Library Management Workflow
 * Phase 5: Testing Infrastructure
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Library Management E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to library management page
    await page.goto('/admin/library');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Library Item Creation Workflow', () => {
    test('should create a new library item from start to finish', async () => {
      // Step 1: Open create item dialog
      await page.click('[data-testid="create-item-button"]');
      await expect(page.locator('[data-testid="create-item-dialog"]')).toBeVisible();

      // Step 2: Fill in basic item details
      await page.fill('[data-testid="item-name-input"]', 'E2E Test Concrete Block');
      await page.fill('[data-testid="item-code-input"]', 'E2E001');
      await page.selectOption('[data-testid="item-unit-select"]', 'm³');
      await page.fill('[data-testid="item-description-input"]', 'Test concrete block for E2E testing');

      // Step 3: Select assembly
      await page.click('[data-testid="assembly-select"]');
      await page.click('[data-testid="assembly-option-concrete"]');

      // Step 4: Add specifications
      await page.fill('[data-testid="specifications-input"]', 'Grade 25 concrete, reinforced');
      await page.fill('[data-testid="wastage-percentage-input"]', '5');

      // Step 5: Create the item
      await page.click('[data-testid="create-item-submit"]');

      // Verify item was created
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('text=E2E Test Concrete Block')).toBeVisible();

      // Verify item appears in the library list
      await page.fill('[data-testid="search-input"]', 'E2E Test Concrete Block');
      await expect(page.locator('[data-testid="library-item-E2E001"]')).toBeVisible();
    });

    test('should validate required fields during item creation', async () => {
      // Open create item dialog
      await page.click('[data-testid="create-item-button"]');

      // Try to submit without required fields
      await page.click('[data-testid="create-item-submit"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="error-item-name"]')).toContainText('Item name is required');
      await expect(page.locator('[data-testid="error-item-unit"]')).toContainText('Unit is required');
      await expect(page.locator('[data-testid="error-assembly"]')).toContainText('Assembly is required');
    });
  });

  test.describe('Factor Management Workflow', () => {
    test('should add material factors to a library item', async () => {
      // First create a library item or select existing one
      await page.click('[data-testid="library-item-first"]');
      await page.click('[data-testid="edit-item-button"]');

      // Navigate to Material Factors tab
      await page.click('[data-testid="factors-tab"]');
      await page.click('[data-testid="material-factors-tab"]');

      // Add material factor
      await page.click('[data-testid="add-material-factor"]');
      
      // Fill material factor details
      await page.selectOption('[data-testid="material-select"]', 'CEMENT');
      await page.fill('[data-testid="quantity-per-unit"]', '300');
      await page.fill('[data-testid="wastage-percentage"]', '5');
      await page.fill('[data-testid="material-rate"]', '0.15');

      // Save factor
      await page.click('[data-testid="save-material-factor"]');

      // Verify factor was added
      await expect(page.locator('[data-testid="material-factor-CEMENT"]')).toBeVisible();
      await expect(page.locator('text=300 kg')).toBeVisible();
      await expect(page.locator('text=5%')).toBeVisible();
    });

    test('should add labour factors to a library item', async () => {
      // Select library item
      await page.click('[data-testid="library-item-first"]');
      await page.click('[data-testid="edit-item-button"]');

      // Navigate to Labour Factors tab
      await page.click('[data-testid="factors-tab"]');
      await page.click('[data-testid="labour-factors-tab"]');

      // Add labour factor
      await page.click('[data-testid="add-labour-factor"]');
      
      // Fill labour factor details
      await page.selectOption('[data-testid="labour-select"]', 'MASON');
      await page.fill('[data-testid="hours-per-unit"]', '2');
      await page.fill('[data-testid="labour-rate"]', '40');

      // Save factor
      await page.click('[data-testid="save-labour-factor"]');

      // Verify factor was added
      await expect(page.locator('[data-testid="labour-factor-MASON"]')).toBeVisible();
      await expect(page.locator('text=2 hours')).toBeVisible();
      await expect(page.locator('text=$40/hour')).toBeVisible();
    });
  });

  test.describe('Item Lifecycle Management', () => {
    test('should complete full item lifecycle: Draft → Confirmed → Actual', async () => {
      // Create item (starts as draft)
      await page.click('[data-testid="create-item-button"]');
      await page.fill('[data-testid="item-name-input"]', 'Lifecycle Test Item');
      await page.fill('[data-testid="item-code-input"]', 'LT001');
      await page.selectOption('[data-testid="item-unit-select"]', 'each');
      await page.click('[data-testid="assembly-select"]');
      await page.click('[data-testid="assembly-option-concrete"]');
      await page.click('[data-testid="create-item-submit"]');

      // Verify item is created as draft
      await expect(page.locator('[data-testid="status-badge-draft"]')).toBeVisible();

      // Add factors to make item confirmable
      await page.click('[data-testid="edit-item-button"]');
      await page.click('[data-testid="factors-tab"]');
      await page.click('[data-testid="add-material-factor"]');
      await page.selectOption('[data-testid="material-select"]', 'CEMENT');
      await page.fill('[data-testid="quantity-per-unit"]', '1');
      await page.click('[data-testid="save-material-factor"]');

      // Confirm the item
      await page.click('[data-testid="confirm-item-button"]');
      await page.fill('[data-testid="confirmation-notes"]', 'Confirmed for production use');
      await page.click('[data-testid="confirm-submit"]');

      // Verify item is confirmed
      await expect(page.locator('[data-testid="status-badge-confirmed"]')).toBeVisible();

      // Mark as actual
      await page.click('[data-testid="mark-actual-button"]');
      await page.fill('[data-testid="actual-notes"]', 'Used in project ABC123');
      await page.click('[data-testid="actual-submit"]');

      // Verify item is actual
      await expect(page.locator('[data-testid="status-badge-actual"]')).toBeVisible();
    });

    test('should prevent confirmation of items without factors', async () => {
      // Create item without factors
      await page.click('[data-testid="create-item-button"]');
      await page.fill('[data-testid="item-name-input"]', 'Incomplete Item');
      await page.fill('[data-testid="item-code-input"]', 'INC001');
      await page.selectOption('[data-testid="item-unit-select"]', 'each');
      await page.click('[data-testid="assembly-select"]');
      await page.click('[data-testid="assembly-option-concrete"]');
      await page.click('[data-testid="create-item-submit"]');

      // Try to confirm without factors
      await page.click('[data-testid="confirm-item-button"]');

      // Verify error message
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('Item must have at least one factor');
    });
  });

  test.describe('Bulk Operations Workflow', () => {
    test('should perform bulk status update', async () => {
      // Select multiple items
      await page.click('[data-testid="select-all-checkbox"]');

      // Open bulk operations panel
      await page.click('[data-testid="bulk-operations-button"]');

      // Select update status operation
      await page.click('[data-testid="operation-update-status"]');

      // Configure operation
      await page.selectOption('[data-testid="status-select"]', 'confirmed');

      // Preview changes
      await page.click('[data-testid="preview-button"]');
      await expect(page.locator('[data-testid="preview-panel"]')).toBeVisible();

      // Execute operation
      await page.click('[data-testid="execute-button"]');

      // Wait for operation to complete
      await expect(page.locator('[data-testid="operation-complete"]')).toBeVisible();

      // Verify items were updated
      await expect(page.locator('[data-testid="status-badge-confirmed"]').first()).toBeVisible();
    });

    test('should perform bulk price adjustment', async () => {
      // Select multiple items
      await page.check('[data-testid="item-checkbox-1"]');
      await page.check('[data-testid="item-checkbox-2"]');

      // Open bulk operations
      await page.click('[data-testid="bulk-operations-button"]');

      // Select price adjustment operation
      await page.click('[data-testid="operation-adjust-prices"]');

      // Configure 10% increase
      await page.fill('[data-testid="percentage-input"]', '10');

      // Select cost fields
      await page.check('[data-testid="material-cost-checkbox"]');
      await page.check('[data-testid="labour-cost-checkbox"]');

      // Execute operation
      await page.click('[data-testid="execute-button"]');

      // Verify price changes
      await expect(page.locator('[data-testid="operation-complete"]')).toBeVisible();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search items by name and code', async () => {
      // Search by name
      await page.fill('[data-testid="search-input"]', 'concrete');
      await page.press('[data-testid="search-input"]', 'Enter');

      // Verify filtered results
      await expect(page.locator('[data-testid="search-results"]')).toContainText('concrete');

      // Clear search
      await page.fill('[data-testid="search-input"]', '');

      // Search by code
      await page.fill('[data-testid="search-input"]', 'CON');
      await page.press('[data-testid="search-input"]', 'Enter');

      // Verify code-based results
      await expect(page.locator('[data-testid="item-code"]').first()).toContainText('CON');
    });

    test('should filter items by status', async () => {
      // Filter by confirmed items
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-confirmed"]');

      // Verify only confirmed items are shown
      await expect(page.locator('[data-testid="status-badge-draft"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="status-badge-confirmed"]').first()).toBeVisible();

      // Clear filter
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-all"]');
    });

    test('should filter items by assembly', async () => {
      // Filter by concrete assembly
      await page.click('[data-testid="assembly-filter"]');
      await page.click('[data-testid="assembly-concrete"]');

      // Verify only concrete items are shown
      await expect(page.locator('[data-testid="assembly-badge"]').first()).toContainText('Concrete');

      // Apply multiple filters
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-confirmed"]');

      // Verify combined filtering
      await expect(page.locator('[data-testid="status-badge-confirmed"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="assembly-badge"]').first()).toContainText('Concrete');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to library
      await page.goto('/admin/library');

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-search"]')).toBeVisible();

      // Test mobile search
      await page.fill('[data-testid="mobile-search"]', 'test');
      await expect(page.locator('[data-testid="mobile-search-results"]')).toBeVisible();

      // Test mobile item interaction
      await page.click('[data-testid="mobile-item-card"]');
      await expect(page.locator('[data-testid="mobile-item-detail"]')).toBeVisible();

      // Test mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/library/**', route => route.abort());

      // Try to create item
      await page.click('[data-testid="create-item-button"]');
      await page.fill('[data-testid="item-name-input"]', 'Network Test Item');
      await page.click('[data-testid="create-item-submit"]');

      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle validation errors from server', async () => {
      // Mock server validation error
      await page.route('**/api/library/items', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed',
            details: { code: 'Item code already exists' }
          })
        });
      });

      // Try to create item with duplicate code
      await page.click('[data-testid="create-item-button"]');
      await page.fill('[data-testid="item-name-input"]', 'Duplicate Test');
      await page.fill('[data-testid="item-code-input"]', 'DUP001');
      await page.click('[data-testid="create-item-submit"]');

      // Verify server error is displayed
      await expect(page.locator('[data-testid="server-error"]')).toContainText('Item code already exists');
    });
  });

  test.describe('Performance Tests', () => {
    test('should load large library efficiently', async () => {
      // Navigate to library with many items
      await page.goto('/admin/library?test=large-dataset');

      // Measure load time
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Verify reasonable load time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Verify pagination works
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      await page.click('[data-testid="next-page"]');
      await expect(page.locator('[data-testid="page-2"]')).toBeVisible();
    });

    test('should handle rapid user interactions', async () => {
      // Rapid search typing
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('a');
      await searchInput.fill('ab');
      await searchInput.fill('abc');
      await searchInput.fill('abcd');

      // Should not crash and should show relevant results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // Rapid filter changes
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-confirmed"]');
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-draft"]');
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-all"]');

      // Should handle rapid changes without errors
      await expect(page.locator('[data-testid="library-grid"]')).toBeVisible();
    });
  });
});