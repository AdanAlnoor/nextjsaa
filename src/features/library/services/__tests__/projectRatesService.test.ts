/**
 * Unit Tests for ProjectRatesService
 * Phase 1: Project-Specific Pricing Services
 */

import { ProjectRatesService } from '../projectRatesService';
import { ProjectRates, RateImportOptions } from '../../types/rates';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
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

describe('ProjectRatesService', () => {
  let service: ProjectRatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = ProjectRatesService.getInstance();
  });

  describe('getCurrentRates', () => {
    it('should return current rates for a project', async () => {
      const mockRateData = {
        id: 'rate-1',
        project_id: 'project-123',
        materials: { 'CONC-C25': 150.00, 'STEEL-REBAR': 1200.00 },
        labour: { 'MASON': 45.00 },
        equipment: { 'CRANE': 250.00 },
        effective_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.maybeSingle.mockResolvedValue({ 
        data: mockRateData, 
        error: null 
      });

      const result = await service.getCurrentRates('project-123');

      expect(result).toEqual({
        id: 'rate-1',
        projectId: 'project-123',
        materials: { 'CONC-C25': 150.00, 'STEEL-REBAR': 1200.00 },
        labour: { 'MASON': 45.00 },
        equipment: { 'CRANE': 250.00 },
        effectiveDate: new Date('2024-01-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        createdBy: undefined
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('project_rates');
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'project-123');
    });

    it('should return empty rates if none exist', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const result = await service.getCurrentRates('project-456');

      expect(result).toEqual({
        projectId: 'project-456',
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: expect.any(Date)
      });
    });
  });

  describe('setProjectRates', () => {
    it('should create new project rates', async () => {
      const mockInsertedData = {
        id: 'rate-2',
        project_id: 'project-123',
        materials: { 'CONC-C25': 175.00 },
        labour: {},
        equipment: {},
        effective_date: '2024-02-01T00:00:00Z',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        created_by: 'test-user-id'
      };

      // Mock validation to pass
      service['validateRates'] = jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      mockSupabase.single.mockResolvedValue({ 
        data: mockInsertedData, 
        error: null 
      });

      const newRates: Partial<ProjectRates> = {
        materials: { 'CONC-C25': 175.00 },
        effectiveDate: new Date('2024-02-01T00:00:00Z')
      };

      const result = await service.setProjectRates('project-123', newRates);

      expect(result.projectId).toBe('project-123');
      expect(result.materials['CONC-C25']).toBe(175.00);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should throw error if validation fails', async () => {
      service['validateRates'] = jest.fn().mockResolvedValue({
        isValid: false,
        errors: [{ itemCode: 'INVALID', category: 'materials', message: 'Invalid rate' }],
        warnings: []
      });

      const newRates: Partial<ProjectRates> = {
        materials: { 'INVALID': -100 } // Invalid negative rate
      };

      await expect(
        service.setProjectRates('project-123', newRates)
      ).rejects.toThrow('Rate validation failed');
    });
  });

  describe('updateRateOverride', () => {
    it('should update a specific rate', async () => {
      // Mock getCurrentRates
      const currentRates: ProjectRates = {
        projectId: 'project-123',
        materials: { 'CONC-C25': 150.00 },
        labour: {},
        equipment: {},
        effectiveDate: new Date()
      };

      jest.spyOn(service, 'getCurrentRates').mockResolvedValue(currentRates);
      jest.spyOn(service, 'setProjectRates').mockResolvedValue({
        ...currentRates,
        materials: { 'CONC-C25': 175.00 }
      });

      await service.updateRateOverride(
        'project-123',
        'materials',
        'CONC-C25',
        175.00,
        'Price increase'
      );

      expect(service.setProjectRates).toHaveBeenCalledWith(
        'project-123',
        expect.objectContaining({
          materials: { 'CONC-C25': 175.00 }
        })
      );
    });
  });

  describe('importRatesFromProject', () => {
    it('should import rates from source project', async () => {
      const sourceRates: ProjectRates = {
        projectId: 'source-project',
        materials: { 'CONC-C25': 160.00, 'STEEL-REBAR': 1100.00 },
        labour: { 'MASON': 50.00 },
        equipment: {},
        effectiveDate: new Date()
      };

      const targetRates: ProjectRates = {
        projectId: 'target-project',
        materials: { 'CONC-C25': 150.00 }, // Existing rate that will be overwritten
        labour: {},
        equipment: {},
        effectiveDate: new Date()
      };

      jest.spyOn(service, 'getCurrentRates')
        .mockResolvedValueOnce(sourceRates)  // First call for source
        .mockResolvedValueOnce(targetRates); // Second call for target

      jest.spyOn(service, 'setProjectRates').mockResolvedValue({
        ...targetRates,
        materials: { 'CONC-C25': 160.00, 'STEEL-REBAR': 1100.00 },
        labour: { 'MASON': 50.00 }
      });

      const options: RateImportOptions = {
        sourceProjectId: 'source-project',
        targetProjectId: 'target-project',
        categories: ['materials', 'labour'],
        conflictResolution: 'overwrite'
      };

      const result = await service.importRatesFromProject(options);

      expect(result.imported).toBe(3); // 2 materials + 1 labour
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.details.materials).toBe(2);
      expect(result.details.labour).toBe(1);
    });

    it('should skip conflicting rates when resolution is skip', async () => {
      const sourceRates: ProjectRates = {
        projectId: 'source-project',
        materials: { 'CONC-C25': 160.00 },
        labour: {},
        equipment: {},
        effectiveDate: new Date()
      };

      const targetRates: ProjectRates = {
        projectId: 'target-project',
        materials: { 'CONC-C25': 150.00 }, // Existing rate
        labour: {},
        equipment: {},
        effectiveDate: new Date()
      };

      jest.spyOn(service, 'getCurrentRates')
        .mockResolvedValueOnce(sourceRates)
        .mockResolvedValueOnce(targetRates);

      jest.spyOn(service, 'setProjectRates').mockResolvedValue(targetRates);

      const options: RateImportOptions = {
        sourceProjectId: 'source-project',
        targetProjectId: 'target-project',
        categories: ['materials'],
        conflictResolution: 'skip'
      };

      const result = await service.importRatesFromProject(options);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('getRateHistory', () => {
    it('should return rate history for a project', async () => {
      const mockHistoryData = [
        {
          id: 'history-1',
          project_id: 'project-123',
          materials: { 'CONC-C25': 175.00 },
          labour: {},
          equipment: {},
          effective_date: '2024-02-01T00:00:00Z',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
          created_by: 'user-1'
        },
        {
          id: 'history-2',
          project_id: 'project-123',
          materials: { 'CONC-C25': 150.00 },
          labour: {},
          equipment: {},
          effective_date: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1'
        }
      ];

      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockReturnValue(mockSupabase);
      const query = mockSupabase;
      query.mockResolvedValue({ data: mockHistoryData, error: null });

      const result = await service.getRateHistory('project-123');

      expect(result).toHaveLength(2);
      expect(result[0].projectId).toBe('project-123');
      expect(result[0].changesSummary?.materialsChanged).toBe(1);
      expect(result[0].changesSummary?.totalChanges).toBe(1);
    });
  });

  describe('getEffectiveRate', () => {
    it('should return project rate when available', async () => {
      const projectRates: ProjectRates = {
        projectId: 'project-123',
        materials: { 'CONC-C25': 175.00 },
        labour: {},
        equipment: {},
        effectiveDate: new Date('2024-01-01')
      };

      jest.spyOn(service, 'getCurrentRates').mockResolvedValue(projectRates);
      service['getCatalogRate'] = jest.fn().mockResolvedValue(150.00);

      const result = await service.getEffectiveRate(
        'project-123',
        'materials',
        'CONC-C25'
      );

      expect(result.rate).toBe(175.00);
      expect(result.source).toBe('project');
      expect(result.projectRate).toBe(175.00);
      expect(result.catalogRate).toBe(150.00);
    });

    it('should fall back to catalog rate when no project rate exists', async () => {
      const projectRates: ProjectRates = {
        projectId: 'project-123',
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: new Date('2024-01-01')
      };

      jest.spyOn(service, 'getCurrentRates').mockResolvedValue(projectRates);
      service['getCatalogRate'] = jest.fn().mockResolvedValue(150.00);

      const result = await service.getEffectiveRate(
        'project-123',
        'materials',
        'CONC-C25'
      );

      expect(result.rate).toBe(150.00);
      expect(result.source).toBe('catalog');
      expect(result.projectRate).toBeUndefined();
      expect(result.catalogRate).toBe(150.00);
    });
  });
});