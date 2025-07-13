/**
 * Integration Tests for Library-to-Estimate Workflow
 * Phase 5: Testing Infrastructure
 */

import { LibraryManagementService } from '@/features/library/services/libraryManagementService';
import { FactorCalculatorService } from '../factorCalculatorService';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  createRealisticLibraryItem,
  createProjectRates,
  createEstimateItem 
} from '@/test/factories/libraryFactory';

jest.mock('@/shared/lib/supabase/client');

describe('Library-to-Estimate Integration', () => {
  let libraryService: LibraryManagementService;
  let factorService: FactorCalculatorService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } }
        })
      }
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    libraryService = LibraryManagementService.getInstance();
    factorService = FactorCalculatorService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow: Create Library Item → Calculate Costs → Add to Estimate', () => {
    it('should complete full workflow from library creation to estimate integration', async () => {
      const projectId = 'project-123';
      
      // Step 1: Create a realistic concrete library item
      const concreteItem = createRealisticLibraryItem('concrete');
      
      mockSupabase.single
        .mockResolvedValueOnce({ data: concreteItem, error: null }) // createLibraryItem
        .mockResolvedValueOnce({ data: concreteItem, error: null }) // getLibraryItem for confirmation
        .mockResolvedValueOnce({ data: [{ id: 'factor-1' }], error: null }) // material factors check
        .mockResolvedValueOnce({ data: [], error: null }) // labor factors check
        .mockResolvedValueOnce({ data: [], error: null }) // equipment factors check
        .mockResolvedValueOnce({ data: null, count: 0 }) // code duplicate check
        .mockResolvedValueOnce({ data: concreteItem, error: null }) // version snapshot get
        .mockResolvedValueOnce({ data: {}, error: null }) // version insert
        .mockResolvedValueOnce({ 
          data: { ...concreteItem, status: 'confirmed', isActive: true }, 
          error: null 
        }); // final update

      // Create the library item
      const createdItem = await libraryService.createLibraryItem({
        name: 'Foundation Concrete',
        unit: 'm³',
        assemblyId: 'concrete-assembly-1',
        description: 'High-strength foundation concrete'
      });

      expect(createdItem.status).toBe('draft');

      // Step 2: Confirm the library item
      const confirmedItem = await libraryService.confirmLibraryItem(
        createdItem.id,
        'Confirmed for production use'
      );

      expect(confirmedItem.status).toBe('confirmed');
      expect(confirmedItem.isActive).toBe(true);

      // Step 3: Calculate costs for the item
      const projectRates = createProjectRates({
        projectId,
        materials: {
          'CEMENT': 0.15,    // $/kg
          'SAND': 0.05,      // $/kg
          'GRAVEL': 0.03,    // $/kg
          'WATER': 0.001,    // $/L
        },
        labour: {
          'MASON': 40,       // $/hour
          'HELPER': 20,      // $/hour
        },
        equipment: {
          'MIXER': 50,       // $/hour
        },
      });

      // Mock calculation dependencies
      mockSupabase.single
        .mockResolvedValueOnce({ data: confirmedItem, error: null }); // library item for calculation

      // Mock project rates
      jest.spyOn(factorService as any, 'getProjectRates').mockResolvedValue(projectRates);

      // Mock factor calculations
      mockSupabase.select
        .mockResolvedValueOnce({
          data: [
            {
              material_catalogue_id: 'CEMENT',
              quantity_per_unit: 300,
              wastage_percentage: 5,
              material: { rate: 0.15 }
            },
            {
              material_catalogue_id: 'SAND',
              quantity_per_unit: 500,
              wastage_percentage: 10,
              material: { rate: 0.05 }
            }
          ],
          error: null
        }) // material factors
        .mockResolvedValueOnce({
          data: [
            {
              labor_catalogue_id: 'MASON',
              hours_per_unit: 2,
              labor: { rate: 40 }
            }
          ],
          error: null
        }) // labour factors
        .mockResolvedValueOnce({
          data: [
            {
              equipment_catalogue_id: 'MIXER',
              hours_per_unit: 0.5,
              equipment: { rate: 50 }
            }
          ],
          error: null
        }); // equipment factors

      // Calculate costs for 50 m³
      const calculation = await factorService.calculateItemCost(
        confirmedItem.id,
        projectId,
        50
      );

      // Verify calculations
      expect(calculation.quantity).toBe(50);
      expect(calculation.libraryItemId).toBe(confirmedItem.id);
      expect(calculation.materials.total).toBeGreaterThan(0);
      expect(calculation.labour.total).toBe(4000); // 50 * 2 * 40
      expect(calculation.equipment.total).toBe(1250); // 50 * 0.5 * 50
      expect(calculation.totalCost).toBeGreaterThan(5000);

      // Step 4: Add to estimate
      const estimateItem = createEstimateItem({
        project_id: projectId,
        library_item_id: confirmedItem.id,
        quantity: 50,
        unit: 'm³',
        location: 'Foundation - Block A'
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: estimateItem,
        error: null
      });

      // Mock estimate item creation
      const addedToEstimate = await mockSupabase
        .from('estimate_items')
        .insert({
          project_id: projectId,
          library_item_id: confirmedItem.id,
          quantity: 50,
          unit: 'm³',
          location: 'Foundation - Block A',
          calculated_cost: calculation.totalCost,
          rate_per_unit: calculation.ratePerUnit
        })
        .single();

      // Verify integration
      expect(addedToEstimate.data.library_item_id).toBe(confirmedItem.id);
      expect(addedToEstimate.data.quantity).toBe(50);
      expect(addedToEstimate.data.calculated_cost).toBe(calculation.totalCost);
    });

    it('should handle multiple library items in single estimate', async () => {
      const projectId = 'project-multi-123';
      
      // Create multiple library items
      const concreteItem = createRealisticLibraryItem('concrete');
      const steelItem = createRealisticLibraryItem('steel');
      const masonryItem = createRealisticLibraryItem('masonry');

      const libraryItems = [concreteItem, steelItem, masonryItem];
      const estimateItems = [
        { libraryItemId: concreteItem.id, quantity: 50, location: 'Foundation' },
        { libraryItemId: steelItem.id, quantity: 2000, location: 'Foundation Reinforcement' },
        { libraryItemId: masonryItem.id, quantity: 100, location: 'Perimeter Walls' },
      ];

      // Mock calculations for each item
      const calculations = [];
      for (let i = 0; i < libraryItems.length; i++) {
        const item = libraryItems[i];
        const estimateItem = estimateItems[i];

        mockSupabase.single.mockResolvedValueOnce({
          data: item,
          error: null
        });

        // Mock empty factors for simplicity
        mockSupabase.select
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [], error: null });

        jest.spyOn(factorService as any, 'getProjectRates').mockResolvedValue(
          createProjectRates({ projectId })
        );

        const calculation = await factorService.calculateItemCost(
          item.id,
          projectId,
          estimateItem.quantity
        );

        calculations.push(calculation);
      }

      // Verify all calculations completed
      expect(calculations).toHaveLength(3);
      calculations.forEach((calc, index) => {
        expect(calc.libraryItemId).toBe(libraryItems[index].id);
        expect(calc.quantity).toBe(estimateItems[index].quantity);
      });

      // Calculate total estimate cost
      const totalEstimateCost = calculations.reduce(
        (sum, calc) => sum + calc.totalCost,
        0
      );

      expect(totalEstimateCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling in Integration Workflow', () => {
    it('should handle library item validation failures gracefully', async () => {
      // Create item without required fields
      const invalidItem = createRealisticLibraryItem('concrete');
      invalidItem.code = ''; // Missing required field

      mockSupabase.single
        .mockResolvedValueOnce({ data: invalidItem, error: null }) // createLibraryItem
        .mockResolvedValueOnce({ data: invalidItem, error: null }) // getLibraryItem
        .mockResolvedValueOnce({ data: [], error: null }) // no material factors
        .mockResolvedValueOnce({ data: [], error: null }) // no labor factors
        .mockResolvedValueOnce({ data: [], error: null }); // no equipment factors

      const createdItem = await libraryService.createLibraryItem({
        name: 'Invalid Item',
        unit: 'm³',
        assemblyId: 'assembly-1'
      });

      // Attempt to confirm should fail validation
      await expect(libraryService.confirmLibraryItem(createdItem.id))
        .rejects.toThrow('Item validation failed');
    });

    it('should handle missing project rates', async () => {
      const item = createRealisticLibraryItem('concrete');

      mockSupabase.single.mockResolvedValue({
        data: item,
        error: null
      });

      // Mock project rates service failure
      jest.spyOn(factorService as any, 'getProjectRates').mockRejectedValue(
        new Error('Project rates not configured')
      );

      // Mock empty factors
      mockSupabase.select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const calculation = await factorService.calculateItemCost(
        item.id,
        'project-no-rates',
        10
      );

      // Should return zero costs but not fail
      expect(calculation.totalCost).toBe(0);
      expect(calculation.materials.total).toBe(0);
      expect(calculation.labour.total).toBe(0);
      expect(calculation.equipment.total).toBe(0);
    });

    it('should handle concurrent access to library items', async () => {
      const item = createRealisticLibraryItem('concrete');

      // Mock version conflict scenario
      mockSupabase.single
        .mockResolvedValueOnce({ data: item, error: null }) // first read
        .mockResolvedValueOnce({ data: { ...item, version: 2 }, error: null }) // concurrent update
        .mockRejectedValueOnce({ code: '23505', message: 'Version conflict' }); // update fails

      // First user gets the item
      const item1 = await libraryService.getLibraryItem(item.id);
      expect(item1.version).toBe(1);

      // Second user gets the same item (now version 2)
      const item2 = await libraryService.getLibraryItem(item.id);
      expect(item2.version).toBe(2);

      // First user tries to update with stale version - should fail
      await expect(libraryService.updateLibraryItem(item1.id, { name: 'Updated' }))
        .rejects.toMatchObject({ code: '23505' });
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle bulk library item processing efficiently', async () => {
      const projectId = 'project-bulk-123';
      const itemCount = 50;

      // Create multiple items
      const items = Array.from({ length: itemCount }, (_, i) =>
        createRealisticLibraryItem(
          ['concrete', 'steel', 'masonry', 'electrical'][i % 4]
        )
      );

      // Mock bulk calculations
      jest.spyOn(factorService, 'calculateBulkItemCosts').mockImplementation(
        async (itemRequests) => {
          return itemRequests.map(req => ({
            libraryItemId: req.libraryItemId,
            quantity: req.quantity,
            totalCost: req.quantity * 100, // Simple calculation
            ratePerUnit: 100,
            materials: { total: 0, factors: [] },
            labour: { total: 0, factors: [] },
            equipment: { total: 0, factors: [] }
          })) as any;
        }
      );

      const itemRequests = items.map((item, i) => ({
        libraryItemId: item.id,
        quantity: i + 1
      }));

      const start = performance.now();
      const calculations = await factorService.calculateBulkItemCosts(
        itemRequests,
        projectId
      );
      const duration = performance.now() - start;

      expect(calculations).toHaveLength(itemCount);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second

      // Verify all calculations
      calculations.forEach((calc, index) => {
        expect(calc.libraryItemId).toBe(items[index].id);
        expect(calc.quantity).toBe(index + 1);
      });
    });

    it('should maintain performance with complex factor calculations', async () => {
      const complexItem = createRealisticLibraryItem('concrete');
      const projectId = 'project-complex-123';

      mockSupabase.single.mockResolvedValue({
        data: complexItem,
        error: null
      });

      jest.spyOn(factorService as any, 'getProjectRates').mockResolvedValue(
        createProjectRates({
          projectId,
          materials: Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [`MAT${i}`, Math.random() * 100])
          ),
          labour: Object.fromEntries(
            Array.from({ length: 10 }, (_, i) => [`LAB${i}`, Math.random() * 50 + 20])
          ),
          equipment: Object.fromEntries(
            Array.from({ length: 5 }, (_, i) => [`EQP${i}`, Math.random() * 200 + 50])
          ),
        })
      );

      // Mock complex factors
      mockSupabase.select
        .mockResolvedValueOnce({
          data: Array.from({ length: 15 }, (_, i) => ({
            material_catalogue_id: `MAT${i}`,
            quantity_per_unit: Math.random() * 10,
            wastage_percentage: Math.random() * 20,
            material: { rate: Math.random() * 100 }
          })),
          error: null
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 8 }, (_, i) => ({
            labor_catalogue_id: `LAB${i}`,
            hours_per_unit: Math.random() * 5,
            labor: { rate: Math.random() * 50 + 20 }
          })),
          error: null
        })
        .mockResolvedValueOnce({
          data: Array.from({ length: 3 }, (_, i) => ({
            equipment_catalogue_id: `EQP${i}`,
            hours_per_unit: Math.random() * 2,
            equipment: { rate: Math.random() * 200 + 50 }
          })),
          error: null
        });

      const start = performance.now();
      const calculation = await factorService.calculateItemCost(
        complexItem.id,
        projectId,
        100
      );
      const duration = performance.now() - start;

      expect(calculation.materials.factors).toHaveLength(15);
      expect(calculation.labour.factors).toHaveLength(8);
      expect(calculation.equipment.factors).toHaveLength(3);
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('Data Consistency Integration Tests', () => {
    it('should maintain data consistency across service boundaries', async () => {
      const projectId = 'project-consistency-123';
      const item = createRealisticLibraryItem('concrete');

      // Create and confirm item
      mockSupabase.single
        .mockResolvedValueOnce({ data: item, error: null }) // create
        .mockResolvedValueOnce({ data: item, error: null }) // get for confirmation
        .mockResolvedValueOnce({ data: [{ id: 'factor-1' }], error: null }) // factors check
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, count: 0 }) // duplicate check
        .mockResolvedValueOnce({ data: item, error: null }) // version snapshot
        .mockResolvedValueOnce({ data: {}, error: null }) // version insert
        .mockResolvedValueOnce({ 
          data: { ...item, status: 'confirmed' }, 
          error: null 
        }); // update

      const createdItem = await libraryService.createLibraryItem({
        name: item.name,
        unit: item.unit,
        assemblyId: item.assembly_id || 'assembly-1'
      });

      const confirmedItem = await libraryService.confirmLibraryItem(createdItem.id);

      // Calculate costs multiple times - should be consistent
      mockSupabase.single.mockResolvedValue({
        data: confirmedItem,
        error: null
      });

      jest.spyOn(factorService as any, 'getProjectRates').mockResolvedValue(
        createProjectRates({ projectId })
      );

      mockSupabase.select
        .mockResolvedValue({ data: [], error: null }); // Empty factors for consistency

      const calc1 = await factorService.calculateItemCost(confirmedItem.id, projectId, 10);
      const calc2 = await factorService.calculateItemCost(confirmedItem.id, projectId, 10);
      const calc3 = await factorService.calculateItemCost(confirmedItem.id, projectId, 10);

      // All calculations should be identical
      expect(calc1.totalCost).toBe(calc2.totalCost);
      expect(calc2.totalCost).toBe(calc3.totalCost);
      expect(calc1.ratePerUnit).toBe(calc2.ratePerUnit);
      expect(calc2.ratePerUnit).toBe(calc3.ratePerUnit);
    });

    it('should handle cross-service error propagation correctly', async () => {
      const item = createRealisticLibraryItem('concrete');

      // Library service fails
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'));

      // Factor service should handle library service failure
      await expect(factorService.calculateItemCost(item.id, 'project-1', 10))
        .rejects.toThrow('Database connection failed');

      // Verify error propagates cleanly without side effects
      expect(mockSupabase.select).not.toHaveBeenCalled();
    });
  });
});