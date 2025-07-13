import { createClient } from '@/shared/lib/supabase/client';
import {
  MaterialScheduleItem,
  LabourScheduleItem,
  EquipmentScheduleItem,
  ScheduleAggregationResult,
  ScheduleExportFormat,
  ScheduleSummary
} from '../types/scheduleTypes';
import { CacheManager, cacheKeys } from '../utils/cache';

export class ScheduleAggregationService {
  private static instance: ScheduleAggregationService;
  private supabase: any;
  private cache: CacheManager;

  private constructor() {
    this.supabase = createClient();
    this.cache = CacheManager.getInstance();
  }

  static getInstance(): ScheduleAggregationService {
    if (!this.instance) {
      this.instance = new ScheduleAggregationService();
    }
    return this.instance;
  }

  /**
   * Get aggregated material schedule for a project
   */
  async getMaterialSchedule(
    projectId: string,
    structureId?: string
  ): Promise<MaterialScheduleItem[]> {
    try {
      // Check cache first
      const cacheKey = cacheKeys.projectSchedules(projectId, `materials:${structureId || 'all'}`);
      const cached = this.cache.get<MaterialScheduleItem[]>(cacheKey);
      if (cached) return cached;

      // Use the estimate_material_schedule view created in migrations
      let query = this.supabase
        .from('estimate_material_schedule')
        .select('*')
        .eq('project_id', projectId);

      const { data, error } = await query;

      if (error) throw error;

      // Return data directly from view - it already has the correct structure
      const materials: MaterialScheduleItem[] = data || [];
      
      // Cache the result
      this.cache.set(cacheKey, materials, 3 * 60 * 1000); // 3 minutes TTL
      
      return materials;
    } catch (error) {
      console.error('Error getting material schedule:', error);
      return [];
    }
  }

  /**
   * Get aggregated labour schedule for a project
   */
  async getLabourSchedule(
    projectId: string,
    structureId?: string
  ): Promise<LabourScheduleItem[]> {
    try {
      // Check cache first
      const cacheKey = cacheKeys.projectSchedules(projectId, `labour:${structureId || 'all'}`);
      const cached = this.cache.get<LabourScheduleItem[]>(cacheKey);
      if (cached) return cached;

      // Use the estimate_labour_schedule view created in migrations
      let query = this.supabase
        .from('estimate_labour_schedule')
        .select('*')
        .eq('project_id', projectId);

      const { data, error } = await query;

      if (error) throw error;

      // Return data directly from view - it already has the correct structure
      const labour: LabourScheduleItem[] = data || [];
      
      // Cache the result
      this.cache.set(cacheKey, labour, 3 * 60 * 1000);
      
      return labour;
    } catch (error) {
      console.error('Error getting labour schedule:', error);
      return [];
    }
  }

  /**
   * Get aggregated equipment schedule for a project
   */
  async getEquipmentSchedule(
    projectId: string,
    structureId?: string
  ): Promise<EquipmentScheduleItem[]> {
    try {
      // Check cache first
      const cacheKey = cacheKeys.projectSchedules(projectId, `equipment:${structureId || 'all'}`);
      const cached = this.cache.get<EquipmentScheduleItem[]>(cacheKey);
      if (cached) return cached;

      // Use the estimate_equipment_schedule view created in migrations
      let query = this.supabase
        .from('estimate_equipment_schedule')
        .select('*')
        .eq('project_id', projectId);

      const { data, error } = await query;

      if (error) throw error;

      // Return data directly from view - it already has the correct structure
      const equipment: EquipmentScheduleItem[] = data || [];
      
      // Cache the result
      this.cache.set(cacheKey, equipment, 3 * 60 * 1000);
      
      return equipment;
    } catch (error) {
      console.error('Error getting equipment schedule:', error);
      return [];
    }
  }

