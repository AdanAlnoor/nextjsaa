/**
 * BQ (Bill of Quantities) column data structure
 */
export interface BQColumnData {
  // Identification
  id: string;
  codeIndex: string; // e.g., "1.1.03.10.10.01"
  level: number; // Hierarchy level for indentation (0-5)
  
  // Display
  description: string; // Item name/description
  indentedDescription?: string; // Pre-formatted with indentation
  
  // Quantities and rates
  quantity: number;
  unit: string;
  rateManual?: number; // User-entered rate
  rateCalculated?: number; // Rate from library factors
  amountManual?: number; // quantity × rateManual
  amountCalculated?: number; // quantity × rateCalculated
  
  // Library reference
  isFromLibrary: boolean;
  libraryItemId?: string;
  libraryCode?: string;
  libraryPath?: string;
  factorBreakdown?: any; // JSON breakdown of factors
  
  // Hierarchy
  parentId?: string;
  children?: BQColumnData[];
  isExpanded?: boolean;
  
  // Metadata
  notes?: string;
  lastModified?: Date;
  modifiedBy?: string;
}

/**
 * BQ hierarchy level types
 */
export enum BQHierarchyLevel {
  STRUCTURE = 0, // e.g., Main House
  ELEMENT = 1, // e.g., Substructure
  DIVISION = 2, // e.g., 03 - Concrete
  SECTION = 3, // e.g., 03.10 - Concrete Materials
  ASSEMBLY = 4, // e.g., 03.10.10 - Ready Mix Concrete
  ITEM = 5 // e.g., 03.10.10.01 - Grade 25 Concrete
}

/**
 * BQ summary at each level
 */
export interface BQSummary {
  level: BQHierarchyLevel;
  itemCount: number;
  totalAmountManual: number;
  totalAmountCalculated: number;
  variance: number;
  variancePercentage: number;
}

/**
 * BQ display options
 */
export interface BQDisplayOptions {
  showManualRates: boolean;
  showCalculatedRates: boolean;
  showVariance: boolean;
  showFactorBreakdown: boolean;
  showLibraryReference: boolean;
  expandLevel: number; // Auto-expand to this level
  highlightVariance: boolean;
  varianceThreshold: number; // Highlight if variance > threshold %
}

/**
 * BQ item for editing
 */
export interface BQEditItem {
  id: string;
  quantity: number;
  rateManual?: number;
  unit?: string;
  notes?: string;
}

/**
 * BQ import/export format
 */
export interface BQExportFormat {
  version: string;
  projectId: string;
  projectName: string;
  exportDate: Date;
  structures: BQStructureExport[];
}

/**
 * BQ structure for export
 */
export interface BQStructureExport {
  name: string;
  code: string;
  elements: BQElementExport[];
  summary: BQSummary;
}

/**
 * BQ element for export
 */
export interface BQElementExport {
  name: string;
  code: string;
  items: BQItemExport[];
  summary: BQSummary;
}

/**
 * BQ item for export
 */
export interface BQItemExport {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  rateManual?: number;
  rateCalculated?: number;
  amountManual?: number;
  amountCalculated?: number;
  libraryReference?: string;
}

/**
 * BQ validation result
 */
export interface BQValidationResult {
  isValid: boolean;
  errors: BQValidationError[];
  warnings: BQValidationWarning[];
}

/**
 * BQ validation error
 */
export interface BQValidationError {
  itemId: string;
  itemCode: string;
  field: string;
  message: string;
}

/**
 * BQ validation warning
 */
export interface BQValidationWarning {
  itemId: string;
  itemCode: string;
  type: 'high_variance' | 'missing_rate' | 'unusual_quantity' | 'duplicate_item';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * BQ filter options
 */
export interface BQFilterOptions {
  searchQuery?: string;
  showOnlyLibraryItems?: boolean;
  showOnlyManualItems?: boolean;
  showOnlyItemsWithVariance?: boolean;
  minAmount?: number;
  maxAmount?: number;
  divisions?: string[];
  sections?: string[];
}

/**
 * BQ sort options
 */
export interface BQSortOptions {
  field: 'code' | 'description' | 'quantity' | 'amount' | 'variance';
  direction: 'asc' | 'desc';
  maintainHierarchy: boolean;
}