/**
 * Phase 1: Project-Specific Rates Service
 * 
 * Core service for managing custom material, labour, and equipment rates
 * per project. Integrates with existing FactorCalculatorService and 
 * supports the Phase 0 library-only architecture.
 */

import { createClient } from '@/shared/lib/supabase/client';
import {
  ProjectRates,
  RateOverride,
  RateHistory,
  RateImportOptions,
  RateImportResult,
  BatchRateUpdate,
  RateValidationResult,
  RateSearchCriteria,
  RateStatistics,
  EffectiveRate,
  RateAuditLog,
  ProjectRateSummary,
  RateComparison
} from '../types/rates';

export class ProjectRatesService {
  private static instance: ProjectRatesService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): ProjectRatesService {
    if (!this.instance) {
      this.instance = new ProjectRatesService();
    }
    return this.instance;
  }

  /**
   * Get current rates for a project
   * Returns the most recent rates that are effective as of today
   */
  async getCurrentRates(projectId: string, effectiveDate?: Date): Promise<ProjectRates> {
    const queryDate = effectiveDate || new Date();
    
    const { data, error } = await this.supabase
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .lte('effective_date', queryDate.toISOString())
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    if (!data) {
      // Return empty rates if none exist
      return {
        projectId,
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: queryDate
      };
    }

    return this.mapToProjectRates(data);
  }

  /**
   * Set/update rates for a project
   * Creates a new rate record with effective date
   */
  async setProjectRates(
    projectId: string,
    rates: Partial<ProjectRates>
  ): Promise<ProjectRates> {
    const effectiveDate = rates.effectiveDate || new Date();
    
    // Validate rates before saving
    const validation = await this.validateRates(projectId, {
      materials: rates.materials || {},
      labour: rates.labour || {},
      equipment: rates.equipment || {}
    });

    if (!validation.isValid) {
      throw new Error(`Rate validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const { data, error } = await this.supabase
      .from('project_rates')
      .insert({
        project_id: projectId,
        materials: rates.materials || {},
        labour: rates.labour || {},
        equipment: rates.equipment || {},
        effective_date: effectiveDate.toISOString(),
        expiry_date: rates.expiryDate?.toISOString(),
        created_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;

    // Log the audit trail
    await this.logRateChange(projectId, 'create', data);

    return this.mapToProjectRates(data);
  }

  /**
   * Update specific rate override for a single item
   */
  async updateRateOverride(
    projectId: string,
    category: 'materials' | 'labour' | 'equipment',
    itemCode: string,
    rate: number,
    reason?: string
  ): Promise<void> {
    const currentRates = await this.getCurrentRates(projectId);
    
    const updatedRates = {
      ...currentRates,
      [category]: {
        ...currentRates[category],
        [itemCode]: rate
      }
    };

    // Log the specific change for audit
    await this.logRateOverride({
      itemId: itemCode,
      itemCode,
      category,
      rate,
      previousRate: currentRates[category][itemCode],
      effectiveDate: new Date(),
      reason
    }, projectId);

    await this.setProjectRates(projectId, updatedRates);
  }

  /**
   * Get rate history for a project
   */
  async getRateHistory(
    projectId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<RateHistory[]> {
    let query = this.supabase
      .from('project_rates')
      .select(`
        *,
        auth.users(email)
      `)
      .eq('project_id', projectId)
      .order('effective_date', { ascending: false });

    if (startDate) {
      query = query.gte('effective_date', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('effective_date', endDate.toISOString());
    }
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.mapToRateHistory);
  }

  /**
   * Bulk import rates from another project
   */
  async importRatesFromProject(
    options: RateImportOptions
  ): Promise<RateImportResult> {
    const sourceRates = await this.getCurrentRates(options.sourceProjectId);
    const targetRates = await this.getCurrentRates(options.targetProjectId);
    const categories = options.categories || ['materials', 'labour', 'equipment'];
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const details = { materials: 0, labour: 0, equipment: 0 };
    const warnings: string[] = [];

    const newRates: Partial<ProjectRates> = {
      effectiveDate: options.effectiveDate || new Date(),
      materials: { ...targetRates.materials },
      labour: { ...targetRates.labour },
      equipment: { ...targetRates.equipment }
    };

    // Import each category
    for (const category of categories) {
      const sourceItems = sourceRates[category];
      const targetItems = newRates[category]!;

      for (const [itemCode, rate] of Object.entries(sourceItems)) {
        const hasExisting = itemCode in targetItems;
        
        switch (options.conflictResolution) {
          case 'skip':
            if (hasExisting) {
              skipped++;
              continue;
            }
            break;
          case 'merge':
            if (hasExisting && targetItems[itemCode] !== rate) {
              warnings.push(`${category}:${itemCode} - keeping existing rate ${targetItems[itemCode]} instead of ${rate}`);
              skipped++;
              continue;
            }
            break;
          case 'overwrite':
          default:
            // Always import
            break;
        }

        targetItems[itemCode] = rate;
        imported++;
        details[category]++;
      }
    }

    // Save the imported rates
    if (imported > 0) {
      try {
        await this.setProjectRates(options.targetProjectId, newRates);
      } catch (error) {
        errors = imported;
        imported = 0;
        throw error;
      }
    }

    return {
      imported,
      skipped,
      errors,
      details,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Delete rates for a specific effective date
   */
  async deleteRates(projectId: string, effectiveDate: Date): Promise<void> {
    const { error } = await this.supabase
      .from('project_rates')
      .delete()
      .eq('project_id', projectId)
      .eq('effective_date', effectiveDate.toISOString());

    if (error) throw error;

    // Log the deletion
    await this.logRateChange(projectId, 'delete', { effective_date: effectiveDate });
  }

  /**
   * Get effective rate for a specific item
   * Considers project overrides, then falls back to catalog rates
   */
  async getEffectiveRate(
    projectId: string,
    category: 'materials' | 'labour' | 'equipment',
    itemCode: string,
    effectiveDate?: Date
  ): Promise<EffectiveRate> {
    const projectRates = await this.getCurrentRates(projectId, effectiveDate);
    const projectRate = projectRates[category][itemCode];

    // Get catalog rate as fallback
    const catalogRate = await this.getCatalogRate(category, itemCode);

    const rate = projectRate || catalogRate || 0;
    const source = projectRate ? 'project' : (catalogRate ? 'catalog' : 'default');

    return {
      itemCode,
      category,
      rate,
      source,
      effectiveDate: effectiveDate || new Date(),
      projectRate,
      catalogRate
    };
  }

  /**
   * Batch update multiple rates at once
   */
  async batchUpdateRates(
    updates: BatchRateUpdate
  ): Promise<ProjectRates> {
    const currentRates = await this.getCurrentRates(updates.projectId);
    const updatedRates = {
      ...currentRates,
      effectiveDate: updates.effectiveDate
    };

    for (const update of updates.updates) {
      updatedRates[update.category] = {
        ...updatedRates[update.category],
        [update.itemCode]: update.rate
      };

      // Log each individual change
      await this.logRateOverride(update, updates.projectId);
    }

    return await this.setProjectRates(updates.projectId, updatedRates);
  }

  /**
   * Get rate statistics for a project
   */
  async getRateStatistics(projectId: string): Promise<RateStatistics> {
    const rates = await this.getCurrentRates(projectId);
    const history = await this.getRateHistory(projectId, undefined, undefined, 5);

    const totalRates = 
      Object.keys(rates.materials).length +
      Object.keys(rates.labour).length +
      Object.keys(rates.equipment).length;

    const calculateAverage = (rates: Record<string, number>) => {
      const values = Object.values(rates);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    return {
      projectId,
      totalRates,
      categoryBreakdown: {
        materials: Object.keys(rates.materials).length,
        labour: Object.keys(rates.labour).length,
        equipment: Object.keys(rates.equipment).length
      },
      averageRates: {
        materials: calculateAverage(rates.materials),
        labour: calculateAverage(rates.labour),
        equipment: calculateAverage(rates.equipment)
      },
      lastUpdated: rates.effectiveDate,
      mostRecentChanges: history
    };
  }

  /**
   * Compare rates between two projects
   */
  async compareProjectRates(
    sourceProjectId: string,
    targetProjectId: string
  ): Promise<RateComparison[]> {
    const [sourceRates, targetRates] = await Promise.all([
      this.getCurrentRates(sourceProjectId),
      this.getCurrentRates(targetProjectId)
    ]);

    const comparisons: RateComparison[] = [];
    
    // Get all unique item codes across both projects
    const allItemCodes = new Set([
      ...Object.keys(sourceRates.materials),
      ...Object.keys(sourceRates.labour),
      ...Object.keys(sourceRates.equipment),
      ...Object.keys(targetRates.materials),
      ...Object.keys(targetRates.labour),
      ...Object.keys(targetRates.equipment)
    ]);

    for (const itemCode of allItemCodes) {
      for (const category of ['materials', 'labour', 'equipment'] as const) {
        const sourceRate = sourceRates[category][itemCode];
        const targetRate = targetRates[category][itemCode];

        if (sourceRate !== undefined || targetRate !== undefined) {
          const source = sourceRate || 0;
          const target = targetRate || 0;
          const difference = target - source;
          const percentageChange = source > 0 ? (difference / source) * 100 : 0;

          let action: 'add' | 'update' | 'remove' | 'unchanged';
          if (sourceRate === undefined) action = 'add';
          else if (targetRate === undefined) action = 'remove';
          else if (sourceRate === targetRate) action = 'unchanged';
          else action = 'update';

          comparisons.push({
            itemCode,
            itemName: await this.getItemName(category, itemCode),
            category,
            sourceRate: source,
            targetRate: target,
            difference,
            percentageChange,
            action
          });
        }
      }
    }

    return comparisons;
  }

  /**
   * Validate rates for consistency and business rules
   */
  private async validateRates(
    projectId: string,
    rates: { materials: Record<string, number>; labour: Record<string, number>; equipment: Record<string, number> }
  ): Promise<RateValidationResult> {
    const errors: Array<{ itemCode: string; category: string; message: string; suggestedRate?: number }> = [];
    const warnings: Array<{ itemCode: string; category: string; message: string }> = [];

    // Validate each category
    for (const [category, categoryRates] of Object.entries(rates) as Array<[keyof typeof rates, Record<string, number>]>) {
      for (const [itemCode, rate] of Object.entries(categoryRates)) {
        // Check for negative rates
        if (rate < 0) {
          errors.push({
            itemCode,
            category,
            message: 'Rate cannot be negative',
            suggestedRate: 0
          });
        }

        // Check for extremely high rates (potential data entry errors)
        if (rate > 999999) {
          warnings.push({
            itemCode,
            category,
            message: 'Rate seems unusually high, please verify'
          });
        }

        // Check against catalog rates for significant variances
        const catalogRate = await this.getCatalogRate(category, itemCode);
        if (catalogRate && Math.abs(rate - catalogRate) > catalogRate * 5) { // 500% variance
          warnings.push({
            itemCode,
            category,
            message: `Rate varies significantly from catalog rate (${catalogRate})`
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get catalog rate for fallback
   */
  private async getCatalogRate(
    category: 'materials' | 'labour' | 'equipment',
    itemCode: string
  ): Promise<number | null> {
    const table = category === 'materials' ? 'library_catalogues_materials' :
                  category === 'labour' ? 'library_catalogues_labour' :
                  'library_catalogues_equipment';

    const { data } = await this.supabase
      .from(table)
      .select('rate')
      .eq('item_code', itemCode)
      .single()
      .maybeSingle();

    return data?.rate || null;
  }

  /**
   * Get item name for display purposes
   */
  private async getItemName(
    category: 'materials' | 'labour' | 'equipment',
    itemCode: string
  ): Promise<string> {
    const table = category === 'materials' ? 'library_catalogues_materials' :
                  category === 'labour' ? 'library_catalogues_labour' :
                  'library_catalogues_equipment';

    const { data } = await this.supabase
      .from(table)
      .select('description')
      .eq('item_code', itemCode)
      .single()
      .maybeSingle();

    return data?.description || itemCode;
  }

  /**
   * Log rate changes for audit trail
   */
  private async logRateChange(
    projectId: string,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    // This would typically log to an audit table
    // For now, we'll use console logging in development
    console.log('Rate change logged:', {
      projectId,
      action,
      timestamp: new Date(),
      data
    });
  }

  /**
   * Log individual rate override for detailed audit
   */
  private async logRateOverride(
    override: RateOverride,
    projectId: string
  ): Promise<void> {
    // This would typically log to an audit table
    console.log('Rate override logged:', {
      projectId,
      override,
      timestamp: new Date()
    });
  }

  /**
   * Map database row to ProjectRates interface
   */
  private mapToProjectRates(data: any): ProjectRates {
    return {
      id: data.id,
      projectId: data.project_id,
      materials: data.materials || {},
      labour: data.labour || {},
      equipment: data.equipment || {},
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      createdBy: data.created_by
    };
  }

  /**
   * Map database row to RateHistory interface
   */
  private mapToRateHistory(data: any): RateHistory {
    const materialsCount = Object.keys(data.materials || {}).length;
    const labourCount = Object.keys(data.labour || {}).length;
    const equipmentCount = Object.keys(data.equipment || {}).length;

    return {
      id: data.id,
      projectId: data.project_id,
      rates: {
        materials: data.materials || {},
        labour: data.labour || {},
        equipment: data.equipment || {}
      },
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
      changesSummary: {
        materialsChanged: materialsCount,
        labourChanged: labourCount,
        equipmentChanged: equipmentCount,
        totalChanges: materialsCount + labourCount + equipmentCount
      }
    };
  }
}

// Export singleton instance
export const projectRatesService = ProjectRatesService.getInstance();