import type { Database } from '@/shared/types/supabase-schema';

// Base types from database
type Tables = Database['public']['Tables'];
type MaterialFactor = Tables['material_factors']['Row'];
type LabourFactor = Tables['labour_factors']['Row'];
type EquipmentFactor = Tables['equipment_factors']['Row'];
type MaterialsCatalogue = Tables['materials_catalogue']['Row'];
type LabourCatalogue = Tables['labour_catalogue']['Row'];
type EquipmentCatalogue = Tables['equipment_catalogue']['Row'];

/**
 * Result of factor-based cost calculation
 */
export interface FactorCalculation {
  libraryItemId: string;
  libraryItemCode: string;
  libraryItemName: string;
  unit: string;
  materialCost: number;
  labourCost: number;
  equipmentCost: number;
  totalRate: number;
  breakdown: FactorBreakdown;
  warnings?: string[];
}

/**
 * Detailed breakdown of all factors
 */
export interface FactorBreakdown {
  materials: MaterialFactorCalculation[];
  labour: LabourFactorCalculation[];
  equipment: EquipmentFactorCalculation[];
  summary: CostSummary;
}

/**
 * Material factor calculation details
 */
export interface MaterialFactorCalculation {
  factor: MaterialFactor;
  catalogue: MaterialsCatalogue;
  quantityPerUnit: number;
  wastagePercentage: number;
  wastageMultiplier: number;
  effectiveQuantity: number;
  unitRate: number;
  totalCost: number;
  projectRate?: number; // Override rate if available
}

/**
 * Labour factor calculation details
 */
export interface LabourFactorCalculation {
  factor: LabourFactor;
  catalogue: LabourCatalogue;
  hoursPerUnit: number;
  productivityFactor: number;
  effectiveHours: number;
  hourlyRate: number;
  totalCost: number;
  crewSize?: number;
  projectRate?: number; // Override rate if available
}

/**
 * Equipment factor calculation details
 */
export interface EquipmentFactorCalculation {
  factor: EquipmentFactor;
  catalogue: EquipmentCatalogue;
  hoursPerUnit: number;
  utilizationFactor: number;
  billableHours: number;
  hourlyRate: number;
  totalCost: number;
  projectRate?: number; // Override rate if available
}

/**
 * Summary of costs by category
 */
export interface CostSummary {
  materialCost: number;
  materialPercentage: number;
  labourCost: number;
  labourPercentage: number;
  equipmentCost: number;
  equipmentPercentage: number;
  totalCost: number;
}

/**
 * Project-specific rates for overriding catalogue rates
 * Updated for Phase 1 compatibility with ProjectRatesService
 */
export interface ProjectRates {
  projectId: string;
  materials: Record<string, number>; // item_code -> rate
  labour: Record<string, number>; // item_code -> rate
  equipment: Record<string, number>; // item_code -> rate
  effectiveDate?: Date;
  expiryDate?: Date;
}

/**
 * Options for factor calculation
 */
export interface FactorCalculationOptions {
  useProjectRates?: boolean;
  includeWastage?: boolean;
  includeProductivity?: boolean;
  includeUtilization?: boolean;
  roundToDecimals?: number;
  minimumRate?: number;
  maximumRate?: number;
}

/**
 * Batch calculation request
 */
export interface BatchCalculationRequest {
  libraryItemIds: string[];
  projectId: string;
  options?: FactorCalculationOptions;
}

/**
 * Batch calculation result
 */
export interface BatchCalculationResult {
  calculations: Map<string, FactorCalculation>;
  errors: Map<string, string>;
  summary: BatchCalculationSummary;
}

/**
 * Summary of batch calculation
 */
export interface BatchCalculationSummary {
  totalItems: number;
  successfulCalculations: number;
  failedCalculations: number;
  averageMaterialCost: number;
  averageLabourCost: number;
  averageEquipmentCost: number;
  averageTotalRate: number;
}

/**
 * Factor validation result
 */
export interface FactorValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Factor comparison for analysis
 */
export interface FactorComparison {
  libraryItemId: string;
  currentFactors: FactorBreakdown;
  proposedFactors: FactorBreakdown;
  costDifference: number;
  percentageChange: number;
  changesByCategory: {
    material: number;
    labour: number;
    equipment: number;
  };
}

/**
 * Result from factor calculation service
 */
export interface FactorCalculationResult {
  libraryItemId: string;
  libraryItemCode: string;
  libraryItemName: string;
  quantity: number;
  unit: string;
  materials: {
    total: number;
    factors: any[];
  };
  labour: {
    total: number;
    factors: any[];
  };
  equipment: {
    total: number;
    factors: any[];
  };
  totalCost: number;
  ratePerUnit: number;
  breakdown: {
    materials: any[];
    labour: any[];
    equipment: any[];
  };
}