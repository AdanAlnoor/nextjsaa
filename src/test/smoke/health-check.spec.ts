/**
 * Smoke Tests for Production Health Checks
 * Phase 6: Production Deployment
 */

import { test, expect } from '@playwright/test';

test.describe('Production Health Checks', () => {
  test('should have healthy main health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.services.database).toBe('operational');
    expect(health.services.application).toBe('operational');
    expect(health.timestamp).toBeDefined();
  });

  test('should have healthy database endpoint', async ({ request }) => {
    const response = await request.get('/api/health/db');
    
    expect(response.status()).toBe(200);
    
    const dbHealth = await response.json();
    expect(dbHealth.status).toMatch(/healthy|degraded/);
    expect(dbHealth.database).toBe('operational');
    expect(dbHealth.responseTime).toBeLessThan(5000); // 5 second timeout
  });

  test('should have healthy cache endpoint', async ({ request }) => {
    const response = await request.get('/api/health/cache');
    
    expect(response.status()).toBe(200);
    
    const cacheHealth = await response.json();
    expect(cacheHealth.status).toBe('healthy');
    expect(cacheHealth.cache).toBe('operational');
  });

  test('should load main application page', async ({ page }) => {
    await page.goto('/');
    
    // Should not have any obvious error indicators
    await expect(page.locator('body')).not.toContainText('Application Error');
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('502');
    await expect(page.locator('body')).not.toContainText('503');
    
    // Page should load within reasonable time
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('should load library page without errors', async ({ page }) => {
    await page.goto('/admin/library');
    
    // Should not show error states
    await expect(page.locator('body')).not.toContainText('Failed to load');
    await expect(page.locator('body')).not.toContainText('Network Error');
    
    // Should show some library content or loading state
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('should respond to API requests', async ({ request }) => {
    // Test a basic API endpoint
    const response = await request.get('/api/library/items?limit=1');
    
    // Should not return server errors
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
    
    // Should be either successful or auth-related (401/403)
    expect([200, 401, 403]).toContain(response.status());
  });
});