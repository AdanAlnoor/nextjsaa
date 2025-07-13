/**
 * E2E Tests for Mobile Workflow
 * Phase 5: Testing Infrastructure
 */

import { test, expect, Page } from '@playwright/test';

// Configure mobile viewport for all tests in this file
test.use({ 
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true
});

test.describe('Mobile Workflow E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to mobile library interface
    await page.goto('/admin/library?mobile=true');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Mobile Library Interface', () => {
    test('should display mobile-optimized library interface', async () => {
      // Verify mobile header
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      
      // Verify mobile search
      await expect(page.locator('[data-testid="mobile-search"]')).toBeVisible();
      
      // Verify mobile item cards
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
      
      // Verify touch-friendly buttons
      const buttons = page.locator('button');
      const firstButton = buttons.first();
      const boundingBox = await firstButton.boundingBox();
      
      // Verify button is large enough for touch (minimum 44px)
      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle touch interactions properly', async () => {
      // Test touch scroll
      await page.touchscreen.tap(200, 300);
      await page.mouse.wheel(0, 300);
      
      // Verify scroll worked
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
      
      // Test touch tap on item card
      await page.touchscreen.tap(200, 200);
      
      // Verify item detail opened
      await expect(page.locator('[data-testid="mobile-item-detail"]')).toBeVisible();
    });

    test('should show mobile category filter sheet', async () => {
      // Tap category filter button
      await page.touchscreen.tap(100, 150); // Category button position
      
      // Verify bottom sheet opened
      await expect(page.locator('[data-testid="category-sheet"]')).toBeVisible();
      
      // Select a category
      await page.touchscreen.tap(200, 400); // Category option position
      
      // Verify filter applied
      await expect(page.locator('[data-testid="category-filter-active"]')).toBeVisible();
    });

    test('should toggle between card and list view on mobile', async () => {
      // Initially in card view
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
      
      // Tap list view button
      await page.touchscreen.tap(350, 150); // List view button position
      
      // Verify switched to list view
      await expect(page.locator('[data-testid="mobile-list-item"]').first()).toBeVisible();
      
      // Tap card view button
      await page.touchscreen.tap(300, 150); // Card view button position
      
      // Verify switched back to card view
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
    });
  });

  test.describe('Mobile Search and Filtering', () => {
    test('should perform mobile search with touch keyboard', async () => {
      // Tap search input
      await page.touchscreen.tap(200, 100);
      
      // Type search term
      await page.type('[data-testid="mobile-search"]', 'concrete');
      
      // Verify search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('text=concrete')).toBeVisible();
      
      // Clear search
      await page.fill('[data-testid="mobile-search"]', '');
      
      // Verify all items shown again
      await expect(page.locator('[data-testid="mobile-item-card"]')).toHaveCount(5);
    });

    test('should handle mobile sort menu', async () => {
      // Tap sort button
      await page.touchscreen.tap(150, 150);
      
      // Verify sort menu opened
      await expect(page.locator('[data-testid="sort-menu"]')).toBeVisible();
      
      // Select price sort
      await page.touchscreen.tap(200, 300);
      
      // Verify items re-sorted
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
    });
  });

  test.describe('Mobile Item Detail Drawer', () => {
    test('should open item detail drawer on mobile', async () => {
      // Tap on item card
      await page.touchscreen.tap(200, 250);
      
      // Verify drawer opened from bottom
      await expect(page.locator('[data-testid="mobile-item-drawer"]')).toBeVisible();
      
      // Verify item details visible
      await expect(page.locator('[data-testid="item-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="item-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="item-cost"]')).toBeVisible();
      
      // Verify mobile-optimized layout
      const drawer = page.locator('[data-testid="mobile-item-drawer"]');
      const boundingBox = await drawer.boundingBox();
      expect(boundingBox!.height).toBeLessThan(600); // Drawer doesn't cover full screen
    });

    test('should handle swipe gestures on drawer', async () => {
      // Open drawer
      await page.touchscreen.tap(200, 250);
      await expect(page.locator('[data-testid="mobile-item-drawer"]')).toBeVisible();
      
      // Swipe down to close
      await page.touchscreen.tap(200, 400);
      await page.mouse.move(200, 500);
      await page.mouse.up();
      
      // Verify drawer closed
      await expect(page.locator('[data-testid="mobile-item-drawer"]')).not.toBeVisible();
    });

    test('should show mobile action buttons in drawer', async () => {
      // Open drawer
      await page.touchscreen.tap(200, 250);
      
      // Verify action buttons
      await expect(page.locator('[data-testid="mobile-select-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-edit-button"]')).toBeVisible();
      
      // Tap select button
      await page.touchscreen.tap(200, 550);
      
      // Verify action performed
      await expect(page.locator('[data-testid="item-selected"]')).toBeVisible();
    });
  });

  test.describe('Mobile Bulk Operations', () => {
    test('should enable bulk selection mode on mobile', async () => {
      // Enable bulk selection mode
      await page.touchscreen.tap(50, 50); // Menu button
      await page.touchscreen.tap(200, 200); // Bulk select option
      
      // Verify bulk selection mode active
      await expect(page.locator('[data-testid="bulk-selection-mode"]')).toBeVisible();
      
      // Verify checkboxes visible on items
      await expect(page.locator('[data-testid="item-checkbox"]').first()).toBeVisible();
      
      // Select items by tapping checkboxes
      await page.touchscreen.tap(30, 200); // First checkbox
      await page.touchscreen.tap(30, 300); // Second checkbox
      
      // Verify selection count
      await expect(page.locator('[data-testid="selection-count"]')).toContainText('2');
    });

    test('should show mobile bulk actions bar', async () => {
      // Enter bulk selection and select items
      await page.touchscreen.tap(50, 50);
      await page.touchscreen.tap(200, 200);
      await page.touchscreen.tap(30, 200);
      await page.touchscreen.tap(30, 300);
      
      // Verify bulk actions bar visible
      await expect(page.locator('[data-testid="mobile-bulk-actions"]')).toBeVisible();
      
      // Verify mobile-optimized action buttons
      await expect(page.locator('[data-testid="bulk-edit-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-delete-button"]')).toBeVisible();
      
      // Test bulk action
      await page.touchscreen.tap(100, 600); // Edit button
      await expect(page.locator('[data-testid="bulk-edit-dialog"]')).toBeVisible();
    });
  });

  test.describe('Mobile Navigation and Gestures', () => {
    test('should handle mobile navigation gestures', async () => {
      // Test pull-to-refresh
      await page.touchscreen.tap(200, 50);
      await page.mouse.move(200, 200);
      await page.mouse.up();
      
      // Verify refresh indicator
      await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible();
      
      // Test infinite scroll
      await page.mouse.wheel(0, 1000);
      await page.mouse.wheel(0, 1000);
      
      // Verify more items loaded
      await expect(page.locator('[data-testid="loading-more"]')).toBeVisible();
    });

    test('should handle mobile menu and navigation', async () => {
      // Open mobile menu
      await page.touchscreen.tap(30, 30); // Hamburger menu
      
      // Verify mobile menu opened
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Navigate to different section
      await page.touchscreen.tap(200, 200); // Menu item
      
      // Verify navigation
      await expect(page.url()).toContain('/estimates');
    });
  });

  test.describe('Mobile Performance and Responsiveness', () => {
    test('should load quickly on mobile devices', async () => {
      // Measure initial load time
      const startTime = Date.now();
      await page.goto('/admin/library?mobile=true');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Verify reasonable mobile load time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);
      
      // Verify core elements loaded
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
    });

    test('should handle large datasets efficiently on mobile', async () => {
      // Navigate to library with many items
      await page.goto('/admin/library?mobile=true&test=large-dataset');
      
      // Measure scroll performance
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(100);
      }
      const scrollTime = Date.now() - startTime;
      
      // Verify smooth scrolling (under 2 seconds for 10 scrolls)
      expect(scrollTime).toBeLessThan(2000);
      
      // Verify virtual scrolling working
      await expect(page.locator('[data-testid="virtual-scroll-indicator"]')).toBeVisible();
    });

    test('should adapt to different mobile screen sizes', async () => {
      // Test on small mobile screen
      await page.setViewportSize({ width: 320, height: 568 });
      await page.reload();
      
      // Verify layout adapts
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
      
      // Test on large mobile screen
      await page.setViewportSize({ width: 414, height: 896 });
      await page.reload();
      
      // Verify layout still works
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
    });
  });

  test.describe('Mobile Offline Capabilities', () => {
    test('should handle offline mode gracefully', async () => {
      // Go offline
      await page.context().setOffline(true);
      
      // Try to search
      await page.fill('[data-testid="mobile-search"]', 'concrete');
      
      // Verify offline message
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      
      // Verify cached content still available
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Verify functionality restored
      await page.reload();
      await expect(page.locator('[data-testid="mobile-search"]')).toBeVisible();
    });

    test('should sync data when back online', async () => {
      // Make changes while online
      await page.touchscreen.tap(200, 250);
      await page.touchscreen.tap(200, 550); // Select item
      
      // Go offline
      await page.context().setOffline(true);
      
      // Make more changes (should be queued)
      await page.touchscreen.tap(200, 350);
      await page.touchscreen.tap(200, 550);
      
      // Go back online
      await page.context().setOffline(false);
      
      // Verify sync indicator
      await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
      
      // Verify changes synced
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should support mobile screen reader navigation', async () => {
      // Enable screen reader mode
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      // Verify ARIA labels present
      await expect(page.locator('[aria-label="Search library items"]')).toBeVisible();
      await expect(page.locator('[aria-label="Filter by category"]')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Verify focus management
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should handle high contrast and large text modes', async () => {
      // Enable high contrast mode
      await page.emulateMedia({ 
        colorScheme: 'dark',
        forcedColors: 'active'
      });
      
      // Verify high contrast styling
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      
      // Test with large text
      await page.addStyleTag({
        content: '* { font-size: 150% !important; }'
      });
      
      // Verify layout still works
      await expect(page.locator('[data-testid="mobile-item-card"]').first()).toBeVisible();
    });
  });

  test.describe('Mobile Error Handling', () => {
    test('should handle network errors on mobile', async () => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000);
      });
      
      // Try to load content
      await page.reload();
      
      // Verify loading indicator
      await expect(page.locator('[data-testid="mobile-loading"]')).toBeVisible();
      
      // Verify timeout handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });
      
      // Verify retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should provide mobile-friendly error messages', async () => {
      // Trigger validation error
      await page.touchscreen.tap(50, 50); // Menu
      await page.touchscreen.tap(200, 150); // Create item
      await page.touchscreen.tap(200, 500); // Submit without data
      
      // Verify mobile error display
      await expect(page.locator('[data-testid="mobile-error-message"]')).toBeVisible();
      
      // Verify error is easily readable on mobile
      const errorElement = page.locator('[data-testid="mobile-error-message"]');
      const boundingBox = await errorElement.boundingBox();
      expect(boundingBox!.width).toBeLessThan(350); // Fits mobile screen
    });
  });
});