  /**
   * Get complete schedule summary for a project
   */
  async getScheduleSummary(
    projectId: string,
    structureId?: string
  ): Promise<ScheduleSummary> {
    const [materials, labour, equipment] = await Promise.all([
      this.getMaterialSchedule(projectId, structureId),
      this.getLabourSchedule(projectId, structureId),
      this.getEquipmentSchedule(projectId, structureId)
    ]);

    // Calculate totals
    const materialTotal = materials.reduce((sum, item) => sum + (item.total_amount_market || 0), 0);
    const labourTotal = labour.reduce((sum, item) => sum + (item.total_amount_standard || 0), 0);
    const equipmentTotal = equipment.reduce((sum, item) => sum + (item.total_amount_rental || 0), 0);

    return {
      materials: {
        totalItems: materials.length,
        totalCost: materialTotal,
        byCategory: materials.reduce((acc, item) => {
          const category = item.material_category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = { items: 0, cost: 0 };
          }
          acc[category].items++;
          acc[category].cost += item.total_amount_market || 0;
          return acc;
        }, {} as Record<string, { items: number; cost: number }>)
      },
      labour: {
        totalHours: labour.reduce((sum, item) => sum + (item.adjusted_hours || 0), 0),
        totalDays: labour.reduce((sum, item) => sum + (item.total_days || 0), 0),
        totalCost: labourTotal,
        byTrade: labour.reduce((acc, item) => {
          const trade = item.labour_trade || 'General';
          if (!acc[trade]) {
            acc[trade] = { hours: 0, cost: 0, workers: 0 };
          }
          acc[trade].hours += item.adjusted_hours || 0;
          acc[trade].cost += item.total_amount_standard || 0;
          acc[trade].workers += 1; // Count unique workers
          return acc;
        }, {} as Record<string, { hours: number; cost: number; workers: number }>)
      },
      equipment: {
        totalHours: equipment.reduce((sum, item) => sum + (item.billable_hours || 0), 0),
        totalDays: equipment.reduce((sum, item) => sum + (item.total_days || 0), 0),
        totalCost: equipmentTotal,
        byCategory: equipment.reduce((acc, item) => {
          const category = item.equipment_category || 'General';
          if (!acc[category]) {
            acc[category] = { hours: 0, cost: 0, units: 0 };
          }
          acc[category].hours += item.billable_hours || 0;
          acc[category].cost += item.total_amount_rental || 0;
          acc[category].units += 1;
          return acc;
        }, {} as Record<string, { hours: number; cost: number; units: number }>)
      },
      grandTotal: materialTotal + labourTotal + equipmentTotal,
      lastUpdated: new Date()
    };
  }


  /**
   * Export schedule to various formats
   */
  async exportSchedule(
    projectId: string,
    format: ScheduleExportFormat,
    scheduleType: 'material' | 'labour' | 'equipment' | 'all'
  ): Promise<Blob> {
    const summary = await this.getScheduleSummary(projectId);

    switch (format) {
      case 'csv':
        return await this.exportToCSV(projectId, summary, scheduleType);
      case 'excel':
        return await this.exportToExcel(projectId, summary, scheduleType);
      case 'pdf':
        return await this.exportToPDF(projectId, summary, scheduleType);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    projectId: string,
    summary: ScheduleSummary,
    scheduleType: string
  ): Promise<Blob> {
    let csv = '';

    // Get the actual schedule data for export
    const materials = scheduleType === 'material' || scheduleType === 'all' 
      ? await this.getMaterialSchedule(projectId) 
      : [];
    const labour = scheduleType === 'labour' || scheduleType === 'all'
      ? await this.getLabourSchedule(projectId)
      : [];
    const equipment = scheduleType === 'equipment' || scheduleType === 'all'
      ? await this.getEquipmentSchedule(projectId)
      : [];

    // Material Schedule
    if ((scheduleType === 'material' || scheduleType === 'all') && materials.length > 0) {
      csv += 'MATERIAL SCHEDULE\n';
      csv += 'Code,Name,Unit,Quantity,Wastage %,Rate,Total Cost\n';
      for (const item of materials) {
        csv += `${item.materialCode || item.material_code},${item.materialName || item.material_name},${item.unit || item.material_unit},`;
        csv += `${item.totalQuantity || item.total_quantity_with_wastage},${item.wastagePercentage || item.wastage_factor || 0},`;
        csv += `${item.rate || item.unit_rate_market},${item.totalCost || item.total_amount_market}\n`;
      }
      csv += `\nTotal Material Cost:,,,,,${summary.materials.totalCost}\n\n`;
    }

    // Labour Schedule
    if ((scheduleType === 'labour' || scheduleType === 'all') && labour.length > 0) {
      csv += 'LABOUR SCHEDULE\n';
      csv += 'Code,Name,Trade,Hours,Productivity,Rate,Total Cost\n';
      for (const item of labour) {
        csv += `${item.labourCode || item.labour_code},${item.labourName || item.labour_name},${item.tradeType || item.labour_trade},`;
        csv += `${item.totalHours || item.adjusted_hours},${item.productivityFactor || item.productivity_factor},`;
        csv += `${item.hourlyRate || item.rate_standard},${item.totalCost || item.total_amount_standard}\n`;
      }
      csv += `\nTotal Labour Cost:,,,,,${summary.labour.totalCost}\n\n`;
    }

    // Equipment Schedule
    if ((scheduleType === 'equipment' || scheduleType === 'all') && equipment.length > 0) {
      csv += 'EQUIPMENT SCHEDULE\n';
      csv += 'Code,Name,Type,Hours,Utilization,Rate,Total Cost\n';
      for (const item of equipment) {
        csv += `${item.equipmentCode || item.equipment_code},${item.equipmentName || item.equipment_name},${item.equipmentType || item.equipment_category},`;
        csv += `${item.totalHours || item.billable_hours},${item.utilizationFactor || item.utilization_factor},`;
        csv += `${item.hourlyRate || item.rate_rental},${item.totalCost || item.total_amount_rental}\n`;
      }
      csv += `\nTotal Equipment Cost:,,,,,${summary.equipment.totalCost}\n\n`;
    }

    if (scheduleType === 'all') {
      csv += `\nGRAND TOTAL:,,,,,${summary.grandTotal}\n`;
    }

    return new Blob([csv], { type: 'text/csv' });
  }

  /**
   * Export to Excel format (placeholder - would need a library like xlsx)
   */
  private async exportToExcel(
    projectId: string,
    summary: ScheduleSummary,
    scheduleType: string
  ): Promise<Blob> {
    // This would typically use a library like xlsx or exceljs
    // For now, return CSV with Excel mime type
    const csvBlob = await this.exportToCSV(projectId, summary, scheduleType);
    const csvText = await csvBlob.text();
    return new Blob([csvText], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Export to PDF format (placeholder - would need a library like pdfmake)
   */
  private async exportToPDF(
    projectId: string,
    summary: ScheduleSummary,
    scheduleType: string
  ): Promise<Blob> {
    // This would typically use a library like pdfmake or jsPDF
    // For now, return a simple text representation
    const content = JSON.stringify(summary, null, 2);
    return new Blob([content], { type: 'application/pdf' });
  }

  /**
   * Refresh schedule cache (if caching is implemented)
   */
  async refreshScheduleCache(projectId: string): Promise<void> {
    // This could trigger a background job to recalculate and cache schedules
    // For now, just log the action
    console.log(`Refreshing schedule cache for project ${projectId}`);
  }
}