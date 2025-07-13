import { FactorCalculatorService } from './factorCalculatorService';
import { createClient } from '@/utils/supabase/server';

// Mock Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('FactorCalculatorService', () => {
  let service: FactorCalculatorService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = FactorCalculatorService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateItemCost', () => {
    it('should calculate total cost from all factors', async () => {
      // Mock library item
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'library_items') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    id: 'item-1',
                    code: '03.10.10.01',
                    name: 'Concrete Grade 25',
                    unit: 'm³',
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        // Mock empty factors for simplicity
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        };
      });

      const result = await service.calculateItemCost('item-1', 'project-1', 10);

      expect(result).toMatchObject({
        libraryItemId: 'item-1',
        libraryItemCode: '03.10.10.01',
        libraryItemName: 'Concrete Grade 25',
        quantity: 10,
        unit: 'm³',
        totalCost: 0, // No factors, so cost is 0
        ratePerUnit: 0,
      });
    });

    it('should calculate material costs with wastage', async () => {
      // Mock library item and material factors
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'library_items') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'item-1', code: 'TEST', name: 'Test Item', unit: 'unit' },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'library_item_materials') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [{
                  material_id: 'mat-1',
                  quantity: 1.2,
                  wastage_percentage: 5,
                  material: {
                    code: 'MAT001',
                    name: 'Cement',
                    unit: 'bag',
                    default_rate: 100,
                  },
                }],
                error: null,
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        };
      });

      const result = await service.calculateItemCost('item-1', 'project-1', 10);

      // Expected: 10 units * 1.2 quantity * 1.05 wastage * 100 rate = 1260
      expect(result.materials.total).toBe(1260);
      expect(result.materials.factors[0]).toMatchObject({
        materialCode: 'MAT001',
        materialName: 'Cement',
        quantity: 1.2,
        wastagePercentage: 5,
        effectiveQuantity: 12.6,
        rate: 100,
        cost: 1260,
      });
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: new Error('Database error'),
            })),
          })),
        })),
      }));

      await expect(
        service.calculateItemCost('item-1', 'project-1', 10)
      ).rejects.toThrow('Database error');
    });
  });

  describe('calculateBulkItemCosts', () => {
    it('should calculate costs for multiple items', async () => {
      // Mock simplified responses
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'library_items') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'item-1', code: 'TEST', name: 'Test Item', unit: 'unit' },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        };
      });

      const items = [
        { libraryItemId: 'item-1', quantity: 10 },
        { libraryItemId: 'item-2', quantity: 20 },
      ];

      const results = await service.calculateBulkItemCosts(items, 'project-1');

      expect(results).toHaveLength(2);
      expect(results[0].quantity).toBe(10);
      expect(results[1].quantity).toBe(20);
    });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FactorCalculatorService.getInstance();
      const instance2 = FactorCalculatorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});