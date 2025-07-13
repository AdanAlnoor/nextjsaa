/**
 * Base schedule item interface
 */
interface BaseScheduleItem {
  project_id: string;
  project_name: string;
  source_items: string[];
  source_item_count: number;
  calculated_at: Date;
}

/**
 * Material schedule item from view
 */
export interface MaterialScheduleItem extends BaseScheduleItem {
  material_id: string;
  material_code: string;
  material_name: string;
  material_unit: string;
  material_category: string;
  base_quantity: number;
  wastage_factor: number;
  total_quantity_with_wastage: number;
  unit_rate_market: number;
  total_amount_market: number;
}

/**
 * Labour schedule item from view
 */
export interface LabourScheduleItem extends BaseScheduleItem {
  labour_id: string;
  labour_code: string;
  labour_name: string;
  labour_trade: string;
  skill_level: string;
  total_hours_raw: number;
  productivity_factor: number;
  adjusted_hours: number;
  rate_standard: number;
  total_amount_standard: number;
  total_days: number;
}

/**
 * Equipment schedule item from view
 */
export interface EquipmentScheduleItem extends BaseScheduleItem {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  equipment_category: string;
  capacity?: string;
  base_hours: number;
  utilization_factor: number;
  billable_hours: number;
  rate_rental: number;
  total_amount_rental: number;
  total_days: number;
}

/**
 * Enhanced material schedule for UI display
 */
export interface MaterialScheduleColumn {
  code: string;
  description: string;
  sourceItems: string[];
  baseQuantity: number;
  wastageFactor: number;
  totalQuantity: number;
  unit: string;
  rateMarket: number;
  rateContract?: number;
  amountMarket: number;
  amountContract?: number;
  category: string;
  supplier?: string;
  leadTime?: number;
}

/**
 * Enhanced labour schedule for UI display
 */
export interface LabourScheduleColumn {
  code: string;
  description: string;
  sourceItems: string[];
  totalHours: number;
  productivityFactor: number;
  adjustedHours: number;
  crewSize: number;
  rateStandard: number;
  rateProject?: number;
  amountStandard: number;
  amountProject?: number;
  trade: string;
  skillLevel: string;
  availability?: 'available' | 'limited' | 'unavailable';
}

/**
 * Enhanced equipment schedule for UI display
 */
export interface EquipmentScheduleColumn {
  code: string;
  description: string;
  sourceItems: string[];
  baseHours: number;
  utilizationFactor: number;
  billableHours: number;
  unitsRequired: number;
  rateOwned?: number;
  rateRental: number;
  amountOwned?: number;
  amountRental: number;
  category: string;
  capacity?: string;
  availability?: 'available' | 'reserved' | 'unavailable';
}

/**
 * Schedule aggregation summary
 */
export interface ScheduleSummary {
  materials: {
    totalItems: number;
    totalCost: number;
    byCategory: Record<string, {
      items: number;
      cost: number;
    }>;
  };
  labour: {
    totalHours: number;
    totalDays: number;
    totalCost: number;
    byTrade: Record<string, {
      hours: number;
      cost: number;
      workers: number;
    }>;
  };
  equipment: {
    totalHours: number;
    totalDays: number;
    totalCost: number;
    byCategory: Record<string, {
      hours: number;
      cost: number;
      units: number;
    }>;
  };
  grandTotal: number;
  lastUpdated?: Date;
}

/**
 * Schedule export options
 */
export interface ScheduleExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  includeDetails: boolean;
  includeSummary: boolean;
  groupBy?: 'category' | 'supplier' | 'trade';
  sortBy?: 'name' | 'quantity' | 'cost';
  filterZeroQuantity?: boolean;
}

/**
 * Schedule filter options
 */
export interface ScheduleFilterOptions {
  categories?: string[];
  suppliers?: string[];
  trades?: string[];
  minQuantity?: number;
  minCost?: number;
  searchQuery?: string;
}

/**
 * Schedule filters (simplified)
 */
export interface ScheduleFilters {
  category?: string;
  trade?: string;
  skillLevel?: string;
  searchQuery?: string;
}

/**
 * Schedule comparison for different scenarios
 */
export interface ScheduleComparison {
  scenario1: {
    name: string;
    materials: MaterialScheduleItem[];
    labour: LabourScheduleItem[];
    equipment: EquipmentScheduleItem[];
    summary: ScheduleSummary;
  };
  scenario2: {
    name: string;
    materials: MaterialScheduleItem[];
    labour: LabourScheduleItem[];
    equipment: EquipmentScheduleItem[];
    summary: ScheduleSummary;
  };
  variance: {
    materials: number;
    labour: number;
    equipment: number;
    total: number;
    percentage: number;
  };
}

/**
 * Real-time schedule update
 */
export interface ScheduleUpdate {
  type: 'material' | 'labour' | 'equipment';
  action: 'add' | 'update' | 'delete';
  itemId: string;
  changes: any;
  timestamp: Date;
}

/**
 * Schedule export format
 */
export type ScheduleExportFormat = 'csv' | 'excel' | 'pdf';

/**
 * Schedule aggregation result
 */
export interface ScheduleAggregationResult {
  materials: MaterialScheduleItem[];
  labour: LabourScheduleItem[];
  equipment: EquipmentScheduleItem[];
  summary: ScheduleSummary;
}

/**
 * Schedule optimization suggestion
 */
export interface OptimizationSuggestion {
  type: 'bulk_discount' | 'crew_consolidation' | 'equipment_sharing' | 'timing';
  category: 'material' | 'labour' | 'equipment';
  description: string;
  potentialSaving: number;
  implementation: string;
  affectedItems: string[];
}