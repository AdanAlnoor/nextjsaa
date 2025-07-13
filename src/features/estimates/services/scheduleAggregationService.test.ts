import { ScheduleAggregationService } from './scheduleAggregationService';
import { createClient } from '@/utils/supabase/server';

// Mock Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('ScheduleAggregationService', () => {
  let service: ScheduleAggregationService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = ScheduleAggregationService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMaterialSchedule', () => {
    it('should aggregate materials from schedule view', async () => {
      const mockMaterialData = [
        {
          material_id: 'mat-1',
          material_code: 'MAT001',
          material_name: 'Cement',
          unit: 'bag',
          total_quantity: 100,
          base_quantity: 95,
          average_wastage: 5,
          rate: 10,
          total_cost: 1000,
          element_name: 'Foundation',
          element_code: 'FND001',
          quantity: 50,
          wastage_applied: 5
        },
        {
          material_id: 'mat-1',
          material_code: 'MAT001',
          material_name: 'Cement',
          unit: 'bag',
          total_quantity: 50,
          base_quantity: 47.5,
          average_wastage: 5,
          rate: 10,
          total_cost: 500,
          element_name: 'Columns',
          element_code: 'COL001',
          quantity: 25,
          wastage_applied: 5
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockMaterialData,
            error: null,
          })),
        })),
      });

      const result = await service.getMaterialSchedule('project-1');

      expect(result).toHaveLength(1); // Aggregated into one material
      expect(result[0]).toMatchObject({
        materialId: 'mat-1',
        materialCode: 'MAT001',
        materialName: 'Cement',
        unit: 'bag',
        totalQuantity: 150,
        rate: 10,
        totalCost: 1500,
        sources: expect.arrayContaining([
          expect.objectContaining({ elementName: 'Foundation' }),
          expect.objectContaining({ elementName: 'Columns' })
        ])
      });
    });

    it('should handle empty results', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      });

      const result = await service.getMaterialSchedule('project-1');
      expect(result).toEqual([]);
    });
  });

  describe('getLabourSchedule', () => {
    it('should aggregate labour from schedule view', async () => {
      const mockLabourData = [
        {
          labor_id: 'lab-1',
          labor_code: 'LAB001',
          labor_name: 'Mason',
          trade_type: 'Masonry',
          total_hours: 80,
          base_hours: 72,
          average_productivity: 1.1,
          hourly_rate: 25,
          total_cost: 2000,
          suggested_crew_size: 4,
          element_name: 'Walls',
          element_code: 'WAL001',
          hours: 40,
          productivity_applied: 1.1
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockLabourData,
            error: null,
          })),
        })),
      });

      const result = await service.getLabourSchedule('project-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        labourId: 'lab-1',
        labourCode: 'LAB001',
        labourName: 'Mason',
        tradeType: 'Masonry',
        totalHours: 80,
        hourlyRate: 25,
        totalCost: 2000,
        crewSize: 4
      });
    });
  });

  describe('getEquipmentSchedule', () => {
    it('should aggregate equipment from schedule view', async () => {
      const mockEquipmentData = [
        {
          equipment_id: 'eq-1',
          equipment_code: 'EQ001',
          equipment_name: 'Concrete Mixer',
          equipment_type: 'Mixing Equipment',
          total_hours: 40,
          base_hours: 35,
          average_utilization: 1.14,
          hourly_rate: 50,
          total_cost: 2000,
          element_name: 'Foundation',
          element_code: 'FND001',
          hours: 20,
          utilization_applied: 1.14
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockEquipmentData,
            error: null,
          })),
        })),
      });

      const result = await service.getEquipmentSchedule('project-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        equipmentId: 'eq-1',
        equipmentCode: 'EQ001',
        equipmentName: 'Concrete Mixer',
        equipmentType: 'Mixing Equipment',
        totalHours: 40,
        hourlyRate: 50,
        totalCost: 2000
      });
    });
  });

  describe('getScheduleSummary', () => {
    it('should return complete schedule summary', async () => {
      // Mock all schedule types
      mockSupabase.from.mockImplementation((table: string) => {
        const data = table === 'material_schedule' 
          ? [{ material_id: 'mat-1', total_cost: 1000 }]
          : table === 'labour_schedule'
          ? [{ labor_id: 'lab-1', total_cost: 2000, total_hours: 80 }]
          : [{ equipment_id: 'eq-1', total_cost: 3000, total_hours: 40 }];

        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data,
              error: null,
            })),
          })),
        };
      });

      const result = await service.getScheduleSummary('project-1');

      expect(result).toMatchObject({
        materials: {
          totalItems: 1,
          totalCost: 1000
        },
        labour: {
          totalItems: 1,
          totalCost: 2000,
          totalHours: 80
        },
        equipment: {
          totalItems: 1,
          totalCost: 3000,
          totalHours: 40
        },
        grandTotal: 6000
      });
    });
  });

  describe('exportSchedule', () => {
    it('should export to CSV format', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              material_id: 'mat-1',
              material_code: 'MAT001',
              material_name: 'Cement',
              unit: 'bag',
              total_quantity: 100,
              average_wastage: 5,
              rate: 10,
              total_cost: 1000
            }],
            error: null,
          })),
        })),
      });

      const blob = await service.exportSchedule('project-1', 'csv', 'material');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        service.exportSchedule('project-1', 'invalid' as any, 'all')
      ).rejects.toThrow('Unsupported export format: invalid');
    });
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ScheduleAggregationService.getInstance();
      const instance2 = ScheduleAggregationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});