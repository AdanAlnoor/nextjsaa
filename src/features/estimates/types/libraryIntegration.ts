import type { Database } from '@/shared/types/supabase-schema';

// Base types from database
type Tables = Database['public']['Tables'];
type LibraryItem = Tables['library_items']['Row'];
type Division = Tables['divisions']['Row'];
type Section = Tables['sections']['Row'];
type Assembly = Tables['assemblies']['Row'];
type EstimateStructure = Tables['estimate_structures']['Row'];
export type EstimateElement = Tables['estimate_elements']['Row'];
export type EstimateDetailItem = Tables['estimate_detail_items']['Row'];

/**
 * Represents a complete library hierarchy node with all levels
 */
export interface LibraryHierarchyNode {
  divisionId: string;
  divisionCode: string;
  divisionName: string;
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  assemblyId: string;
  assemblyCode: string;
  assemblyName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  path: string; // Full path like "03.10.10.01"
  unit: string;
  description?: string;
}

/**
 * Represents a library item selection for estimate creation
 */
export interface LibraryItemSelection {
  item: LibraryItem & {
    assembly?: Assembly & {
      section?: Section & {
        division?: Division;
      };
    };
  };
  structureId: string;
  elementId: string;
  quantity?: number;
  notes?: string;
}

/**
 * Result of creating estimate items from library selections
 */
export interface EstimateCreationResult {
  elements: EstimateElement[];
  detailItems: EstimateDetailItem[];
  usageRecords: EstimateLibraryUsage[];
  errors?: EstimateCreationError[];
  warnings?: string[];
}

/**
 * Error that occurred during estimate creation
 */
export interface EstimateCreationError {
  itemId: string;
  itemCode: string;
  itemName: string;
  error: string;
  details?: any;
}

/**
 * Integration error type
 */
export type IntegrationError = EstimateCreationError;

/**
 * Mapping of hierarchy elements for intelligent grouping
 */
export interface HierarchyMapping {
  structure: EstimateStructure;
  element: EstimateElement;
  divisions: Map<string, EstimateElement>;
  sections: Map<string, EstimateElement>;
  assemblies: Map<string, EstimateElement>;
  divisionElements: Map<string, EstimateElement>;
  sectionElements: Map<string, EstimateElement>;
  assemblyElements: Map<string, EstimateElement>;
}

/**
 * Library usage tracking record
 */
export interface EstimateLibraryUsage {
  id?: string;
  project_id: string;
  estimate_structure_id: string;
  estimate_element_id: string;
  estimate_detail_item_id?: string;
  library_item_id: string;
  selected_at?: Date;
  selected_by?: string;
  quantity: number;
  unit: string;
  rate_manual?: number;
  rate_calculated?: number;
  rate_used: number;
  factor_breakdown?: FactorBreakdown;
  material_cost?: number;
  labour_cost?: number;
  equipment_cost?: number;
  notes?: string;
}

/**
 * Breakdown of factors contributing to calculated rate
 */
export interface FactorBreakdown {
  materials: MaterialFactorDetail[];
  labour: LabourFactorDetail[];
  equipment: EquipmentFactorDetail[];
  totalMaterialCost: number;
  totalLabourCost: number;
  totalEquipmentCost: number;
  totalCost: number;
}

/**
 * Material factor detail
 */
export interface MaterialFactorDetail {
  catalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  quantityPerUnit: number;
  wastagePercentage: number;
  unitRate: number;
  totalQuantity: number;
  totalCost: number;
}

/**
 * Labour factor detail
 */
export interface LabourFactorDetail {
  catalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  trade: string;
  skillLevel: string;
  hoursPerUnit: number;
  productivityFactor: number;
  hourlyRate: number;
  totalHours: number;
  totalCost: number;
}

/**
 * Equipment factor detail
 */
export interface EquipmentFactorDetail {
  catalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  category: string;
  hoursPerUnit: number;
  utilizationFactor: number;
  hourlyRate: number;
  totalHours: number;
  totalCost: number;
}

/**
 * Hierarchy template for reusable structures
 */
export interface HierarchyTemplate {
  id: string;
  name: string;
  description?: string;
  project_type?: 'residential' | 'commercial' | 'industrial';
  hierarchy_structure: HierarchyTemplateStructure;
  usage_count: number;
  last_used_at?: Date;
  created_by?: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Structure of a hierarchy template
 */
export interface HierarchyTemplateStructure {
  structures: TemplateStructure[];
}

/**
 * Template structure definition
 */
export interface TemplateStructure {
  name: string;
  elements: TemplateElement[];
}

/**
 * Template element definition
 */
export interface TemplateElement {
  name: string;
  libraryItems: string[]; // Array of library item IDs
}

/**
 * Options for library item selection
 */
export interface LibrarySelectionOptions {
  allowMultiple?: boolean;
  showFactorPreview?: boolean;
  filterByDivision?: string[];
  filterBySection?: string[];
  filterByAssembly?: string[];
  excludeItems?: string[];
  projectType?: 'residential' | 'commercial' | 'industrial';
}

/**
 * Library integration configuration
 */
export interface LibraryIntegrationConfig {
  enableIntelligentGrouping: boolean;
  autoCalculateRates: boolean;
  trackUsage: boolean;
  allowManualRateOverride: boolean;
  defaultWastagePercentage: number;
  defaultProductivityFactor: number;
  defaultUtilizationFactor: number;
}