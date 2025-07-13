import { LibraryIntegrationService } from './libraryIntegrationService';
import { FactorCalculatorService } from './factorCalculatorService';
import { createClient } from '@/utils/supabase/server';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('./factorCalculatorService', () => ({
  FactorCalculatorService: {
    getInstance: jest.fn(),
  },
}));

describe('LibraryIntegrationService', () => {
  let service: LibraryIntegrationService;
  let mockSupabase: any;
  let mockFactorCalculator: any;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(() => ({ 
          data: { user: { id: 'user-123' } } 
        })),
      },
      from: jest.fn(),
    };

    // Mock Factor Calculator
    mockFactorCalculator = {
      calculateItemCost: jest.fn(() => Promise.resolve({
        libraryItemId: 'item-1',
        libraryItemCode: 'TEST001',
        libraryItemName: 'Test Item',
        quantity: 1,
        unit: 'unit',
        materials: { total: 100, factors: [] },
        labour: { total: 50, factors: [] },
        equipment: { total: 25, factors: [] },
        totalCost: 175,
        ratePerUnit: 175,
        breakdown: { materials: [], labour: [], equipment: [] }
      })),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (FactorCalculatorService.getInstance as jest.Mock).mockReturnValue(mockFactorCalculator);
    
    service = LibraryIntegrationService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEstimateFromLibraryItems', () => {
    it('should create estimate elements and detail items from library selections', async () => {
      // Mock library item with full hierarchy
      const mockLibraryItem = {
        id: 'item-1',
        code: '01',
        name: 'Test Item',
        unit: 'unit',
        assembly: {
          id: 'assembly-1',
          code: '001',
          name: 'Test Assembly',
          section: {
            id: 'section-1',
            code: '01',
            name: 'Test Section',
            division: {
              id: 'division-1',
              code: '01',
              name: 'Test Division'
            }
          }
        }
      };

      // Mock Supabase queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'library_items') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockLibraryItem,
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'estimate_elements') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { 
                    id: `element-${Date.now()}`,
                    name: 'Created Element',
                    library_path: '01.01.001'
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'estimate_detail_items') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { 
                    id: `detail-${Date.now()}`,
                    description: 'Test Item',
                    quantity: 10,
                    rate: 175,
                    amount: 1750
                  },
                  error: null,
                })),
              })),
            })),
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: [],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'library_usage_tracking') {
          return {
            insert: jest.fn(() => ({
              error: null,
            })),
          };
        }
        return {
          select: jest.fn(() => ({ data: [], error: null })),
          insert: jest.fn(() => ({ data: null, error: null })),
        };
      });

      const selections = [
        {
          item: mockLibraryItem,
          quantity: 10,
          structureId: 'structure-1',
          elementId: 'element-1'
        }
      ];

      const result = await service.createEstimateFromLibraryItems(
        'project-1',
        'structure-1',
        selections
      );

      expect(result.elements).toHaveLength(3); // Division, Section, Assembly
      expect(result.detailItems).toHaveLength(1);
      expect(result.errors).toBeUndefined();
      expect(mockFactorCalculator.calculateItemCost).toHaveBeenCalledWith(
        'item-1',
        'project-1',
        10
      );
    });

    it('should handle validation errors', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: new Error('Item not found'),
            })),
          })),
        })),
      }));

      const selections = [
        {
          libraryItemId: 'invalid-item',
          quantity: 1,
          targetStructureId: 'structure-1',
          targetElementId: 'element-1'
        }
      ];

      await expect(
        service.createEstimateFromLibraryItems('project-1', 'structure-1', selections)
      ).rejects.toThrow('No valid library items selected');
    });
  });

  describe('linkExistingItemsToLibrary', () => {
    it('should update existing detail items with library references', async () => {
      const mockLibraryItem = {
        id: 'item-1',
        code: '01',
        assembly: {
          id: 'assembly-1',
          code: '001',
          section: {
            id: 'section-1',
            code: '01',
            division: {
              id: 'division-1',
              code: '01'
            }
          }
        }
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'library_items') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockLibraryItem,
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'estimate_detail_items') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          };
        }
        return { select: jest.fn(() => ({ data: [], error: null })) };
      });

      const mappings = [
        { detailItemId: 'detail-1', libraryItemId: 'item-1' }
      ];

      await service.linkExistingItemsToLibrary('project-1', mappings);

      expect(mockFactorCalculator.calculateItemCost).toHaveBeenCalledWith(
        'item-1',
        'project-1',
        1
      );
    });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LibraryIntegrationService.getInstance();
      const instance2 = LibraryIntegrationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});