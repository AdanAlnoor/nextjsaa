/**
 * Unit Tests for FactorCalculatorService
 * Phase 5: Testing Infrastructure
 */

import { FactorCalculatorService } from '../factorCalculatorService';
import { ProjectRatesService } from '@/features/library/services/projectRatesService';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  createLibraryItemWithFactors, 
  createProjectRates,
  createRealisticLibraryItem 
} from '@/test/factories/libraryFactory';

jest.mock('@/shared/lib/supabase/client');
jest.mock('@/features/library/services/projectRatesService');

describe('FactorCalculatorService', () => {
  let service: FactorCalculatorService;
  let mockSupabase: any;
  let mockProjectRatesService: jest.Mocked<ProjectRatesService>;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };

    mockProjectRatesService = {
      getCurrentRates: jest.fn(),
    } as any;

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (ProjectRatesService.getInstance as jest.Mock).mockReturnValue(mockProjectRatesService);

    service = FactorCalculatorService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateItemCost', () => {
    it('should calculate total cost for a library item with all factor types', async () => {
      const libraryItem = createRealisticLibraryItem('concrete');
      const projectRates = createProjectRates({
        materials: {
          'CEMENT': 0.15,
          'SAND': 0.05,
          'GRAVEL': 0.03,
          'WATER': 0.001,
        },
        labour: {
          'MASON': 40,
          'HELPER': 20,
        },
        equipment: {
          'MIXER': 50,
        },
      });

      // Mock library item retrieval
      mockSupabase.single.mockResolvedValueOnce({
        data: libraryItem,
        error: null
      });

      // Mock project rates
      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      // Mock material factors
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            material_catalogue_id: 'CEMENT',
            material_code: 'CEMENT',
            material_name: 'Portland Cement',
            quantity_per_unit: 300,
            wastage_percentage: 5,
            unit: 'kg',
            material: { code: 'CEMENT', name: 'Portland Cement', rate: 0.15 }
          },
          {
            material_catalogue_id: 'SAND',
            material_code: 'SAND',
            material_name: 'Fine Sand',
            quantity_per_unit: 500,
            wastage_percentage: 10,
            unit: 'kg',
            material: { code: 'SAND', name: 'Fine Sand', rate: 0.05 }
          }
        ],
        error: null
      });

      // Mock labour factors
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            labor_catalogue_id: 'MASON',
            labor_code: 'MASON',
            labor_name: 'Mason',
            hours_per_unit: 2,
            labor: { code: 'MASON', name: 'Mason', rate: 40 }
          }
        ],
        error: null
      });

      // Mock equipment factors
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            equipment_catalogue_id: 'MIXER',
            equipment_code: 'MIXER',
            equipment_name: 'Concrete Mixer',
            hours_per_unit: 0.5,
            equipment: { code: 'MIXER', name: 'Concrete Mixer', rate: 50 }
          }
        ],
        error: null
      });

      const result = await service.calculateItemCost(libraryItem.id, projectRates.projectId, 10);

      expect(result.libraryItemId).toBe(libraryItem.id);
      expect(result.quantity).toBe(10);
      expect(result.unit).toBe(libraryItem.unit);

      // Material costs: (300 * 1.05 + 500 * 1.1) * 10 * rates
      expect(result.materials.total).toBeGreaterThan(0);
      expect(result.materials.factors).toHaveLength(2);

      // Labour costs: 2 hours * 10 * $40
      expect(result.labour.total).toBe(800);
      expect(result.labour.factors).toHaveLength(1);

      // Equipment costs: 0.5 hours * 10 * $50
      expect(result.equipment.total).toBe(250);
      expect(result.equipment.factors).toHaveLength(1);

      expect(result.totalCost).toBeGreaterThan(1000);
      expect(result.ratePerUnit).toBe(result.totalCost / 10);
    });

    it('should handle missing library item', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Library item not found' }
      });

      await expect(service.calculateItemCost('non-existent', 'project-1', 1))
        .rejects.toEqual({ message: 'Library item not found' });
    });

    it('should handle missing project rates gracefully', async () => {
      const libraryItem = createRealisticLibraryItem('concrete');

      mockSupabase.single.mockResolvedValue({
        data: libraryItem,
        error: null
      });

      mockProjectRatesService.getCurrentRates.mockRejectedValue(
        new Error('Project rates not found')
      );

      // Mock empty factors
      mockSupabase.select
        .mockResolvedValueOnce({ data: [], error: null }) // materials
        .mockResolvedValueOnce({ data: [], error: null }) // labour
        .mockResolvedValueOnce({ data: [], error: null }); // equipment

      const result = await service.calculateItemCost(libraryItem.id, 'project-1', 1);

      expect(result.totalCost).toBe(0);
      expect(result.materials.total).toBe(0);
      expect(result.labour.total).toBe(0);
      expect(result.equipment.total).toBe(0);
    });
  });

  describe('material cost calculations', () => {
    it('should apply wastage factors correctly', async () => {
      const projectRates = createProjectRates({
        materials: { 'CEMENT': 100 }
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      // Mock material factor with 10% wastage
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            material_catalogue_id: 'CEMENT',
            quantity_per_unit: 1,
            wastage_percentage: 10,
            unit: 'kg',
            material: { rate: 100 }
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateMaterialCost(
        'item-1', 
        10, 
        projectRates
      );

      // Expected: 10 * 1 * 1.1 * 100 = 1100
      expect(result.total).toBe(1100);
      expect(result.factors[0].effectiveQuantity).toBe(11); // 10 * 1 * 1.1
      expect(result.factors[0].wastagePercentage).toBe(10);
    });

    it('should use project rates over default rates', async () => {
      const projectRates = createProjectRates({
        materials: { 'CEMENT': 150 } // Higher project rate
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            material_catalogue_id: 'CEMENT',
            quantity_per_unit: 1,
            wastage_percentage: 0,
            material: { rate: 100 } // Lower default rate
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateMaterialCost(
        'item-1', 
        1, 
        projectRates
      );

      expect(result.factors[0].rate).toBe(150); // Should use project rate
      expect(result.total).toBe(150);
    });

    it('should handle materials with zero quantities', async () => {
      const projectRates = createProjectRates({
        materials: { 'CEMENT': 100 }
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            material_catalogue_id: 'CEMENT',
            quantity_per_unit: 0,
            wastage_percentage: 5,
            material: { rate: 100 }
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateMaterialCost(
        'item-1', 
        10, 
        projectRates
      );

      expect(result.total).toBe(0);
      expect(result.factors[0].effectiveQuantity).toBe(0);
    });
  });

  describe('labour cost calculations', () => {
    it('should calculate labour costs correctly', async () => {
      const projectRates = createProjectRates({
        labour: { 'MASON': 45 }
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            labor_catalogue_id: 'MASON',
            labor_code: 'MASON',
            labor_name: 'Mason',
            hours_per_unit: 2.5,
            labor: { rate: 40 } // Default rate
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateLabourCost(
        'item-1', 
        8, 
        projectRates
      );

      // Expected: 8 * 2.5 * 45 = 900
      expect(result.total).toBe(900);
      expect(result.factors[0].hours).toBe(2.5);
      expect(result.factors[0].effectiveHours).toBe(20); // 8 * 2.5
      expect(result.factors[0].rate).toBe(45); // Project rate
    });

    it('should handle multiple labour types', async () => {
      const projectRates = createProjectRates({
        labour: { 
          'MASON': 45,
          'HELPER': 25 
        }
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            labor_catalogue_id: 'MASON',
            hours_per_unit: 2,
            labor: { rate: 40 }
          },
          {
            labor_catalogue_id: 'HELPER',
            hours_per_unit: 1,
            labor: { rate: 20 }
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateLabourCost(
        'item-1', 
        5, 
        projectRates
      );

      // Expected: (5 * 2 * 45) + (5 * 1 * 25) = 450 + 125 = 575
      expect(result.total).toBe(575);
      expect(result.factors).toHaveLength(2);
    });
  });

  describe('equipment cost calculations', () => {
    it('should calculate equipment costs correctly', async () => {
      const projectRates = createProjectRates({
        equipment: { 'MIXER': 75 }
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            equipment_catalogue_id: 'MIXER',
            equipment_code: 'MIXER',
            equipment_name: 'Concrete Mixer',
            hours_per_unit: 0.25,
            equipment: { rate: 50 }
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateEquipmentCost(
        'item-1', 
        20, 
        projectRates
      );

      // Expected: 20 * 0.25 * 75 = 375
      expect(result.total).toBe(375);
      expect(result.factors[0].hours).toBe(0.25);
      expect(result.factors[0].effectiveHours).toBe(5); // 20 * 0.25
      expect(result.factors[0].rate).toBe(75);
    });

    it('should handle equipment with zero hours', async () => {
      const projectRates = createProjectRates({
        equipment: { 'MIXER': 75 }
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select.mockResolvedValue({
        data: [
          {
            equipment_catalogue_id: 'MIXER',
            hours_per_unit: 0,
            equipment: { rate: 75 }
          }
        ],
        error: null
      });

      const service_private = service as any;
      const result = await service_private.calculateEquipmentCost(
        'item-1', 
        10, 
        projectRates
      );

      expect(result.total).toBe(0);
      expect(result.factors[0].effectiveHours).toBe(0);
    });
  });

  describe('bulk calculations', () => {
    it('should calculate costs for multiple items', async () => {
      const items = [
        { libraryItemId: 'item-1', quantity: 5 },
        { libraryItemId: 'item-2', quantity: 10 },
        { libraryItemId: 'item-3', quantity: 2 }
      ];

      // Mock individual calculations
      jest.spyOn(service, 'calculateItemCost')
        .mockResolvedValueOnce({
          libraryItemId: 'item-1',
          totalCost: 500,
          quantity: 5,
          ratePerUnit: 100
        } as any)
        .mockResolvedValueOnce({
          libraryItemId: 'item-2',
          totalCost: 1500,
          quantity: 10,
          ratePerUnit: 150
        } as any)
        .mockResolvedValueOnce({
          libraryItemId: 'item-3',
          totalCost: 300,
          quantity: 2,
          ratePerUnit: 150
        } as any);

      const results = await service.calculateBulkItemCosts(items, 'project-1');

      expect(results).toHaveLength(3);
      expect(results[0].totalCost).toBe(500);
      expect(results[1].totalCost).toBe(1500);
      expect(results[2].totalCost).toBe(300);
    });

    it('should handle errors in bulk calculations gracefully', async () => {
      const items = [
        { libraryItemId: 'item-1', quantity: 5 },
        { libraryItemId: 'invalid', quantity: 10 }
      ];

      jest.spyOn(service, 'calculateItemCost')
        .mockResolvedValueOnce({
          libraryItemId: 'item-1',
          totalCost: 500
        } as any)
        .mockRejectedValueOnce(new Error('Item not found'));

      await expect(service.calculateBulkItemCosts(items, 'project-1'))
        .rejects.toThrow('Item not found');
    });
  });

  describe('performance', () => {
    it('should calculate costs for large batches efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        libraryItemId: `item-${i}`,
        quantity: Math.floor(Math.random() * 10) + 1
      }));

      // Mock fast calculations
      jest.spyOn(service, 'calculateItemCost').mockImplementation(
        async (id, projectId, quantity) => ({
          libraryItemId: id,
          totalCost: quantity * 100,
          quantity,
          ratePerUnit: 100
        } as any)
      );

      const start = performance.now();
      const results = await service.calculateBulkItemCosts(items, 'project-1');
      const duration = performance.now() - start;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('edge cases', () => {
    it('should handle missing factor data gracefully', async () => {
      const libraryItem = createRealisticLibraryItem('concrete');
      const projectRates = createProjectRates();

      mockSupabase.single.mockResolvedValue({
        data: libraryItem,
        error: null
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      // Mock database errors for factors
      mockSupabase.select
        .mockResolvedValueOnce({ data: null, error: { message: 'Table not found' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Table not found' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Table not found' } });

      const result = await service.calculateItemCost(libraryItem.id, 'project-1', 1);

      expect(result.totalCost).toBe(0);
      expect(result.materials.total).toBe(0);
      expect(result.labour.total).toBe(0);
      expect(result.equipment.total).toBe(0);
    });

    it('should handle very large quantities', async () => {
      const libraryItem = createRealisticLibraryItem('concrete');
      const projectRates = createProjectRates({
        materials: { 'CEMENT': 0.15 }
      });

      mockSupabase.single.mockResolvedValue({
        data: libraryItem,
        error: null
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(projectRates);

      mockSupabase.select
        .mockResolvedValueOnce({
          data: [{
            material_catalogue_id: 'CEMENT',
            quantity_per_unit: 1,
            wastage_percentage: 0,
            material: { rate: 0.15 }
          }],
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const largeQuantity = 1000000;
      const result = await service.calculateItemCost(
        libraryItem.id, 
        'project-1', 
        largeQuantity
      );

      expect(result.quantity).toBe(largeQuantity);
      expect(result.totalCost).toBe(largeQuantity * 0.15);
      expect(result.ratePerUnit).toBe(0.15);
    });

    it('should handle zero quantity', async () => {
      const libraryItem = createRealisticLibraryItem('concrete');

      mockSupabase.single.mockResolvedValue({
        data: libraryItem,
        error: null
      });

      mockProjectRatesService.getCurrentRates.mockResolvedValue(createProjectRates());

      mockSupabase.select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await service.calculateItemCost(libraryItem.id, 'project-1', 0);

      expect(result.quantity).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(isNaN(result.ratePerUnit)).toBe(true); // Division by zero
    });
  });

  describe('preview calculations', () => {
    it('should provide preview without saving data', async () => {
      const libraryItem = createRealisticLibraryItem('steel');

      jest.spyOn(service, 'calculateItemCost').mockResolvedValue({
        libraryItemId: libraryItem.id,
        totalCost: 1200,
        quantity: 1,
        ratePerUnit: 1200
      } as any);

      const preview = await service.previewCalculation(libraryItem.id, 'project-1', 1);

      expect(preview.libraryItemId).toBe(libraryItem.id);
      expect(preview.totalCost).toBe(1200);
      expect(service.calculateItemCost).toHaveBeenCalledWith(
        libraryItem.id, 
        'project-1', 
        1
      );
    });
  });
});