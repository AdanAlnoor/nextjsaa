/**
 * Phase 1: Project-Specific Pricing Types
 * 
 * Enhanced rate management types that build on the existing ProjectRates interface
 * from FactorCalculatorService to provide comprehensive project-specific pricing.
 */

/**
 * Enhanced project rates with full metadata
 * Extends the existing ProjectRates interface from factor calculations
 */
export interface ProjectRates {
  projectId: string;
  materials: Record<string, number>; // item_code -> rate
  labour: Record<string, number>;    // item_code -> rate  
  equipment: Record<string, number>; // item_code -> rate
  effectiveDate: Date;
  expiryDate?: Date;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

/**
 * Individual rate override for specific items
 */
export interface RateOverride {
  itemId: string;
  itemCode: string;
  itemName?: string;
  category: 'materials' | 'labour' | 'equipment';
  rate: number;
  previousRate?: number;
  effectiveDate: Date;
  reason?: string;
}

/**
 * Historical record of rate changes
 */
export interface RateHistory {
  id: string;
  projectId: string;
  rates: {
    materials: Record<string, number>;
    labour: Record<string, number>;
    equipment: Record<string, number>;
  };
  effectiveDate: Date;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  changesSummary?: {
    materialsChanged: number;
    labourChanged: number;
    equipmentChanged: number;
    totalChanges: number;
  };
}

/**
 * Options for importing rates from another project
 */
export interface RateImportOptions {
  sourceProjectId: string;
  targetProjectId: string;
  categories?: Array<'materials' | 'labour' | 'equipment'>;
  effectiveDate?: Date;
  conflictResolution?: 'overwrite' | 'skip' | 'merge';
  includeInactive?: boolean;
}

/**
 * Result of rate import operation
 */
export interface RateImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: {
    materials: number;
    labour: number;
    equipment: number;
  };
  warnings?: string[];
}

/**
 * Rate comparison between projects or time periods
 */
export interface RateComparison {
  itemCode: string;
  itemName: string;
  category: 'materials' | 'labour' | 'equipment';
  sourceRate: number;
  targetRate: number;
  difference: number;
  percentageChange: number;
  action: 'add' | 'update' | 'remove' | 'unchanged';
}

/**
 * Batch rate update operation
 */
export interface BatchRateUpdate {
  projectId: string;
  updates: RateOverride[];
  effectiveDate: Date;
  reason?: string;
}

/**
 * Rate validation result
 */
export interface RateValidationResult {
  isValid: boolean;
  errors: Array<{
    itemCode: string;
    category: string;
    message: string;
    suggestedRate?: number;
  }>;
  warnings: Array<{
    itemCode: string;
    category: string;
    message: string;
  }>;
}

/**
 * Rate search/filter criteria
 */
export interface RateSearchCriteria {
  projectId: string;
  categories?: Array<'materials' | 'labour' | 'equipment'>;
  itemCodes?: string[];
  minRate?: number;
  maxRate?: number;
  effectiveDate?: Date;
  searchTerm?: string;
}

/**
 * Rate statistics for analytics
 */
export interface RateStatistics {
  projectId: string;
  totalRates: number;
  categoryBreakdown: {
    materials: number;
    labour: number;
    equipment: number;
  };
  averageRates: {
    materials: number;
    labour: number;
    equipment: number;
  };
  lastUpdated: Date;
  mostRecentChanges: RateHistory[];
}

/**
 * Options for rate calculations
 */
export interface RateCalculationOptions {
  useProjectRates: boolean;
  effectiveDate?: Date;
  includeOverheads?: boolean;
  includeProfitMargin?: boolean;
  includeVAT?: boolean;
  roundToDecimals?: number;
}

/**
 * Effective rate with fallback hierarchy
 */
export interface EffectiveRate {
  itemCode: string;
  category: 'materials' | 'labour' | 'equipment';
  rate: number;
  source: 'manual' | 'project' | 'catalog' | 'default';
  effectiveDate: Date;
  projectRate?: number;
  catalogRate?: number;
  manualRate?: number;
}

/**
 * Rate audit log entry
 */
export interface RateAuditLog {
  id: string;
  projectId: string;
  itemCode: string;
  category: 'materials' | 'labour' | 'equipment';
  action: 'create' | 'update' | 'delete' | 'import';
  oldValue?: number;
  newValue?: number;
  reason?: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Project rate summary for dashboard display
 */
export interface ProjectRateSummary {
  projectId: string;
  projectName: string;
  hasCustomRates: boolean;
  totalCustomRates: number;
  lastUpdated?: Date;
  categoryCounts: {
    materials: number;
    labour: number;
    equipment: number;
  };
  averageVarianceFromCatalog: {
    materials: number; // percentage
    labour: number;
    equipment: number;
  };
}

/**
 * Rate suggestion for optimization
 */
export interface RateSuggestion {
  itemCode: string;
  category: 'materials' | 'labour' | 'equipment';
  currentRate: number;
  suggestedRate: number;
  reason: string;
  confidence: number; // 0-1
  basedOn: 'market_data' | 'similar_projects' | 'historical_trends' | 'supplier_updates';
  potentialSavings?: number;
}