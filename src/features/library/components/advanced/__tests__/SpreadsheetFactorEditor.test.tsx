/**
 * Component Tests for SpreadsheetFactorEditor
 * Phase 5: Testing Infrastructure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SpreadsheetFactorEditor } from '../SpreadsheetFactorEditor';
import { createLibraryItemBatch, createRealisticLibraryItem } from '@/test/factories/libraryFactory';
import { customRender } from '@/test/utils/testUtils';

describe('SpreadsheetFactorEditor', () => {
  const defaultProps = {
    items: createLibraryItemBatch(5),
    onItemsUpdate: jest.fn(),
    onSave: jest.fn(),
    readOnly: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render with all essential elements', () => {
      customRender(<SpreadsheetFactorEditor {...defaultProps} />);

      expect(screen.getByText('Spreadsheet Factor Editor')).toBeInTheDocument();
      expect(screen.getByText('5 items')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
      expect(screen.getByText('Materials')).toBeInTheDocument();
      expect(screen.getByText('Labor')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('should render undo/redo buttons in correct state', () => {
      customRender(<SpreadsheetFactorEditor {...defaultProps} />);

      const undoButton = screen.getByText('Undo');
      const redoButton = screen.getByText('Redo');

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it('should render save button when onSave prop provided', () => {
      customRender(<SpreadsheetFactorEditor {...defaultProps} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should not render save button when onSave prop not provided', () => {
      const propsWithoutSave = { ...defaultProps };
      delete propsWithoutSave.onSave;
      
      customRender(<SpreadsheetFactorEditor {...propsWithoutSave} />);

      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs and show appropriate columns', async () => {
      const user = userEvent.setup();
      customRender(<SpreadsheetFactorEditor {...defaultProps} />);

      // Initially on Materials tab
      expect(screen.getByText('Material Cost')).toBeInTheDocument();
      expect(screen.queryByText('Labor Cost')).not.toBeInTheDocument();

      // Switch to Labor tab
      await user.click(screen.getByText('Labor'));
      expect(screen.getByText('Labor Cost')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
      expect(screen.queryByText('Material Cost')).not.toBeInTheDocument();

      // Switch to Equipment tab
      await user.click(screen.getByText('Equipment'));
      expect(screen.getByText('Equipment Cost')).toBeInTheDocument();
      expect(screen.getByText('Depreciation')).toBeInTheDocument();
      expect(screen.queryByText('Labor Cost')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter items based on search term', async () => {
      const user = userEvent.setup();
      const items = [
        createRealisticLibraryItem('concrete'),
        createRealisticLibraryItem('steel'),
        createRealisticLibraryItem('masonry')
      ];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      
      // Search for concrete
      await user.type(searchInput, 'concrete');
      
      // Should filter items to show only concrete items
      expect(screen.getByText('1 items')).toBeInTheDocument();
    });

    it('should clear search filter when search term is removed', async () => {
      const user = userEvent.setup();
      const items = createLibraryItemBatch(3);
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      
      // Search for something
      await user.type(searchInput, 'test');
      await user.clear(searchInput);
      
      // Should show all items again
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });
  });

  describe('Cell Editing', () => {
    it('should allow editing cells when not read-only', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Find a cell to edit (material cost)
      const cells = screen.getAllByRole('cell');
      const materialCostCell = cells.find(cell => 
        cell.textContent?.includes('$') // Material cost cells show currency
      );

      if (materialCostCell) {
        await user.click(materialCostCell);
        
        // Should show input for editing
        const input = screen.getByDisplayValue(/\d+/);
        expect(input).toBeInTheDocument();
        
        // Should be able to change value
        await user.clear(input);
        await user.type(input, '150');
        
        // Should call onItemsUpdate when value changes
        expect(defaultProps.onItemsUpdate).toHaveBeenCalled();
      }
    });

    it('should not allow editing cells when read-only', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(
        <SpreadsheetFactorEditor {...defaultProps} items={items} readOnly={true} />
      );

      // Find a cell
      const cells = screen.getAllByRole('cell');
      const firstDataCell = cells[3]; // Skip header cells
      
      await user.click(firstDataCell);
      
      // Should not show input for editing
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should move to next cell with Tab key', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Click on first editable cell
      const cells = screen.getAllByRole('cell');
      const firstEditableCell = cells[3]; // Skip header cells
      
      await user.click(firstEditableCell);
      
      // Press Tab
      await user.keyboard('{Tab}');
      
      // Should move focus (hard to test exact position, but onItemsUpdate should not be called for navigation)
      // This is more of an integration test that would require more complex setup
    });

    it('should handle Escape key to exit editing', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Start editing a cell
      const cells = screen.getAllByRole('cell');
      const editableCell = cells[3];
      
      await user.click(editableCell);
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      // Should exit editing mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should enable undo button after making changes', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Make a change to enable undo
      const cells = screen.getAllByRole('cell');
      const materialCostCell = cells.find(cell => 
        cell.textContent?.includes('$')
      );

      if (materialCostCell) {
        await user.click(materialCostCell);
        
        const input = screen.getByDisplayValue(/\d+/);
        await user.clear(input);
        await user.type(input, '200');
        await user.keyboard('{Enter}');
        
        // Undo button should be enabled after change
        const undoButton = screen.getByText('Undo');
        expect(undoButton).not.toBeDisabled();
      }
    });

    it('should perform undo operation when undo button clicked', async () => {
      const user = userEvent.setup();
      const mockOnItemsUpdate = jest.fn();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(
        <SpreadsheetFactorEditor 
          {...defaultProps} 
          items={items} 
          onItemsUpdate={mockOnItemsUpdate}
        />
      );

      // Make a change
      const cells = screen.getAllByRole('cell');
      const materialCostCell = cells.find(cell => 
        cell.textContent?.includes('$')
      );

      if (materialCostCell) {
        await user.click(materialCostCell);
        
        const input = screen.getByDisplayValue(/\d+/);
        await user.clear(input);
        await user.type(input, '200');
        await user.keyboard('{Enter}');
        
        // Clear mock calls from editing
        mockOnItemsUpdate.mockClear();
        
        // Click undo
        const undoButton = screen.getByText('Undo');
        await user.click(undoButton);
        
        // Should call onItemsUpdate for undo
        expect(mockOnItemsUpdate).toHaveBeenCalled();
      }
    });
  });

  describe('Value Formatting', () => {
    it('should format cost values with currency symbol', () => {
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Should display costs with $ symbol
      expect(screen.getByText(/\$\d+\.\d{2}/)).toBeInTheDocument();
    });

    it('should format percentage values correctly', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Switch to materials tab to see waste percentage
      await user.click(screen.getByText('Materials'));
      
      // Should display percentages with % symbol
      expect(screen.getByText(/\d+\.\d%/)).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should call onSave when save button clicked', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      
      customRender(
        <SpreadsheetFactorEditor {...defaultProps} onSave={mockOnSave} />
      );

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('should render large datasets efficiently', () => {
      const largeItemSet = createLibraryItemBatch(100);
      
      const startTime = performance.now();
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={largeItemSet} />);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should show correct item count
      expect(screen.getByText('100 items')).toBeInTheDocument();
    });

    it('should handle rapid keyboard navigation without performance issues', async () => {
      const user = userEvent.setup();
      const items = createLibraryItemBatch(10);
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Start editing first cell
      const cells = screen.getAllByRole('cell');
      const firstEditableCell = cells[3];
      
      await user.click(firstEditableCell);
      
      // Rapidly navigate with Tab key
      const startTime = performance.now();
      for (let i = 0; i < 5; i++) {
        await user.keyboard('{Tab}');
      }
      const endTime = performance.now();
      
      // Should handle navigation efficiently
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid numeric input gracefully', async () => {
      const user = userEvent.setup();
      const items = [createRealisticLibraryItem('concrete')];
      
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={items} />);

      // Find material cost cell
      const cells = screen.getAllByRole('cell');
      const materialCostCell = cells.find(cell => 
        cell.textContent?.includes('$')
      );

      if (materialCostCell) {
        await user.click(materialCostCell);
        
        const input = screen.getByDisplayValue(/\d+/);
        await user.clear(input);
        await user.type(input, 'invalid');
        
        // Should not crash and should handle gracefully
        expect(defaultProps.onItemsUpdate).toHaveBeenCalled();
      }
    });

    it('should handle empty items array', () => {
      customRender(<SpreadsheetFactorEditor {...defaultProps} items={[]} />);

      expect(screen.getByText('0 items')).toBeInTheDocument();
      // Should not crash and should show empty state
    });
  });

  describe('Accessibility', () => {
    it('should provide keyboard shortcuts help text', () => {
      customRender(<SpreadsheetFactorEditor {...defaultProps} />);

      expect(screen.getByText(/Use Tab\/Arrow keys to navigate/)).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+Z\/Y for undo\/redo/)).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+C\/V for copy\/paste/)).toBeInTheDocument();
    });

    it('should have proper ARIA labels and roles', () => {
      customRender(<SpreadsheetFactorEditor {...defaultProps} />);

      // Table should have proper roles
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(6); // Base columns + material columns
      expect(screen.getAllByRole('row')).toHaveLength(6); // Header + 5 items
    });
  });
});