/**
 * Advanced Library Components Test Suite
 * Phase 5: Testing Infrastructure
 * 
 * This file exports all component tests for easy test running and organization
 */

// Core Advanced UI Components
export * from './SpreadsheetFactorEditor.test';
export * from './BulkOperationsPanel.test';
export * from './AdvancedLibrarySelector.test';
export * from './MobileLibraryInterface.test';

/**
 * Test Coverage Summary for Advanced Library Components:
 * 
 * 1. SpreadsheetFactorEditor
 *    - Component rendering with all essential elements
 *    - Tab navigation between Materials, Labor, and Equipment
 *    - Search functionality and filtering
 *    - Cell editing with keyboard navigation
 *    - Undo/Redo functionality
 *    - Value formatting (currency, percentages)
 *    - Save functionality
 *    - Performance with large datasets
 *    - Error handling for invalid inputs
 *    - Accessibility features
 * 
 * 2. BulkOperationsPanel
 *    - Selection management (Select All, Clear)
 *    - Operation configuration for all 8 operation types
 *    - Preview functionality with change visualization
 *    - Operation execution with progress tracking
 *    - Specific operation logic (Status Update, Price Adjustment, Clone, etc.)
 *    - Error handling and failure reporting
 *    - Performance with large selections
 *    - Accessibility features
 * 
 * 3. AdvancedLibrarySelector
 *    - Dialog opening/closing interactions
 *    - Advanced filtering (search, assembly, type, status)
 *    - Sorting by multiple criteria
 *    - Item selection with quantity and notes
 *    - Quick Add functionality for new items
 *    - Selection summary and confirmation
 *    - Pre-selected items handling
 *    - Performance with large item lists
 *    - Accessibility features
 * 
 * 4. MobileLibraryInterface
 *    - Mobile-optimized rendering
 *    - Search and filtering on mobile
 *    - View mode toggle (cards vs list)
 *    - Touch-friendly interactions
 *    - Bulk selection mode
 *    - Item detail drawer
 *    - Cost display and usage indicators
 *    - Performance with large datasets
 *    - Mobile accessibility features
 * 
 * Key Testing Patterns Used:
 * - Comprehensive component rendering tests
 * - User interaction simulation with userEvent
 * - Performance benchmarking for large datasets
 * - Error boundary and edge case handling
 * - Accessibility testing with ARIA attributes
 * - Mock function verification for callbacks
 * - Custom render utilities for provider wrapping
 * - Realistic test data generation with factories
 */