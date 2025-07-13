/**
 * E2E Tests for Library-to-Estimate Integration
 * Phase 5: Testing Infrastructure
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Library-to-Estimate Integration E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to project estimate page
    await page.goto('/projects/test-project-123/estimate');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Library Item Selection and Integration', () => {
    test('should add library items to estimate', async () => {
      // Open library selector
      await page.click('[data-testid="add-library-items-button"]');
      await expect(page.locator('[data-testid="library-selector-dialog"]')).toBeVisible();

      // Search for items
      await page.fill('[data-testid="library-search"]', 'concrete');
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // Select first item
      await page.click('[data-testid="library-item-card-1"]');
      await expect(page.locator('[data-testid="selected-items-count"]')).toContainText('1');

      // Update quantity
      await page.fill('[data-testid="quantity-input-1"]', '25');
      
      // Add notes
      await page.fill('[data-testid="notes-input-1"]', 'Foundation slab concrete');

      // Confirm selection
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify item added to estimate
      await expect(page.locator('[data-testid="estimate-item-concrete"]')).toBeVisible();
      await expect(page.locator('text=25 m³')).toBeVisible();
      await expect(page.locator('text=Foundation slab concrete')).toBeVisible();
    });

    test('should calculate costs when adding library items', async () => {
      // Add library item with known costs
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-card-known-cost"]');
      
      // Set quantity
      await page.fill('[data-testid="quantity-input-1"]', '10');
      
      // Confirm selection
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify cost calculation
      await expect(page.locator('[data-testid="item-total-cost"]')).toBeVisible();
      await expect(page.locator('[data-testid="material-cost"]')).toContainText('$');
      await expect(page.locator('[data-testid="labour-cost"]')).toContainText('$');
      await expect(page.locator('[data-testid="equipment-cost"]')).toContainText('$');

      // Verify estimate total updated
      await expect(page.locator('[data-testid="estimate-total"]')).toBeVisible();
    });

    test('should handle multiple item selection', async () => {
      // Open library selector
      await page.click('[data-testid="add-library-items-button"]');

      // Select multiple items
      await page.click('[data-testid="library-item-card-1"]');
      await page.click('[data-testid="library-item-card-2"]');
      await page.click('[data-testid="library-item-card-3"]');

      // Verify selection count
      await expect(page.locator('[data-testid="selected-items-count"]')).toContainText('3');

      // Update quantities for each item
      await page.fill('[data-testid="quantity-input-1"]', '10');
      await page.fill('[data-testid="quantity-input-2"]', '15');
      await page.fill('[data-testid="quantity-input-3"]', '5');

      // Confirm selection
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify all items added
      await expect(page.locator('[data-testid="estimate-items"]')).toHaveCount(3);

      // Verify quantities
      await expect(page.locator('text=10')).toBeVisible();
      await expect(page.locator('text=15')).toBeVisible();
      await expect(page.locator('text=5')).toBeVisible();
    });
  });

  test.describe('Quick Add Functionality', () => {
    test('should quick add new item to library from estimate', async () => {
      // Search for non-existent item
      await page.click('[data-testid="add-library-items-button"]');
      await page.fill('[data-testid="library-search"]', 'non-existent-item');
      
      // Click quick add button
      await page.click('[data-testid="quick-add-button"]');
      await expect(page.locator('[data-testid="quick-add-dialog"]')).toBeVisible();

      // Fill quick add form
      await page.fill('[data-testid="quick-add-name"]', 'Custom Foundation Block');
      await page.fill('[data-testid="quick-add-code"]', 'CFB001');
      await page.fill('[data-testid="quick-add-unit"]', 'each');
      await page.fill('[data-testid="quick-add-material-cost"]', '150');
      await page.fill('[data-testid="quick-add-labour-cost"]', '75');

      // Submit quick add
      await page.click('[data-testid="quick-add-submit"]');

      // Verify item created and selected
      await expect(page.locator('[data-testid="selected-items-count"]')).toContainText('1');
      await expect(page.locator('text=Custom Foundation Block')).toBeVisible();

      // Confirm selection
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify item added to estimate
      await expect(page.locator('[data-testid="estimate-item-CFB001"]')).toBeVisible();
    });
  });

  test.describe('Factor Calculation Integration', () => {
    test('should show detailed cost breakdown for library items', async () => {
      // Add item with complex factors
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-complex-factors"]');
      await page.fill('[data-testid="quantity-input-1"]', '20');
      await page.click('[data-testid="confirm-selection-button"]');

      // Click on item to view details
      await page.click('[data-testid="estimate-item-details-button"]');
      await expect(page.locator('[data-testid="cost-breakdown-dialog"]')).toBeVisible();

      // Verify material factors breakdown
      await expect(page.locator('[data-testid="material-factors-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="material-factor-cement"]')).toBeVisible();
      await expect(page.locator('[data-testid="material-factor-sand"]')).toBeVisible();

      // Verify labour factors breakdown
      await expect(page.locator('[data-testid="labour-factors-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="labour-factor-mason"]')).toBeVisible();

      // Verify equipment factors breakdown
      await expect(page.locator('[data-testid="equipment-factors-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-factor-mixer"]')).toBeVisible();

      // Verify totals
      await expect(page.locator('[data-testid="material-total"]')).toContainText('$');
      await expect(page.locator('[data-testid="labour-total"]')).toContainText('$');
      await expect(page.locator('[data-testid="equipment-total"]')).toContainText('$');
      await expect(page.locator('[data-testid="grand-total"]')).toContainText('$');
    });

    test('should recalculate costs when quantity changes', async () => {
      // Add library item
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-card-1"]');
      await page.fill('[data-testid="quantity-input-1"]', '10');
      await page.click('[data-testid="confirm-selection-button"]');

      // Get initial cost
      const initialCost = await page.locator('[data-testid="item-total-cost"]').textContent();

      // Change quantity in estimate
      await page.click('[data-testid="edit-quantity-button"]');
      await page.fill('[data-testid="estimate-quantity-input"]', '20');
      await page.press('[data-testid="estimate-quantity-input"]', 'Enter');

      // Verify cost updated
      await expect(page.locator('[data-testid="item-total-cost"]')).not.toHaveText(initialCost || '');
      
      // Verify estimate total updated
      await expect(page.locator('[data-testid="estimate-total"]')).toBeVisible();
    });
  });

  test.describe('Schedule Integration', () => {
    test('should generate material schedule from library items', async () => {
      // Add multiple library items with materials
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.click('[data-testid="library-item-steel"]');
      await page.fill('[data-testid="quantity-input-1"]', '50');
      await page.fill('[data-testid="quantity-input-2"]', '1000');
      await page.click('[data-testid="confirm-selection-button"]');

      // Navigate to material schedule
      await page.click('[data-testid="material-schedule-tab"]');
      await expect(page.locator('[data-testid="material-schedule"]')).toBeVisible();

      // Verify material aggregation
      await expect(page.locator('[data-testid="material-cement"]')).toBeVisible();
      await expect(page.locator('[data-testid="material-steel-bars"]')).toBeVisible();
      await expect(page.locator('[data-testid="material-sand"]')).toBeVisible();

      // Verify quantities aggregated correctly
      await expect(page.locator('[data-testid="cement-total-quantity"]')).toContainText('kg');
      await expect(page.locator('[data-testid="steel-bars-total-quantity"]')).toContainText('kg');

      // Verify total costs
      await expect(page.locator('[data-testid="material-schedule-total"]')).toContainText('$');
    });

    test('should generate labour schedule from library items', async () => {
      // Add library items with labour
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-masonry"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.fill('[data-testid="quantity-input-1"]', '100');
      await page.fill('[data-testid="quantity-input-2"]', '25');
      await page.click('[data-testid="confirm-selection-button"]');

      // Navigate to labour schedule
      await page.click('[data-testid="labour-schedule-tab"]');
      await expect(page.locator('[data-testid="labour-schedule"]')).toBeVisible();

      // Verify labour aggregation
      await expect(page.locator('[data-testid="labour-mason"]')).toBeVisible();
      await expect(page.locator('[data-testid="labour-helper"]')).toBeVisible();

      // Verify hours aggregated correctly
      await expect(page.locator('[data-testid="mason-total-hours"]')).toContainText('hours');
      await expect(page.locator('[data-testid="helper-total-hours"]')).toContainText('hours');

      // Verify labour costs
      await expect(page.locator('[data-testid="labour-schedule-total"]')).toContainText('$');
    });

    test('should generate equipment schedule from library items', async () => {
      // Add library items with equipment
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.click('[data-testid="library-item-excavation"]');
      await page.fill('[data-testid="quantity-input-1"]', '30');
      await page.fill('[data-testid="quantity-input-2"]', '100');
      await page.click('[data-testid="confirm-selection-button"]');

      // Navigate to equipment schedule
      await page.click('[data-testid="equipment-schedule-tab"]');
      await expect(page.locator('[data-testid="equipment-schedule"]')).toBeVisible();

      // Verify equipment aggregation
      await expect(page.locator('[data-testid="equipment-mixer"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-excavator"]')).toBeVisible();

      // Verify hours aggregated correctly
      await expect(page.locator('[data-testid="mixer-total-hours"]')).toContainText('hours');
      await expect(page.locator('[data-testid="excavator-total-hours"]')).toContainText('hours');

      // Verify equipment costs
      await expect(page.locator('[data-testid="equipment-schedule-total"]')).toContainText('$');
    });
  });

  test.describe('Rate Management Integration', () => {
    test('should use project-specific rates for calculations', async () => {
      // Set project rates
      await page.click('[data-testid="project-settings-button"]');
      await page.click('[data-testid="rates-tab"]');
      
      // Update material rate
      await page.fill('[data-testid="cement-rate-input"]', '0.20');
      await page.fill('[data-testid="mason-rate-input"]', '45');
      await page.click('[data-testid="save-rates-button"]');

      // Add library item
      await page.click('[data-testid="estimate-tab"]');
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.fill('[data-testid="quantity-input-1"]', '10');
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify rates used in calculation
      await page.click('[data-testid="estimate-item-details-button"]');
      await expect(page.locator('[data-testid="cement-rate"]')).toContainText('$0.20');
      await expect(page.locator('[data-testid="mason-rate"]')).toContainText('$45.00');
    });

    test('should show rate history and changes', async () => {
      // Navigate to rates history
      await page.click('[data-testid="project-settings-button"]');
      await page.click('[data-testid="rates-tab"]');
      await page.click('[data-testid="rates-history-button"]');

      // Verify rate history display
      await expect(page.locator('[data-testid="rates-history-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-change-entry"]').first()).toBeVisible();

      // Verify rate change details
      await expect(page.locator('[data-testid="rate-change-date"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="rate-change-user"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="rate-old-value"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="rate-new-value"]').first()).toBeVisible();
    });
  });

  test.describe('Export and Reporting', () => {
    test('should export estimate with library item details', async () => {
      // Add library items to estimate
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.click('[data-testid="library-item-steel"]');
      await page.fill('[data-testid="quantity-input-1"]', '25');
      await page.fill('[data-testid="quantity-input-2"]', '500');
      await page.click('[data-testid="confirm-selection-button"]');

      // Export estimate
      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="export-excel"]');

      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-button"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('estimate');
      expect(download.suggestedFilename()).toContain('.xlsx');
    });

    test('should generate detailed cost report', async () => {
      // Add library items
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.fill('[data-testid="quantity-input-1"]', '50');
      await page.click('[data-testid="confirm-selection-button"]');

      // Generate report
      await page.click('[data-testid="reports-button"]');
      await page.click('[data-testid="detailed-cost-report"]');

      // Verify report content
      await expect(page.locator('[data-testid="cost-report-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="material-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="labour-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="equipment-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-summary"]')).toBeVisible();

      // Export report
      await page.click('[data-testid="export-report-button"]');
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('cost-report');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle missing factor data gracefully', async () => {
      // Add library item with missing factors
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-incomplete"]');
      await page.fill('[data-testid="quantity-input-1"]', '10');
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify warning about missing factors
      await expect(page.locator('[data-testid="missing-factors-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="missing-factors-message"]')).toContainText('Some cost factors are missing');

      // Verify calculation still works with available data
      await expect(page.locator('[data-testid="item-total-cost"]')).toBeVisible();
    });

    test('should handle rate calculation errors', async () => {
      // Mock rate service error
      await page.route('**/api/projects/*/rates', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Rate service unavailable' })
        });
      });

      // Try to add library item
      await page.click('[data-testid="add-library-items-button"]');
      await page.click('[data-testid="library-item-concrete"]');
      await page.fill('[data-testid="quantity-input-1"]', '10');
      await page.click('[data-testid="confirm-selection-button"]');

      // Verify error handling
      await expect(page.locator('[data-testid="rate-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-calculation"]')).toBeVisible();
    });
  });

  test.describe('Performance Tests', () => {
    test('should handle large estimates efficiently', async () => {
      // Add many library items
      await page.click('[data-testid="add-library-items-button"]');
      
      // Select 20 items
      for (let i = 1; i <= 20; i++) {
        await page.click(`[data-testid="library-item-card-${i}"]`);
      }
      
      // Set quantities
      for (let i = 1; i <= 20; i++) {
        await page.fill(`[data-testid="quantity-input-${i}"]`, '10');
      }

      // Measure performance
      const startTime = Date.now();
      await page.click('[data-testid="confirm-selection-button"]');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Verify reasonable performance (under 5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Verify all items added
      await expect(page.locator('[data-testid="estimate-items"]')).toHaveCount(20);
    });
  });
});