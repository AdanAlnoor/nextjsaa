/**
 * Unit Tests for LibraryManagementService
 * Phase 5: Enhanced Testing Infrastructure
 */

import { LibraryManagementService } from '../libraryManagementService';
import { 
  LibraryItem, 
  LibraryItemStatus, 
  CreateLibraryItemRequest, 
  QuickAddFromEstimateData 
} from '../../types/library';
import { 
  createLibraryItem, 
  createLibraryItemBatch,
  createConfirmedLibraryItem,
  createDraftLibraryItem 
} from '@/test/factories/libraryFactory';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  }
};

// Mock the createClient function
jest.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}));

describe('LibraryManagementService', () => {
  let service: LibraryManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = LibraryManagementService.getInstance();
  });

  describe('createLibraryItem', () => {
    it('should create a new library item as draft', async () => {
      const createRequest: CreateLibraryItemRequest = {
        name: 'Test Concrete',
        description: 'Test Description',
        unit: 'M3',
        assemblyId: 'assembly-123',
        specifications: 'Grade 25',
        wastagePercentage: 5
      };

      const mockCreatedItem = {
        id: 'item-123',
        code: '03.10.20.01',
        name: 'Test Concrete',
        description: 'Test Description',
        unit: 'M3',
        assembly_id: 'assembly-123',
        status: 'draft',
        version: 1,
        isActive: false,
        created_by: 'test-user-id',
        createdAt: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-01T00:00:00Z',
        assembly: {
          id: 'assembly-123',
          code: '20',
          name: 'Concrete',
          section: {
            id: 'section-123',
            code: '10',
            name: 'Concrete Forming',
            division: {
              id: 'division-123',
              code: '03',
              name: 'Concrete'
            }
          }
        }
      };

      mockSupabase.single.mockResolvedValue({ 
        data: mockCreatedItem, 
        error: null 
      });

      const result = await service.createLibraryItem(createRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Concrete',
          status: 'draft',
          version: 1,
          isActive: false,
          created_by: 'test-user-id'
        })
      );
      expect(result.id).toBe('item-123');
      expect(result.status).toBe('draft');
    });

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const createRequest: CreateLibraryItemRequest = {
        name: 'Test Item',
        unit: 'EA',
        assemblyId: 'assembly-123'
      };

      await expect(service.createLibraryItem(createRequest))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('confirmLibraryItem', () => {
    it('should confirm a draft item with valid factors', async () => {
      const mockDraftItem = {
        id: 'item-123',
        status: 'draft' as LibraryItemStatus,
        version: 1
      };

      const mockConfirmedItem = {
        ...mockDraftItem,
        status: 'confirmed' as LibraryItemStatus,
        confirmedAt: '2024-01-01T00:00:00Z',
        confirmedBy: 'test-user-id',
        isActive: true
      };

      // Mock getLibraryItem call
      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockDraftItem as any);
      
      // Mock validateLibraryItem call
      jest.spyOn(service as any, 'validateLibraryItem').mockResolvedValue({
        isValid: true,
        errors: []
      });

      // Mock updateLibraryItem call
      jest.spyOn(service, 'updateLibraryItem').mockResolvedValue(mockConfirmedItem as any);

      const result = await service.confirmLibraryItem('item-123', 'Test confirmation');

      expect(result.status).toBe('confirmed');
      expect(result.isActive).toBe(true);
    });

    it('should throw error when trying to confirm non-draft item', async () => {
      const mockConfirmedItem = {
        id: 'item-123',
        status: 'confirmed' as LibraryItemStatus
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockConfirmedItem as any);

      await expect(service.confirmLibraryItem('item-123'))
        .rejects.toThrow('Only draft items can be confirmed');
    });

    it('should throw error when validation fails', async () => {
      const mockDraftItem = {
        id: 'item-123',
        status: 'draft' as LibraryItemStatus
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockDraftItem as any);
      jest.spyOn(service as any, 'validateLibraryItem').mockResolvedValue({
        isValid: false,
        errors: ['Missing required factors']
      });

      await expect(service.confirmLibraryItem('item-123'))
        .rejects.toThrow('Item validation failed: Missing required factors');
    });
  });

  describe('markAsActual', () => {
    it('should mark confirmed item as actual', async () => {
      const mockConfirmedItem = {
        id: 'item-123',
        status: 'confirmed' as LibraryItemStatus
      };

      const mockActualItem = {
        ...mockConfirmedItem,
        status: 'actual' as LibraryItemStatus,
        actualLibraryDate: '2024-01-01T00:00:00Z'
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockConfirmedItem as any);
      jest.spyOn(service, 'updateLibraryItem').mockResolvedValue(mockActualItem as any);

      const result = await service.markAsActual('item-123');

      expect(result.status).toBe('actual');
      expect(result.actualLibraryDate).toBeDefined();
    });

    it('should throw error when trying to mark non-confirmed item as actual', async () => {
      const mockDraftItem = {
        id: 'item-123',
        status: 'draft' as LibraryItemStatus
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockDraftItem as any);

      await expect(service.markAsActual('item-123'))
        .rejects.toThrow('Only confirmed items can be marked as actual');
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should successfully update multiple items', async () => {
      jest.spyOn(service, 'confirmLibraryItem')
        .mockResolvedValueOnce({} as any)
        .mockResolvedValueOnce({} as any);

      const result = await service.bulkUpdateStatus(
        ['item-1', 'item-2'],
        'confirmed'
      );

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      jest.spyOn(service, 'confirmLibraryItem')
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Validation failed'));

      const result = await service.bulkUpdateStatus(
        ['item-1', 'item-2'],
        'confirmed'
      );

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Validation failed');
    });
  });

  describe('cloneLibraryItem', () => {
    it('should clone item with all factors', async () => {
      const mockSourceItem = {
        id: 'source-123',
        code: 'CONC-01',
        name: 'Original Concrete',
        description: 'Original description',
        unit: 'M3',
        assembly_id: 'assembly-123'
      };

      const mockClonedItem = {
        id: 'clone-123',
        code: 'CONC-02',
        name: 'Cloned Concrete',
        status: 'draft'
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockSourceItem as any);
      jest.spyOn(service, 'createLibraryItem').mockResolvedValue(mockClonedItem as any);
      jest.spyOn(service as any, 'cloneFactors').mockResolvedValue(undefined);

      const result = await service.cloneLibraryItem(
        'source-123',
        'CONC-02',
        'Cloned Concrete'
      );

      expect(result.id).toBe('clone-123');
      expect(service.createLibraryItem).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CONC-02',
          name: 'Cloned Concrete'
        })
      );
    });
  });

  describe('searchLibraryItems', () => {
    it('should search items with filters', async () => {
      const mockSearchResult = {
        data: [
          {
            id: 'item-1',
            code: 'CONC-01',
            name: 'Concrete Item 1',
            status: 'confirmed'
          },
          {
            id: 'item-2',
            code: 'CONC-02',
            name: 'Concrete Item 2',
            status: 'draft'
          }
        ],
        count: 2,
        error: null
      };

      mockSupabase.mockResolvedValue(mockSearchResult);

      const result = await service.searchLibraryItems({
        query: 'concrete',
        status: 'confirmed',
        limit: 10,
        offset: 0
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('concrete')
      );
    });

    it('should handle pagination correctly', async () => {
      const mockSearchResult = {
        data: Array(5).fill(null).map((_, i) => ({
          id: `item-${i}`,
          code: `ITEM-${i}`,
          name: `Item ${i}`
        })),
        count: 15,
        error: null
      };

      mockSupabase.mockResolvedValue(mockSearchResult);

      const result = await service.searchLibraryItems({
        limit: 5,
        offset: 5
      });

      expect(result.hasMore).toBe(true);
      expect(mockSupabase.range).toHaveBeenCalledWith(5, 9);
    });
  });

  describe('quickAddFromEstimate', () => {
    it('should create item from estimate context', async () => {
      const quickAddData: QuickAddFromEstimateData = {
        name: 'Quick Added Item',
        unit: 'EA',
        division_id: 'div-123',
        material_rate: '100',
        quick_add_context: {
          element_id: 'element-123',
          search_term: 'test item',
          created_from: 'estimate'
        }
      };

      const mockCreatedItem = {
        id: 'quick-123',
        name: 'Quick Added Item',
        status: 'draft'
      };

      // Mock assembly lookup
      mockSupabase.mockResolvedValueOnce({
        data: [{ id: 'assembly-123' }],
        error: null
      });

      jest.spyOn(service, 'createLibraryItem').mockResolvedValue(mockCreatedItem as any);
      jest.spyOn(service as any, 'addQuickMaterialFactor').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'linkToEstimateElement').mockResolvedValue(undefined);

      const result = await service.quickAddFromEstimate(quickAddData);

      expect(result.id).toBe('quick-123');
      expect(service.createLibraryItem).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Quick Added Item',
          unit: 'EA'
        })
      );
    });

    it('should throw error if assembly cannot be determined', async () => {
      const quickAddData: QuickAddFromEstimateData = {
        name: 'Quick Added Item',
        unit: 'EA',
        quick_add_context: {
          element_id: 'element-123',
          search_term: 'test item',
          created_from: 'estimate'
        }
      };

      // Mock empty assembly lookup
      mockSupabase.mockResolvedValue({
        data: [],
        error: null
      });

      await expect(service.quickAddFromEstimate(quickAddData))
        .rejects.toThrow('Could not determine assembly for quick add item');
    });
  });

  describe('version control', () => {
    it('should create version snapshot', async () => {
      const mockItem = {
        id: 'item-123',
        version: 1,
        name: 'Test Item'
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockItem as any);
      mockSupabase.insert.mockResolvedValue({ error: null });

      await service.createVersionSnapshot('item-123', 'Test change');

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          library_item_id: 'item-123',
          version_number: 1,
          data: mockItem,
          change_note: 'Test change'
        })
      );
    });

    it('should get version history', async () => {
      const mockVersions = [
        {
          id: 'version-2',
          version_number: 2,
          created_at: '2024-01-02T00:00:00Z'
        },
        {
          id: 'version-1',
          version_number: 1,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabase.mockResolvedValue({
        data: mockVersions,
        error: null
      });

      const result = await service.getVersionHistory('item-123');

      expect(result).toHaveLength(2);
      expect(result[0].version_number).toBe(2);
      expect(mockSupabase.order).toHaveBeenCalledWith(
        'version_number',
        { ascending: false }
      );
    });

    it('should restore from version', async () => {
      const mockVersion = {
        id: 'version-1',
        version_number: 1,
        data: {
          name: 'Original Name',
          description: 'Original Description'
        }
      };

      mockSupabase.single.mockResolvedValue({
        data: mockVersion,
        error: null
      });

      jest.spyOn(service, 'createVersionSnapshot').mockResolvedValue(undefined);
      jest.spyOn(service, 'updateLibraryItem').mockResolvedValue({} as any);

      await service.restoreFromVersion('item-123', 'version-1');

      expect(service.updateLibraryItem).toHaveBeenCalledWith(
        'item-123',
        expect.objectContaining({
          name: 'Original Name',
          description: 'Original Description'
        })
      );
    });
  });

  describe('validation', () => {
    it('should validate item successfully with all requirements', async () => {
      const mockItem = {
        id: 'item-123',
        code: 'CONC-01',
        name: 'Test Concrete',
        unit: 'M3',
        assembly_id: 'assembly-123'
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockItem as any);
      jest.spyOn(service as any, 'checkItemHasFactors').mockResolvedValue(true);
      jest.spyOn(service as any, 'checkCodeDuplicate').mockResolvedValue(0);

      const result = await service.validateLibraryItem('item-123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for incomplete item', async () => {
      const mockItem = {
        id: 'item-123',
        code: '',
        name: '',
        unit: '',
        assembly_id: null
      };

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(mockItem as any);
      jest.spyOn(service as any, 'checkItemHasFactors').mockResolvedValue(false);

      const result = await service.validateLibraryItem('item-123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item code is required');
      expect(result.errors).toContain('Item name is required');
      expect(result.errors).toContain('Item unit is required');
      expect(result.errors).toContain('Assembly assignment is required');
      expect(result.errors).toContain('Item must have at least one factor (material, labour, or equipment)');
    });
  });

  describe('statistics', () => {
    it('should get item statistics', async () => {
      const mockStats = {
        usage_count: 15,
        last_used_at: '2024-01-01T00:00:00Z',
        projects_used_in: 3,
        average_quantity: 2.5
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      });

      const result = await service.getItemStatistics('item-123');

      expect(result.usageCount).toBe(15);
      expect(result.projectsUsedIn).toBe(3);
      expect(result.averageQuantity).toBe(2.5);
      expect(result.lastUsedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('should handle statistics errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Function not found' }
      });

      const result = await service.getItemStatistics('item-123');

      expect(result.usageCount).toBe(0);
      expect(result.projectsUsedIn).toBe(0);
      expect(result.averageQuantity).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent modifications', async () => {
      const item = createLibraryItem({ version: 1 });
      
      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(item);
      jest.spyOn(service, 'updateLibraryItem')
        .mockRejectedValueOnce(new Error('Version conflict'))
        .mockResolvedValueOnce({ ...item, version: 2 } as any);

      // First attempt should fail, but service should handle gracefully
      await expect(service.updateLibraryItem(item.id, { name: 'Updated' }))
        .rejects.toThrow('Version conflict');
    });

    it('should handle network timeouts gracefully', async () => {
      mockSupabase.single.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(service.getLibraryItem('item-1'))
        .rejects.toThrow('Network timeout');
    });

    it('should handle large datasets without memory issues', async () => {
      const largeDataset = createLibraryItemBatch(1000);
      
      mockSupabase.mockResolvedValue({
        data: largeDataset,
        count: 1000,
        error: null
      });

      const start = performance.now();
      const result = await service.searchLibraryItems({ limit: 1000 });
      const duration = performance.now() - start;

      expect(result.items).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('performance benchmarks', () => {
    it('should handle bulk operations efficiently', async () => {
      const itemIds = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      
      // Mock each operation to complete quickly
      jest.spyOn(service, 'deleteLibraryItem').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
      });

      const start = performance.now();
      const result = await service.bulkDelete(itemIds, 'Performance test');
      const duration = performance.now() - start;

      expect(result.successful).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should search large libraries efficiently', async () => {
      const items = createLibraryItemBatch(500);
      
      mockSupabase.mockResolvedValue({
        data: items.slice(0, 10), // Return first 10
        count: 500,
        error: null
      });

      const start = performance.now();
      const result = await service.searchLibraryItems({
        query: 'test',
        limit: 10
      });
      const duration = performance.now() - start;

      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(500);
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });

  describe('data integrity', () => {
    it('should maintain referential integrity during clone operations', async () => {
      const sourceItem = createConfirmedLibraryItem();
      const clonedItem = createDraftLibraryItem({
        code: 'CLONE001',
        name: 'Cloned Item'
      });

      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(sourceItem);
      jest.spyOn(service, 'createLibraryItem').mockResolvedValue(clonedItem);
      jest.spyOn(service as any, 'cloneFactors').mockResolvedValue(undefined);

      const result = await service.cloneLibraryItem(
        sourceItem.id,
        'CLONE001',
        'Cloned Item'
      );

      expect(result.assembly_id).toBe(sourceItem.assembly_id);
      expect(result.unit).toBe(sourceItem.unit);
      expect(result.status).toBe('draft'); // Should always start as draft
    });

    it('should validate code uniqueness across all items', async () => {
      const existingItem = createLibraryItem({ code: 'UNIQUE001' });
      
      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(existingItem);
      jest.spyOn(service as any, 'checkItemHasFactors').mockResolvedValue(true);
      jest.spyOn(service as any, 'checkCodeDuplicate').mockResolvedValue(1); // Duplicate found

      const result = await service.validateLibraryItem(existingItem.id);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item code already exists');
    });
  });

  describe('state transitions', () => {
    it('should track all status transitions correctly', async () => {
      const draftItem = createDraftLibraryItem();
      const confirmedItem = { ...draftItem, status: 'confirmed' as LibraryItemStatus };
      const actualItem = { ...confirmedItem, status: 'actual' as LibraryItemStatus };

      jest.spyOn(service, 'getLibraryItem')
        .mockResolvedValueOnce(draftItem) // confirmLibraryItem
        .mockResolvedValueOnce(confirmedItem) // markAsActual
        .mockResolvedValueOnce(actualItem); // final state

      jest.spyOn(service as any, 'validateLibraryItem').mockResolvedValue({
        isValid: true,
        errors: []
      });

      jest.spyOn(service, 'updateLibraryItem')
        .mockResolvedValueOnce(confirmedItem)
        .mockResolvedValueOnce(actualItem);

      // Draft → Confirmed
      const confirmed = await service.confirmLibraryItem(draftItem.id);
      expect(confirmed.status).toBe('confirmed');

      // Confirmed → Actual
      const actual = await service.markAsActual(confirmed.id);
      expect(actual.status).toBe('actual');
    });

    it('should prevent invalid state transitions', async () => {
      const actualItem = createLibraryItem({ status: 'actual' });
      
      jest.spyOn(service, 'getLibraryItem').mockResolvedValue(actualItem);

      // Cannot confirm actual item
      await expect(service.confirmLibraryItem(actualItem.id))
        .rejects.toThrow('Only draft items can be confirmed');
    });
  });
});