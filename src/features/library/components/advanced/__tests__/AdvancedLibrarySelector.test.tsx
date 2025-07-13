/**
 * Component Tests for AdvancedLibrarySelector
 * Phase 5: Testing Infrastructure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AdvancedLibrarySelector } from '../AdvancedLibrarySelector';
import { createLibraryItemBatch, createLibraryItem } from '@/test/factories/libraryFactory';
import { customRender } from '@/test/utils/testUtils';

describe('AdvancedLibrarySelector', () => {
  const defaultProps = {
    elementName: 'Foundation Work',
    elementId: 'element-123',
    onItemsSelected: jest.fn(),
    availableItems: createLibraryItemBatch(10),
    preSelectedItems: [],
    showQuickAdd: true,
    maxSelections: undefined
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render trigger button with element name', () => {
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      expect(screen.getByText('Add Library Items to Foundation Work')).toBeInTheDocument();
    });

    it('should render trigger button without element name when not provided', () => {
      const propsWithoutElement = { ...defaultProps };
      delete propsWithoutElement.elementName;
      
      customRender(<AdvancedLibrarySelector {...propsWithoutElement} />);

      expect(screen.getByText('📚 Add Library Items')).toBeInTheDocument();
    });

    it('should not render dialog initially', () => {
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      expect(screen.queryByText('Select Library Items')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Opening and Closing', () => {
    it('should open dialog when trigger button clicked', async () => {
      const user = userEvent.setup();
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      expect(screen.getByText('Select Library Items for Foundation Work')).toBeInTheDocument();
    });

    it('should close dialog when cancel button clicked', async () => {
      const user = userEvent.setup();
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      // Open dialog
      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Close dialog
      await user.click(screen.getByText('Cancel'));

      expect(screen.queryByText('Select Library Items')).not.toBeInTheDocument();
    });
  });

  describe('Item Filtering and Search', () => {
    it('should filter items by search term', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Concrete Block', code: 'CON001' }),
        createLibraryItem({ name: 'Steel Beam', code: 'STL001' }),
        createLibraryItem({ name: 'Concrete Pipe', code: 'CON002' })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      const searchInput = screen.getByPlaceholderText('Search by name, code, or description...');
      await user.type(searchInput, 'concrete');

      // Should show only concrete items
      expect(screen.getByText('Concrete Block')).toBeInTheDocument();
      expect(screen.getByText('Concrete Pipe')).toBeInTheDocument();
      expect(screen.queryByText('Steel Beam')).not.toBeInTheDocument();
    });

    it('should filter by assembly', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Item 1', assembly: 'concrete' }),
        createLibraryItem({ name: 'Item 2', assembly: 'steel' })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Filter by concrete assembly
      const assemblySelect = screen.getAllByRole('combobox')[1]; // Second select is assembly
      await user.click(assemblySelect);
      await user.click(screen.getByText('Concrete Work'));

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should filter by item type', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Material Item', type: 'material' }),
        createLibraryItem({ name: 'Labor Item', type: 'labor' })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Filter by materials
      const typeSelect = screen.getAllByRole('combobox')[2]; // Third select is type
      await user.click(typeSelect);
      await user.click(screen.getByText('Materials'));

      expect(screen.getByText('Material Item')).toBeInTheDocument();
      expect(screen.queryByText('Labor Item')).not.toBeInTheDocument();
    });

    it('should filter by status', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Draft Item', status: 'draft' }),
        createLibraryItem({ name: 'Confirmed Item', status: 'confirmed' })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Filter by confirmed status
      const statusSelect = screen.getAllByRole('combobox')[3]; // Fourth select is status
      await user.click(statusSelect);
      await user.click(screen.getByText('Confirmed'));

      expect(screen.getByText('Confirmed Item')).toBeInTheDocument();
      expect(screen.queryByText('Draft Item')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort items by name by default', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Zebra Item' }),
        createLibraryItem({ name: 'Alpha Item' }),
        createLibraryItem({ name: 'Beta Item' })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      const itemCards = screen.getAllByText(/Item$/);
      expect(itemCards[0]).toHaveTextContent('Alpha Item');
      expect(itemCards[1]).toHaveTextContent('Beta Item');
      expect(itemCards[2]).toHaveTextContent('Zebra Item');
    });

    it('should sort items by price when selected', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Expensive Item', material_cost: 1000 }),
        createLibraryItem({ name: 'Cheap Item', material_cost: 100 }),
        createLibraryItem({ name: 'Medium Item', material_cost: 500 })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Change sort to price
      const sortSelect = screen.getAllByRole('combobox')[0]; // First select is sort
      await user.click(sortSelect);
      await user.click(screen.getByText('Price'));

      const itemCards = screen.getAllByText(/Item$/);
      expect(itemCards[0]).toHaveTextContent('Cheap Item');
      expect(itemCards[1]).toHaveTextContent('Medium Item');
      expect(itemCards[2]).toHaveTextContent('Expensive Item');
    });
  });

  describe('Item Selection', () => {
    it('should select item when clicked', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Click on item
      await user.click(screen.getByText('Test Item'));

      // Should show in selected items panel
      expect(screen.getByText('Selected Items (1)')).toBeInTheDocument();
    });

    it('should deselect item when clicked again', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Select item
      await user.click(screen.getByText('Test Item'));
      
      // Deselect item
      await user.click(screen.getByText('Test Item'));

      expect(screen.getByText('Selected Items (0)')).toBeInTheDocument();
    });

    it('should respect max selections limit', async () => {
      const user = userEvent.setup();
      const items = createLibraryItemBatch(3);
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} maxSelections={2} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Select first two items
      const itemCards = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Item')
      );
      
      await user.click(itemCards[0]);
      await user.click(itemCards[1]);
      
      // Should have 2 selected
      expect(screen.getByText('Selected Items (2)')).toBeInTheDocument();
      
      // Try to select third item - should not work
      await user.click(itemCards[2]);
      
      // Should still have only 2 selected
      expect(screen.getByText('Selected Items (2)')).toBeInTheDocument();
    });
  });

  describe('Selected Items Management', () => {
    it('should update quantity for selected item', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText('Test Item'));
      
      // Find quantity input and update it
      const quantityInput = screen.getByDisplayValue('1');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('should add notes to selected item', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText('Test Item'));
      
      // Add notes
      const notesInput = screen.getByPlaceholderText('Notes (optional)');
      await user.type(notesInput, 'Special installation required');

      expect(screen.getByDisplayValue('Special installation required')).toBeInTheDocument();
    });

    it('should remove item from selection', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText('Test Item'));
      
      // Remove item using × button
      const removeButton = screen.getByText('×');
      await user.click(removeButton);

      expect(screen.getByText('Selected Items (0)')).toBeInTheDocument();
      expect(screen.getByText('No items selected')).toBeInTheDocument();
    });
  });

  describe('Quick Add Functionality', () => {
    it('should show quick add button when enabled', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} showQuickAdd={true} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      expect(screen.getByText(/Can't find what you need\? Quick Add to Library/)).toBeInTheDocument();
    });

    it('should not show quick add button when disabled', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} showQuickAdd={false} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      expect(screen.queryByText(/Can't find what you need\?/)).not.toBeInTheDocument();
    });

    it('should open quick add dialog when button clicked', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText(/Can't find what you need\?/));

      expect(screen.getByText('Quick Add to Library')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Item code')).toBeInTheDocument();
    });

    it('should create and select new item from quick add', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText(/Can't find what you need\?/));
      
      // Fill out quick add form
      await user.type(screen.getByPlaceholderText('Item name'), 'New Test Item');
      await user.type(screen.getByPlaceholderText('Item code'), 'NEW001');
      await user.type(screen.getByPlaceholderText('Unit (e.g., m³, kg, each)'), 'each');
      await user.type(screen.getByPlaceholderText('Material cost'), '100');
      
      // Submit quick add
      await user.click(screen.getByText('Add to Library & Select'));

      // Should close quick add dialog and show item in selection
      expect(screen.queryByText('Quick Add to Library')).not.toBeInTheDocument();
      expect(screen.getByText('Selected Items (1)')).toBeInTheDocument();
    });

    it('should require name and code for quick add', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText(/Can't find what you need\?/));
      
      // Submit button should be disabled without required fields
      const submitButton = screen.getByText('Add to Library & Select');
      expect(submitButton).toBeDisabled();
      
      // Add name only
      await user.type(screen.getByPlaceholderText('Item name'), 'New Item');
      expect(submitButton).toBeDisabled();
      
      // Add code
      await user.type(screen.getByPlaceholderText('Item code'), 'NEW001');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Selection Summary and Confirmation', () => {
    it('should show correct selection summary', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ 
          name: 'Item 1', 
          material_cost: 100,
          labor_cost: 50 
        }),
        createLibraryItem({ 
          name: 'Item 2', 
          material_cost: 200,
          equipment_cost: 75 
        })
      ];
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={items} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      // Select both items
      await user.click(screen.getByText('Item 1'));
      await user.click(screen.getByText('Item 2'));
      
      // Update quantity for first item
      const quantityInputs = screen.getAllByDisplayValue('1');
      await user.clear(quantityInputs[0]);
      await user.type(quantityInputs[0], '2');

      // Should show correct totals
      expect(screen.getByText('Total Items:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Total Quantity:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // 2 + 1
      expect(screen.getByText('Total Value:')).toBeInTheDocument();
    });

    it('should call onItemsSelected with correct data when confirmed', async () => {
      const user = userEvent.setup();
      const mockOnItemsSelected = jest.fn();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector 
          {...defaultProps} 
          availableItems={items}
          onItemsSelected={mockOnItemsSelected}
        />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText('Test Item'));
      
      // Update quantity and notes
      const quantityInput = screen.getByDisplayValue('1');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');
      
      const notesInput = screen.getByPlaceholderText('Notes (optional)');
      await user.type(notesInput, 'Test notes');
      
      // Confirm selection
      await user.click(screen.getByText('Add 1 Items to Estimate'));

      expect(mockOnItemsSelected).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'Test Item',
          quantity: 3,
          notes: 'Test notes'
        })
      ]);
    });

    it('should filter out items with zero quantity when confirming', async () => {
      const user = userEvent.setup();
      const mockOnItemsSelected = jest.fn();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <AdvancedLibrarySelector 
          {...defaultProps} 
          availableItems={items}
          onItemsSelected={mockOnItemsSelected}
        />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      await user.click(screen.getByText('Test Item'));
      
      // Set quantity to 0
      const quantityInput = screen.getByDisplayValue('1');
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');
      
      // Confirm selection
      await user.click(screen.getByText('Add 1 Items to Estimate'));

      expect(mockOnItemsSelected).toHaveBeenCalledWith([]);
    });

    it('should disable confirm button when no items selected', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      const confirmButton = screen.getByText('Add 0 Items to Estimate');
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Pre-selected Items', () => {
    it('should show pre-selected items in selection panel', async () => {
      const user = userEvent.setup();
      const preSelectedItems = [
        { 
          ...createLibraryItem({ name: 'Pre-selected Item' }),
          quantity: 2,
          notes: 'Pre-selected note'
        }
      ];
      
      customRender(
        <AdvancedLibrarySelector 
          {...defaultProps} 
          preSelectedItems={preSelectedItems}
        />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      expect(screen.getByText('Selected Items (1)')).toBeInTheDocument();
      expect(screen.getByText('Pre-selected Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Pre-selected note')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large item lists efficiently', async () => {
      const user = userEvent.setup();
      const largeItemList = createLibraryItemBatch(200);
      
      const startTime = performance.now();
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={largeItemList} />
      );
      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should filter large datasets efficiently', async () => {
      const user = userEvent.setup();
      const largeItemList = createLibraryItemBatch(100);
      
      customRender(
        <AdvancedLibrarySelector {...defaultProps} availableItems={largeItemList} />
      );

      await user.click(screen.getByText('Add Library Items to Foundation Work'));
      
      const startTime = performance.now();
      const searchInput = screen.getByPlaceholderText('Search by name, code, or description...');
      await user.type(searchInput, 'item');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog accessibility attributes', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have accessible form controls', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      await user.click(screen.getByText('Add Library Items to Foundation Work'));

      // All selects should have accessible labels
      const comboboxes = screen.getAllByRole('combobox');
      comboboxes.forEach(combobox => {
        expect(combobox).toBeInTheDocument();
      });

      // Search input should have accessible placeholder
      const searchInput = screen.getByPlaceholderText('Search by name, code, or description...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      customRender(<AdvancedLibrarySelector {...defaultProps} />);

      // Should be able to open dialog with Enter key
      const triggerButton = screen.getByText('Add Library Items to Foundation Work');
      triggerButton.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Select Library Items for Foundation Work')).toBeInTheDocument();
    });
  });
});