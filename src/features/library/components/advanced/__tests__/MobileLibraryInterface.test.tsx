/**
 * Component Tests for MobileLibraryInterface
 * Phase 5: Testing Infrastructure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MobileLibraryInterface } from '../MobileLibraryInterface';
import { createLibraryItemBatch, createLibraryItem } from '@/test/factories/libraryFactory';
import { customRender } from '@/test/utils/testUtils';

// Mock the UI components that might not be available in test environment
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: any) => <h2 data-testid="sheet-title">{children}</h2>,
  SheetTrigger: ({ children, asChild }: any) => <div data-testid="sheet-trigger">{children}</div>
}));

jest.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: any) => open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }: any) => <div data-testid="drawer-content">{children}</div>,
  DrawerHeader: ({ children }: any) => <div data-testid="drawer-header">{children}</div>,
  DrawerTitle: ({ children }: any) => <h2 data-testid="drawer-title">{children}</h2>,
  DrawerTrigger: ({ children }: any) => <div data-testid="drawer-trigger">{children}</div>
}));

describe('MobileLibraryInterface', () => {
  const defaultProps = {
    items: createLibraryItemBatch(5),
    onItemSelect: jest.fn(),
    onItemEdit: jest.fn(),
    selectedItems: [],
    onSelectionChange: jest.fn(),
    showBulkActions: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render with essential mobile elements', () => {
      customRender(<MobileLibraryInterface {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search library items...')).toBeInTheDocument();
      expect(screen.getByText(/Sort/)).toBeInTheDocument();
      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    it('should render in card view mode by default', () => {
      customRender(<MobileLibraryInterface {...defaultProps} />);

      // Should show cards (default view)
      const cards = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('⋯')
      );
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should show category filter button', () => {
      customRender(<MobileLibraryInterface {...defaultProps} />);

      expect(screen.getByText(/📁 All Categories/)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter items based on search term', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ name: 'Concrete Block', code: 'CON001' }),
        createLibraryItem({ name: 'Steel Beam', code: 'STL001' }),
        createLibraryItem({ name: 'Concrete Pipe', code: 'CON002' })
      ];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      const searchInput = screen.getByPlaceholderText('Search library items...');
      await user.type(searchInput, 'concrete');

      expect(screen.getByText('2 items')).toBeInTheDocument();
      expect(screen.getByText('Concrete Block')).toBeInTheDocument();
      expect(screen.getByText('Concrete Pipe')).toBeInTheDocument();
      expect(screen.queryByText('Steel Beam')).not.toBeInTheDocument();
    });

    it('should clear search when input is cleared', async () => {
      const user = userEvent.setup();
      const items = createLibraryItemBatch(3);
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      const searchInput = screen.getByPlaceholderText('Search library items...');
      await user.type(searchInput, 'test');
      await user.clear(searchInput);

      expect(screen.getByText('3 items')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('should switch between card and list view modes', async () => {
      const user = userEvent.setup();
      
      customRender(<MobileLibraryInterface {...defaultProps} />);

      // Should start in card view
      const cardViewBtn = screen.getByText('⊞');
      const listViewBtn = screen.getByText('☰');
      
      // Switch to list view
      await user.click(listViewBtn);
      
      // Should show list items instead of cards
      expect(screen.getAllByText('→').length).toBeGreaterThan(0);
      
      // Switch back to card view
      await user.click(cardViewBtn);
      
      // Should show card items again
      const cards = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('⋯')
      );
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Sorting', () => {
    it('should sort items by name by default', () => {
      const items = [
        createLibraryItem({ name: 'Zebra Item' }),
        createLibraryItem({ name: 'Alpha Item' }),
        createLibraryItem({ name: 'Beta Item' })
      ];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      const itemTexts = screen.getAllByText(/Item$/);
      expect(itemTexts[0]).toHaveTextContent('Alpha Item');
      expect(itemTexts[1]).toHaveTextContent('Beta Item');
      expect(itemTexts[2]).toHaveTextContent('Zebra Item');
    });

    it('should change sort order when sort option selected', async () => {
      const user = userEvent.setup();
      const items = [
        createLibraryItem({ 
          name: 'Expensive Item', 
          material_cost: 1000,
          updated_at: '2024-01-01'
        }),
        createLibraryItem({ 
          name: 'Cheap Item', 
          material_cost: 100,
          updated_at: '2024-01-03'
        }),
        createLibraryItem({ 
          name: 'Medium Item', 
          material_cost: 500,
          updated_at: '2024-01-02'
        })
      ];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Open sort dropdown
      await user.click(screen.getByText(/Sort/));
      
      // Select price sort
      await user.click(screen.getByText('Price: Low to High'));

      const itemTexts = screen.getAllByText(/Item$/);
      expect(itemTexts[0]).toHaveTextContent('Cheap Item');
      expect(itemTexts[1]).toHaveTextContent('Medium Item');
      expect(itemTexts[2]).toHaveTextContent('Expensive Item');
    });
  });

  describe('Category Filtering', () => {
    it('should show all categories in category list', () => {
      const items = [
        createLibraryItem({ name: 'Item 1', assembly: 'concrete' }),
        createLibraryItem({ name: 'Item 2', assembly: 'steel' }),
        createLibraryItem({ name: 'Item 3', assembly: 'concrete' })
      ];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Should show "All Categories" by default
      expect(screen.getByText(/📁 All Categories/)).toBeInTheDocument();
    });
  });

  describe('Item Interaction - Card Mode', () => {
    it('should call onItemSelect when item card clicked without bulk actions', async () => {
      const user = userEvent.setup();
      const mockOnItemSelect = jest.fn();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <MobileLibraryInterface 
          {...defaultProps} 
          items={items}
          onItemSelect={mockOnItemSelect}
          showBulkActions={false}
        />
      );

      // Click on the item card
      await user.click(screen.getByText('Test Item'));

      expect(mockOnItemSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Item' })
      );
    });

    it('should show dropdown menu with actions in card mode', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <MobileLibraryInterface {...defaultProps} items={items} showBulkActions={false} />
      );

      // Click on dropdown trigger
      const dropdownButton = screen.getByText('⋯');
      await user.click(dropdownButton);

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Select')).toBeInTheDocument();
    });
  });

  describe('Item Interaction - List Mode', () => {
    it('should show arrow buttons in list mode', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Switch to list view
      await user.click(screen.getByText('☰'));

      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should open item detail when arrow clicked in list mode', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Switch to list view
      await user.click(screen.getByText('☰'));
      
      // Click arrow button
      await user.click(screen.getByText('→'));

      expect(screen.getByTestId('drawer')).toBeInTheDocument();
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  describe('Bulk Selection Mode', () => {
    it('should show checkboxes when bulk actions enabled', () => {
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <MobileLibraryInterface {...defaultProps} items={items} showBulkActions={true} />
      );

      // Should show checkboxes in items
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should toggle item selection when checkbox clicked', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = jest.fn();
      const items = [createLibraryItem({ name: 'Test Item', id: 'item-1' })];
      
      customRender(
        <MobileLibraryInterface 
          {...defaultProps} 
          items={items}
          showBulkActions={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Click on checkbox
      const checkbox = screen.getByText('✓').parentElement;
      await user.click(checkbox!);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(['item-1']);
    });

    it('should show bulk actions bar when items selected', () => {
      const items = [createLibraryItem({ name: 'Test Item', id: 'item-1' })];
      
      customRender(
        <MobileLibraryInterface 
          {...defaultProps} 
          items={items}
          showBulkActions={true}
          selectedItems={['item-1']}
        />
      );

      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(screen.getByText('Edit All')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should not show bulk actions bar when no items selected', () => {
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <MobileLibraryInterface 
          {...defaultProps} 
          items={items}
          showBulkActions={true}
          selectedItems={[]}
        />
      );

      expect(screen.queryByText('Edit All')).not.toBeInTheDocument();
    });
  });

  describe('Item Detail Drawer', () => {
    it('should show item details in drawer when item selected', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ 
        name: 'Test Item',
        code: 'TEST001',
        unit: 'each',
        status: 'confirmed',
        assembly: 'concrete',
        description: 'Test description',
        material_cost: 100,
        labor_cost: 50,
        equipment_cost: 25
      })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Click on item to open detail
      await user.click(screen.getByText('Test Item'));

      expect(screen.getByTestId('drawer')).toBeInTheDocument();
      expect(screen.getByText('TEST001')).toBeInTheDocument();
      expect(screen.getByText('each')).toBeInTheDocument();
      expect(screen.getByText('confirmed')).toBeInTheDocument();
      expect(screen.getByText('concrete')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('$25.00')).toBeInTheDocument();
      expect(screen.getByText('$175.00')).toBeInTheDocument(); // Total
    });

    it('should call onItemSelect when Select Item clicked in drawer', async () => {
      const user = userEvent.setup();
      const mockOnItemSelect = jest.fn();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <MobileLibraryInterface 
          {...defaultProps} 
          items={items}
          onItemSelect={mockOnItemSelect}
        />
      );

      // Open item detail
      await user.click(screen.getByText('Test Item'));
      
      // Click Select Item button
      await user.click(screen.getByText('Select Item'));

      expect(mockOnItemSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Item' })
      );
    });

    it('should call onItemEdit when Edit Item clicked in drawer', async () => {
      const user = userEvent.setup();
      const mockOnItemEdit = jest.fn();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(
        <MobileLibraryInterface 
          {...defaultProps} 
          items={items}
          onItemEdit={mockOnItemEdit}
        />
      );

      // Open item detail
      await user.click(screen.getByText('Test Item'));
      
      // Click Edit Item button
      await user.click(screen.getByText('Edit Item'));

      expect(mockOnItemEdit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Item' })
      );
    });
  });

  describe('Cost Display', () => {
    it('should display total cost correctly', () => {
      const items = [createLibraryItem({ 
        name: 'Test Item',
        material_cost: 100,
        labor_cost: 50,
        equipment_cost: 25
      })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      expect(screen.getByText('$175.00')).toBeInTheDocument();
    });

    it('should handle zero costs gracefully', () => {
      const items = [createLibraryItem({ 
        name: 'Free Item',
        material_cost: 0,
        labor_cost: 0,
        equipment_cost: 0
      })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Usage Indicators', () => {
    it('should show usage indicator for popular items', () => {
      const items = [createLibraryItem({ 
        name: 'Popular Item',
        usage_count_30d: 15
      })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      expect(screen.getByText('Used 15 times recently')).toBeInTheDocument();
    });

    it('should not show usage indicator for unused items', () => {
      const items = [createLibraryItem({ 
        name: 'Unused Item',
        usage_count_30d: 0
      })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      expect(screen.queryByText(/Used .* times recently/)).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show no items message when no items match filters', async () => {
      const user = userEvent.setup();
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Search for something that doesn't exist
      const searchInput = screen.getByPlaceholderText('Search library items...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No items found. Try adjusting your search or filters.')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large lists efficiently', () => {
      const largeItemList = createLibraryItemBatch(100);
      
      const startTime = performance.now();
      customRender(<MobileLibraryInterface {...defaultProps} items={largeItemList} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(2000);
      expect(screen.getByText('100 items')).toBeInTheDocument();
    });

    it('should filter large datasets efficiently', async () => {
      const user = userEvent.setup();
      const largeItemList = createLibraryItemBatch(50);
      
      customRender(<MobileLibraryInterface {...defaultProps} items={largeItemList} />);

      const startTime = performance.now();
      const searchInput = screen.getByPlaceholderText('Search library items...');
      await user.type(searchInput, 'item');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    it('should have proper touch targets for mobile interaction', () => {
      const items = [createLibraryItem({ name: 'Test Item' })];
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      // Items should have touch-manipulation class for better mobile interaction
      const itemCard = screen.getByText('Test Item').closest('.touch-manipulation');
      expect(itemCard).toBeInTheDocument();
    });

    it('should provide accessible search input', () => {
      customRender(<MobileLibraryInterface {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search library items...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should show clear item count for screen readers', () => {
      const items = createLibraryItemBatch(5);
      
      customRender(<MobileLibraryInterface {...defaultProps} items={items} />);

      expect(screen.getByText('5 items')).toBeInTheDocument();
    });
  });
});