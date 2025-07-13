import { createClient } from '@/shared/lib/supabase/client';
import { 
  FactorCalculation, 
  MaterialFactor, 
  LabourFactor, 
  EquipmentFactor,
  FactorCalculationResult,
  ProjectRates
} from '../types/factorCalculation';
import { ProjectRatesService } from '@/features/library/services/projectRatesService';

export class FactorCalculatorService {
  private static instance: FactorCalculatorService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): FactorCalculatorService {
    if (!this.instance) {
      this.instance = new FactorCalculatorService();
    }
    return this.instance;
  }

  /**
   * Calculate the total cost for a library item including all factors
   */
  async calculateItemCost(
    libraryItemId: string,
    projectId: string,
    quantity: number = 1
  ): Promise<FactorCalculationResult> {
    try {
      // Get library item details
      const { data: libraryItem, error: itemError } = await this.supabase
        .from('library_items')
        .select('*')
        .eq('id', libraryItemId)
        .single();

      if (itemError) throw itemError;

      // Get project rates
      const projectRates = await this.getProjectRates(projectId);

      // Calculate costs for each factor type
      const materialCost = await this.calculateMaterialCost(libraryItemId, quantity, projectRates);
      const labourCost = await this.calculateLabourCost(libraryItemId, quantity, projectRates);
      const equipmentCost = await this.calculateEquipmentCost(libraryItemId, quantity, projectRates);

      // Calculate total cost
      const totalCost = materialCost.total + labourCost.total + equipmentCost.total;
      const ratePerUnit = totalCost / quantity;

      return {
        libraryItemId,
        libraryItemCode: libraryItem.code,
        libraryItemName: libraryItem.name,
        quantity,
        unit: libraryItem.unit,
        materials: materialCost,
        labour: labourCost,
        equipment: equipmentCost,
        totalCost,
        ratePerUnit,
        breakdown: {
          materials: materialCost.factors,
          labour: labourCost.factors,
          equipment: equipmentCost.factors
        }
      };
    } catch (error) {
      console.error('Error calculating item cost:', error);
      throw error;
    }
  }

  /**
   * Calculate material costs including wastage factors
   */
  private async calculateMaterialCost(
    libraryItemId: string,
    quantity: number,
    projectRates: ProjectRates
  ): Promise<{ total: number; factors: MaterialFactor[] }> {
    try {
      // Get material factors for the library item
      const { data: factors, error } = await this.supabase
        .from('material_factors')
        .select(`
          *,
          material:material_catalogue(*)
        `)
        .eq('library_item_id', libraryItemId);

      if (error) throw error;

      const materialFactors: MaterialFactor[] = [];
      let totalMaterialCost = 0;

      for (const factor of factors || []) {
        const wastageMultiplier = 1 + (factor.wastage_percentage || 0) / 100;
        const effectiveQuantity = quantity * factor.quantity_per_unit * wastageMultiplier;
        
        // Get material rate (could be from project rates or default)
        const rate = projectRates.materials[factor.material_catalogue_id] || factor.material?.rate || 0;
        const cost = effectiveQuantity * rate;

        materialFactors.push({
          materialId: factor.material_catalogue_id,
          materialCode: factor.material_code || factor.material?.code || '',
          materialName: factor.material_name || factor.material?.name || '',
          quantity: factor.quantity_per_unit,
          wastagePercentage: factor.wastage_percentage || 0,
          effectiveQuantity,
          rate,
          cost,
          unit: factor.unit || factor.material?.unit || ''
        });

        totalMaterialCost += cost;
      }

      return { total: totalMaterialCost, factors: materialFactors };
    } catch (error) {
      console.error('Error calculating material cost:', error);
      return { total: 0, factors: [] };
    }
  }

  /**
   * Calculate labour costs including productivity factors
   */
  private async calculateLabourCost(
    libraryItemId: string,
    quantity: number,
    projectRates: ProjectRates
  ): Promise<{ total: number; factors: LabourFactor[] }> {
    try {
      // Get labour factors for the library item
      const { data: factors, error } = await this.supabase
        .from('labor_factors')
        .select(`
          *,
          labor:labor_catalogue(*)
        `)
        .eq('library_item_id', libraryItemId);

      if (error) throw error;

      const labourFactors: LabourFactor[] = [];
      let totalLabourCost = 0;

      for (const factor of factors || []) {
        const productivityMultiplier = 1; // No productivity factor in current schema
        const effectiveHours = quantity * (factor.hours_per_unit || 0) * productivityMultiplier;
        
        // Get labour rate (could be from project rates or default)
        const rate = projectRates.labour[factor.labor_catalogue_id] || factor.labor?.rate || 0;
        const cost = effectiveHours * rate;

        labourFactors.push({
          labourId: factor.labor_catalogue_id,
          labourCode: factor.labor_code || factor.labor?.code || '',
          labourName: factor.labor_name || factor.labor?.name || '',
          hours: factor.hours_per_unit || 0,
          productivityFactor: productivityMultiplier,
          effectiveHours,
          rate,
          cost,
          unit: 'hour'
        });

        totalLabourCost += cost;
      }

      return { total: totalLabourCost, factors: labourFactors };
    } catch (error) {
      console.error('Error calculating labour cost:', error);
      return { total: 0, factors: [] };
    }
  }

  /**
   * Calculate equipment costs including utilization factors
   */
  private async calculateEquipmentCost(
    libraryItemId: string,
    quantity: number,
    projectRates: ProjectRates
  ): Promise<{ total: number; factors: EquipmentFactor[] }> {
    try {
      // Get equipment factors for the library item
      const { data: factors, error } = await this.supabase
        .from('equipment_factors')
        .select(`
          *,
          equipment:equipment_catalogue(*)
        `)
        .eq('library_item_id', libraryItemId);

      if (error) throw error;

      const equipmentFactors: EquipmentFactor[] = [];
      let totalEquipmentCost = 0;

      for (const factor of factors || []) {
        const utilizationMultiplier = 1; // No utilization factor in current schema
        const effectiveHours = quantity * (factor.hours_per_unit || 0) * utilizationMultiplier;
        
        // Get equipment rate (could be from project rates or default)
        const rate = projectRates.equipment[factor.equipment_catalogue_id] || factor.equipment?.rate || 0;
        const cost = effectiveHours * rate;

        equipmentFactors.push({
          equipmentId: factor.equipment_catalogue_id,
          equipmentCode: factor.equipment_code || factor.equipment?.code || '',
          equipmentName: factor.equipment_name || factor.equipment?.name || '',
          hours: factor.hours_per_unit || 0,
          utilizationFactor: utilizationMultiplier,
          effectiveHours,
          rate,
          cost,
          unit: 'hour'
        });

        totalEquipmentCost += cost;
      }

      return { total: totalEquipmentCost, factors: equipmentFactors };
    } catch (error) {
      console.error('Error calculating equipment cost:', error);
      return { total: 0, factors: [] };
    }
  }

  /**
   * Get project-specific rates using the new ProjectRatesService
   * Phase 1 Integration: Uses JSONB-based rate structure
   */
  private async getProjectRates(projectId: string): Promise<ProjectRates> {
    try {
      const projectRatesService = ProjectRatesService.getInstance();
      const rates = await projectRatesService.getCurrentRates(projectId);
      
      // Transform to match the expected interface for factor calculations
      return {
        projectId: rates.projectId,
        materials: rates.materials,
        labour: rates.labour,
        equipment: rates.equipment,
        effectiveDate: rates.effectiveDate,
        expiryDate: rates.expiryDate
      };
    } catch (error) {
      console.error('Error getting project rates:', error);
      // Return empty rates structure as fallback
      return { 
        projectId,
        materials: {}, 
        labour: {}, 
        equipment: {},
        effectiveDate: new Date()
      };
    }
  }

  /**
   * Calculate costs for multiple library items at once
   */
  async calculateBulkItemCosts(
    items: Array<{ libraryItemId: string; quantity: number }>,
    projectId: string
  ): Promise<FactorCalculationResult[]> {
    const calculations = await Promise.all(
      items.map(item => 
        this.calculateItemCost(item.libraryItemId, projectId, item.quantity)
      )
    );
    return calculations;
  }

  /**
   * Preview calculation without saving
   */
  async previewCalculation(
    libraryItemId: string,
    projectId: string,
    quantity: number = 1
  ): Promise<FactorCalculationResult> {
    return this.calculateItemCost(libraryItemId, projectId, quantity);
  }
}