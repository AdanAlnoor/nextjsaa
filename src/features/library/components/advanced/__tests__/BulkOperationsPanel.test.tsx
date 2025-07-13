/**
 * Component Tests for BulkOperationsPanel
 * Phase 5: Testing Infrastructure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BulkOperationsPanel } from '../BulkOperationsPanel';
import { createLibraryItemBatch, createLibraryItem } from '@/test/factories/libraryFactory';
import { customRender } from '@/test/utils/testUtils';

describe('BulkOperationsPanel', () => {
  const defaultProps = {
    selectedItems: createLibraryItemBatch(3),
    onItemsUpdate: jest.fn(),
    onSelectionChange: jest.fn(),
    allItems: createLibraryItemBatch(10)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render with essential elements when items are selected', () => {
      customRender(<BulkOperationsPanel {...defaultProps} />);

      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
      expect(screen.getByText('3 selected')).toBeInTheDocument();
      expect(screen.getByText('Choose Operation')).toBeInTheDocument();
      expect(screen.getByText('Select All')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should show help message when no items selected', () => {
      customRender(
        <BulkOperationsPanel {...defaultProps} selectedItems={[]} />
      );

      expect(screen.getByText(/Select items to perform bulk operations/)).toBeInTheDocument();
    });

    it('should render all operation options', () => {
      customRender(<BulkOperationsPanel {...defaultProps} />);

      expect(screen.getByText('Update Status')).toBeInTheDocument();
      expect(screen.getByText('Adjust Prices')).toBeInTheDocument();
      expect(screen.getByText('Change Assembly')).toBeInTheDocument();
      expect(screen.getByText('Add Keywords')).toBeInTheDocument();
      expect(screen.getByText('Clone Items')).toBeInTheDocument();
      expect(screen.getByText('Update Factors')).toBeInTheDocument();
      expect(screen.getByText('Change Supplier')).toBeInTheDocument();
      expect(screen.getByText('Apply Discount')).toBeInTheDocument();
    });
  });

  describe('Selection Management', () => {
    it('should call onSelectionChange when Select All clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = jest.fn();
      
      customRender(
        <BulkOperationsPanel 
          {...defaultProps} 
          onSelectionChange={mockOnSelectionChange} 
        />
      );

      await user.click(screen.getByText('Select All'));
      
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining(defaultProps.allItems.map(item => item.id))
      );
    });

    it('should call onSelectionChange when Clear clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = jest.fn();
      
      customRender(
        <BulkOperationsPanel 
          {...defaultProps} 
          onSelectionChange={mockOnSelectionChange} 
        />
      );

      await user.click(screen.getByText('Clear'));
      
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Operation Selection', () => {
    it('should show configuration options when operation selected', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select update status operation
      await user.click(screen.getByLabelText(/Update Status/));
      
      expect(screen.getByText('Configure Operation')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should show text input for operations requiring text input', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select add keywords operation
      await user.click(screen.getByLabelText(/Add Keywords/));
      
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
    });

    it('should show percentage input for price adjustment operations', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select adjust prices operation
      await user.click(screen.getByLabelText(/Adjust Prices/));
      
      expect(screen.getByPlaceholderText(/Enter percentage/)).toBeInTheDocument();
    });

    it('should show checkboxes for field selection in price adjustment', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select adjust prices operation
      await user.click(screen.getByLabelText(/Adjust Prices/));
      
      expect(screen.getByText('Apply to:')).toBeInTheDocument();
      expect(screen.getByLabelText('Material Cost')).toBeInTheDocument();
      expect(screen.getByLabelText('Labor Cost')).toBeInTheDocument();
      expect(screen.getByLabelText('Equipment Cost')).toBeInTheDocument();
    });
  });

  describe('Preview Functionality', () => {
    it('should show preview button when operation configured', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select and configure update status operation
      await user.click(screen.getByLabelText(/Update Status/));
      
      // Select a status value
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      expect(screen.getByText('Preview Changes')).toBeInTheDocument();
    });

    it('should show preview when preview button clicked', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Test Item 1' }),
        createLibraryItem({ name: 'Test Item 2' })
      ];
      
      customRender(
        <BulkOperationsPanel {...defaultProps} selectedItems={items} />
      );

      // Select and configure operation
      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      // Click preview
      await user.click(screen.getByText('Preview Changes'));
      
      expect(screen.getByText(/Preview \(2 changes\)/)).toBeInTheDocument();
    });

    it('should hide preview when hide preview clicked', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select and configure operation
      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      // Show preview
      await user.click(screen.getByText('Preview Changes'));
      
      // Hide preview
      await user.click(screen.getByText('Hide Preview'));
      
      expect(screen.queryByText(/Preview \(/)).not.toBeInTheDocument();
    });
  });

  describe('Operation Execution', () => {
    it('should show execute button when operation configured', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select and configure update status operation
      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      expect(screen.getByText('Execute on 3 items')).toBeInTheDocument();
    });

    it('should show progress during execution', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select and configure operation
      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      // Execute operation
      await user.click(screen.getByText('Execute on 3 items'));
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should call onItemsUpdate when operation executed', async () => {
      const user = userEvent.setup();
      const mockOnItemsUpdate = jest.fn();
      
      customRender(
        <BulkOperationsPanel 
          {...defaultProps} 
          onItemsUpdate={mockOnItemsUpdate}
        />
      );

      // Select and configure operation
      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      // Execute operation
      await user.click(screen.getByText('Execute on 3 items'));
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(mockOnItemsUpdate).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should disable execute button during execution', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Select and configure operation
      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      // Execute operation
      const executeButton = screen.getByText('Execute on 3 items');
      await user.click(executeButton);
      
      expect(screen.getByText('Executing...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Executing/ })).toBeDisabled();
    });
  });

  describe('Specific Operations', () => {
    describe('Update Status Operation', () => {
      it('should generate correct preview for status update', async () => {
        const user = userEvent.setup();
        const items = [createLibraryItem({ name: 'Test Item', status: 'draft' })];
        
        customRender(
          <BulkOperationsPanel {...defaultProps} selectedItems={items} />
        );

        await user.click(screen.getByLabelText(/Update Status/));
        const select = screen.getByRole('combobox');
        await user.click(select);
        await user.click(screen.getByText('Confirmed'));
        
        await user.click(screen.getByText('Preview Changes'));
        
        expect(screen.getByText(/status: confirmed/)).toBeInTheDocument();
      });
    });

    describe('Adjust Prices Operation', () => {
      it('should handle percentage price adjustments', async () => {
        const user = userEvent.setup();
        const items = [createLibraryItem({ 
          name: 'Test Item',
          material_cost: 100,
          labor_cost: 50
        })];
        
        customRender(
          <BulkOperationsPanel {...defaultProps} selectedItems={items} />
        );

        await user.click(screen.getByLabelText(/Adjust Prices/));
        await user.type(screen.getByPlaceholderText(/Enter percentage/), '10');
        
        await user.click(screen.getByText('Preview Changes'));
        
        // Should show 10% increase in costs
        expect(screen.getByText(/material_cost: 110/)).toBeInTheDocument();
      });

      it('should allow selection of cost fields to adjust', async () => {
        const user = userEvent.setup();
        
        customRender(<BulkOperationsPanel {...defaultProps} />);

        await user.click(screen.getByLabelText(/Adjust Prices/));
        
        // Uncheck material cost
        await user.click(screen.getByLabelText('Material Cost'));
        
        // Check labor cost
        await user.click(screen.getByLabelText('Labor Cost'));
        
        // Should maintain checkbox states
        expect(screen.getByLabelText('Material Cost')).not.toBeChecked();
        expect(screen.getByLabelText('Labor Cost')).toBeChecked();
      });
    });

    describe('Clone Items Operation', () => {
      it('should generate new items with clone suffix', async () => {
        const user = userEvent.setup();
        const mockOnItemsUpdate = jest.fn();
        const items = [createLibraryItem({ code: 'ITEM001', name: 'Original Item' })];
        
        customRender(
          <BulkOperationsPanel 
            {...defaultProps} 
            selectedItems={items}
            onItemsUpdate={mockOnItemsUpdate}
          />
        );

        await user.click(screen.getByLabelText(/Clone Items/));
        await user.type(screen.getByPlaceholderText('Enter value'), 'V2');
        
        await user.click(screen.getByText('Execute on 1 items'));
        
        await waitFor(() => {
          const updateCall = mockOnItemsUpdate.mock.calls[0];
          const updatedItems = updateCall[0];
          const newItem = updatedItems.find(item => item.code === 'ITEM001-V2');
          expect(newItem).toBeDefined();
          expect(newItem.name).toBe('Original Item (V2)');
        }, { timeout: 3000 });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle operation failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      // Execute operation
      await user.click(screen.getByText('Execute on 3 items'));
      
      // Should not crash even if operation fails
      await waitFor(() => {
        expect(screen.queryByText('Executing...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
      
      consoleSpy.mockRestore();
    });

    it('should show error count when operations fail', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      await user.click(screen.getByText('Execute on 3 items'));
      
      // Wait for completion and check for error reporting
      await waitFor(() => {
        expect(screen.queryByText('Executing...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Performance', () => {
    it('should handle large selection efficiently', async () => {
      const user = userEvent.setup();
      const largeSelection = createLibraryItemBatch(100);
      
      const startTime = performance.now();
      customRender(
        <BulkOperationsPanel {...defaultProps} selectedItems={largeSelection} />
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByText('100 selected')).toBeInTheDocument();
    });

    it('should generate preview efficiently for large datasets', async () => {
      const user = userEvent.setup();
      const largeSelection = createLibraryItemBatch(50);
      
      customRender(
        <BulkOperationsPanel {...defaultProps} selectedItems={largeSelection} />
      );

      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      const startTime = performance.now();
      await user.click(screen.getByText('Preview Changes'));
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500);
      expect(screen.getByText(/Preview \(50 changes\)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for operation selection', () => {
      customRender(<BulkOperationsPanel {...defaultProps} />);

      // Radio group should have proper labels
      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('id');
      });
    });

    it('should provide descriptive text for each operation', () => {
      customRender(<BulkOperationsPanel {...defaultProps} />);

      expect(screen.getByText('Change status for all selected items')).toBeInTheDocument();
      expect(screen.getByText('Apply percentage increase/decrease to all costs')).toBeInTheDocument();
      expect(screen.getByText('Move items to different assembly/division')).toBeInTheDocument();
    });

    it('should have proper progress bar accessibility', async () => {
      const user = userEvent.setup();
      
      customRender(<BulkOperationsPanel {...defaultProps} />);

      await user.click(screen.getByLabelText(/Update Status/));
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByText('Confirmed'));
      
      await user.click(screen.getByText('Execute on 3 items'));
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});