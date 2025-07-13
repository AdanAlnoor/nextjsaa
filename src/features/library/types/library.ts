// Library Item Status Workflow
export type LibraryItemStatus =
  | "draft"     // Initial state - factors being added
  | "incomplete" // Missing required factors (deprecated - using flexible validation)
  | "complete"   // All required factors added but not confirmed  
  | "confirmed"  // All factors confirmed and validated
  | "actual"     // Part of the Actual Library (production ready)

// Factor Types
export interface MaterialFactor {
  id: string
  materialCatalogueId: string // References material_catalogue
  materialCode: string        // Denormalized (MAT-CEM-001)
  materialName: string        // Denormalized
  unit: string               // Denormalized
  quantityPerUnit: number    // Factor specific
  wastagePercentage: number  // Factor specific
  currentPrice?: number      // Project-specific pricing
  specifications?: string    // Denormalized
  gradeStandard?: string    // Denormalized
  createdAt: string
  updatedAt: string
}

export interface LaborFactor {
  id: string
  laborCatalogueId: string  // References labor_catalogue
  laborCode: string         // Denormalized (LAB-MSN-001)
  laborName: string         // Denormalized
  trade: string            // Denormalized
  skillLevel: string       // Denormalized
  hoursPerUnit: number     // Factor specific
  currentRate?: number     // Project-specific pricing
  qualifications?: string  // Denormalized
  createdAt: string
  updatedAt: string
}

export interface EquipmentFactor {
  id: string
  equipmentCatalogueId: string // References equipment_catalogue
  equipmentCode: string        // Denormalized (EQP-CON-MIX)
  equipmentName: string        // Denormalized
  category: string            // Denormalized
  capacity?: string           // Denormalized
  hoursPerUnit: number       // Factor specific
  currentRate?: number       // Project-specific pricing
  specifications?: string    // Denormalized
  powerRequirements?: string // Denormalized
  createdAt: string
  updatedAt: string
}

// Validation Interface
export interface LibraryItemValidation {
  hasMaterials: boolean
  hasLabor: boolean
  hasEquipment: boolean
  isComplete: boolean
  missingFactors: string[]
  lastValidated: string
  validatedBy?: string
}

// Main Library Item Interface
export interface LibraryItem {
  id: string
  code: string // 4-level code (XX.XX.XX.XX)
  name: string
  description: string
  unit: string
  specifications?: string
  wastagePercentage: number
  productivityNotes?: string
  materials: MaterialFactor[]
  labor: LaborFactor[]
  equipment: EquipmentFactor[]

  // Status and Validation
  status: LibraryItemStatus
  validation: LibraryItemValidation

  // Workflow tracking
  createdAt: string
  lastModified: string
  confirmedAt?: string
  confirmedBy?: string
  actualLibraryDate?: string

  isActive: boolean
}

// Hierarchy Interfaces
export interface Assembly {
  id: string
  code: string // 3-level code (XX.XX.XX)
  name: string
  description?: string
  items: LibraryItem[]
  sortOrder: number
  totalItems: number
  completedItems: number
  confirmedItems: number
  actualLibraryItems: number
}

export interface Section {
  id: string
  code: string // 2-level code (XX.XX)
  name: string
  description?: string
  assemblies: Assembly[]
  sortOrder: number
  totalItems: number
  completedItems: number
  confirmedItems: number
  actualLibraryItems: number
}

export interface Division {
  id: string
  code: string // 1-level code (XX)
  name: string
  description?: string
  sections: Section[]
  sortOrder: number
  totalItems: number
  completedItems: number
  confirmedItems: number
  actualLibraryItems: number
}

// Catalogue Interfaces
export interface MaterialCatalogueItem {
  id: string
  code: string
  name: string
  category: string
  unit: string
  specifications?: string
  gradeStandard?: string
  workCategory?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface LaborCatalogueItem {
  id: string
  code: string
  name: string
  category: string
  skillLevel: string
  tradeType: string
  qualifications?: string
  workCategory?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface EquipmentCatalogueItem {
  id: string
  code: string
  name: string
  category: string
  capacity?: string
  specifications?: string
  powerRequirements?: string
  workCategory?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// Usage Tracking
export interface LibraryItemUsage {
  id: string
  libraryItemId: string
  userId: string
  projectId?: string
  usageType: 'view' | 'edit' | 'estimate' | 'export' | 'confirm' | 'delete'
  usageDate: string
  metadata?: Record<string, any>
}

// Actual Library Management
export interface ActualLibrarySnapshot {
  id: string
  name: string
  description?: string
  version: string
  totalItems: number
  createdAt: string
  createdBy: string
  isActive: boolean
}

export interface ActualLibraryItem {
  id: string
  snapshotId: string
  libraryItemId: string
  itemData: LibraryItem
  materialFactors: MaterialFactor[]
  laborFactors: LaborFactor[]
  equipmentFactors: EquipmentFactor[]
  createdAt: string
}

// Project-Specific Pricing (if exists)
export interface ProjectMaterialPricing {
  id: string
  projectId: string
  materialCatalogueId: string
  unitPrice: number
  currency: string
  effectiveDate: string
  supplierReference?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectLaborPricing {
  id: string
  projectId: string
  laborCatalogueId: string
  hourlyRate: number
  currency: string
  effectiveDate: string
  createdAt: string
  updatedAt: string
}

export interface ProjectEquipmentPricing {
  id: string
  projectId: string
  equipmentCatalogueId: string
  hourlyRate: number
  currency: string
  effectiveDate: string
  createdAt: string
  updatedAt: string
}

// API Request/Response Types
export interface CreateDivisionRequest {
  name: string
  description?: string
  code?: string
}

export interface CreateSectionRequest {
  name: string
  description?: string
  code?: string
  divisionId?: string
  divisionCode?: string
}

export interface CreateAssemblyRequest {
  name: string
  description?: string
  code?: string
  sectionId?: string
  sectionCode?: string
}

export interface CreateLibraryItemRequest {
  name: string
  description?: string
  unit: string
  specifications?: string
  wastagePercentage?: number
  productivityNotes?: string
  code?: string
  assemblyId?: string
  assemblyCode?: string
}

export interface CreateMaterialFactorRequest {
  materialCatalogueId: string
  quantityPerUnit: number
  wastagePercentage: number
}

export interface CreateLaborFactorRequest {
  laborCatalogueId: string
  hoursPerUnit: number
}

export interface CreateEquipmentFactorRequest {
  equipmentCatalogueId: string
  hoursPerUnit: number
}

export interface UpdateMaterialFactorRequest {
  quantityPerUnit?: number
  wastagePercentage?: number
}

export interface UpdateLaborFactorRequest {
  hoursPerUnit?: number
}

export interface UpdateEquipmentFactorRequest {
  hoursPerUnit?: number
}

export interface UpdateLibraryItemRequest {
  name?: string
  description?: string
  unit?: string
  specifications?: string
  wastagePercentage?: number
  productivityNotes?: string
}

export interface ConfirmLibraryItemRequest {
  confirmationNotes?: string
}

export interface CreateActualLibrarySnapshotRequest {
  name: string
  description?: string
  version: string
}

// Search and Filter Types
export interface LibrarySearchFilters {
  status?: LibraryItemStatus[]
  divisionCodes?: string[]
  sectionCodes?: string[]
  assemblyCodes?: string[]
  hasMaterials?: boolean
  hasLabor?: boolean
  hasEquipment?: boolean
  search?: string
}

export interface CatalogueSearchFilters {
  category?: string
  search?: string
  isActive?: boolean
  workCategory?: string
}

export interface LaborCatalogueSearchFilters extends CatalogueSearchFilters {
  skillLevel?: string
  tradeType?: string
}

export interface EquipmentCatalogueSearchFilters extends CatalogueSearchFilters {
  category?: string
}

// Statistics and Analytics
export interface LibraryStatistics {
  totalItems: number
  draftItems: number
  completeItems: number
  confirmedItems: number
  actualLibraryItems: number
  totalMaterialFactors: number
  totalLaborFactors: number
  totalEquipmentFactors: number
  completionPercentage: number
}

export interface DivisionStatistics extends LibraryStatistics {
  divisionCode: string
  divisionName: string
  sections: SectionStatistics[]
}

export interface SectionStatistics extends LibraryStatistics {
  sectionCode: string
  sectionName: string
  assemblies: AssemblyStatistics[]
}

export interface AssemblyStatistics extends LibraryStatistics {
  assemblyCode: string
  assemblyName: string
}

// Component Props Types
export interface LibraryBrowserProps {
  initialFilters?: LibrarySearchFilters
  onItemSelect?: (item: LibraryItem) => void
  showFilters?: boolean
  compactView?: boolean
}

export interface ItemFactorEditorProps {
  item: LibraryItem
  onBack: () => void
  onSave: () => void
  onItemUpdate?: () => void
  readonly?: boolean
}

export interface CatalogueManagerProps {
  activeTab?: 'materials' | 'labor' | 'equipment'
  onItemSelect?: (item: MaterialCatalogueItem | LaborCatalogueItem | EquipmentCatalogueItem) => void
}

// Error Types
export interface LibraryError {
  code: string
  message: string
  details?: Record<string, any>
}

export class LibraryValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message)
    this.name = 'LibraryValidationError'
  }
}

// Unified Factor Management Types
export type FactorType = 'material' | 'labor' | 'equipment'

export interface UnifiedFactor {
  id: string
  type: FactorType
  code: string
  name: string
  category?: string
  unit?: string
  quantityPerUnit?: number
  hoursPerUnit?: number
  wastagePercentage?: number
  rate?: number
  specifications?: string
  skillLevel?: string
  trade?: string
  capacity?: string
  createdAt: string
  updatedAt: string
}

export interface BulkFactorOperation {
  operation: 'delete' | 'update'
  factorIds: string[]
  factorType: FactorType
  data?: Partial<UnifiedFactor>
}

export interface FactorSearchFilters {
  search?: string
  type?: FactorType[]
  category?: string
  workCategory?: string
  hasWastage?: boolean
}

// Utility Types
export type LibraryItemWithoutFactors = Omit<LibraryItem, 'materials' | 'labor' | 'equipment'>
export type LibraryItemSummary = Pick<LibraryItem, 'id' | 'code' | 'name' | 'status' | 'validation'>
export type CatalogueItem = MaterialCatalogueItem | LaborCatalogueItem | EquipmentCatalogueItem
export type Factor = MaterialFactor | LaborFactor | EquipmentFactor

// Helper type guards
export const isMaterialFactor = (factor: Factor): factor is MaterialFactor => {
  return 'materialCode' in factor
}

export const isLaborFactor = (factor: Factor): factor is LaborFactor => {
  return 'laborCode' in factor
}

export const isEquipmentFactor = (factor: Factor): factor is EquipmentFactor => {
  return 'equipmentCode' in factor
}

export const isMaterialCatalogueItem = (item: CatalogueItem): item is MaterialCatalogueItem => {
  return 'unit' in item && 'gradeStandard' in item
}

export const isLaborCatalogueItem = (item: CatalogueItem): item is LaborCatalogueItem => {
  return 'skillLevel' in item && 'tradeType' in item
}

export const isEquipmentCatalogueItem = (item: CatalogueItem): item is EquipmentCatalogueItem => {
  return 'capacity' in item && 'powerRequirements' in item
}

// Unified Factor Helper Functions
export const convertToUnifiedFactor = (factor: Factor): UnifiedFactor => {
  if (isMaterialFactor(factor)) {
    return {
      id: factor.id,
      type: 'material',
      code: factor.materialCode,
      name: factor.materialName,
      unit: factor.unit,
      quantityPerUnit: factor.quantityPerUnit,
      wastagePercentage: factor.wastagePercentage,
      rate: factor.currentPrice,
      specifications: factor.specifications,
      createdAt: factor.createdAt,
      updatedAt: factor.updatedAt
    }
  } else if (isLaborFactor(factor)) {
    return {
      id: factor.id,
      type: 'labor',
      code: factor.laborCode,
      name: factor.laborName,
      trade: factor.trade,
      skillLevel: factor.skillLevel,
      hoursPerUnit: factor.hoursPerUnit,
      rate: factor.currentRate,
      specifications: factor.qualifications,
      createdAt: factor.createdAt,
      updatedAt: factor.updatedAt
    }
  } else if (isEquipmentFactor(factor)) {
    return {
      id: factor.id,
      type: 'equipment',
      code: factor.equipmentCode,
      name: factor.equipmentName,
      category: factor.category,
      capacity: factor.capacity,
      hoursPerUnit: factor.hoursPerUnit,
      rate: factor.currentRate,
      specifications: factor.specifications,
      createdAt: factor.createdAt,
      updatedAt: factor.updatedAt
    }
  }
  throw new Error('Unknown factor type')
}

export const getFactorTypeIcon = (type: FactorType): string => {
  switch (type) {
    case 'material': return '🔨'
    case 'labor': return '👥'
    case 'equipment': return '🚛'
    default: return '📦'
  }
}

export const getFactorTypeColor = (type: FactorType): string => {
  switch (type) {
    case 'material': return 'blue'
    case 'labor': return 'green' 
    case 'equipment': return 'orange'
    default: return 'gray'
  }
}

export const getFactorTypeBadgeClass = (type: FactorType): string => {
  switch (type) {
    case 'material': return 'bg-blue-100 text-blue-700 border-blue-300'
    case 'labor': return 'bg-green-100 text-green-700 border-green-300'
    case 'equipment': return 'bg-orange-100 text-orange-700 border-orange-300'
    default: return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

export const getFactorTypeRowClass = (type: FactorType): string => {
  switch (type) {
    case 'material': return 'bg-blue-50/30 hover:bg-blue-50/50'
    case 'labor': return 'bg-green-50/30 hover:bg-green-50/50'
    case 'equipment': return 'bg-orange-50/30 hover:bg-orange-50/50'
    default: return 'hover:bg-muted/50'
  }
}

// Work Category Constants
export const WORK_CATEGORIES = [
  'Concrete Work',
  'Masonry & Blockwork',
  'Steel & Reinforcement',
  'Carpentry & Timber',
  'Roofing & Waterproofing',
  'Electrical Work',
  'Plumbing & HVAC',
  'Finishing Work',
  'Earthwork & Excavation',
  'General Construction'
] as const

export type WorkCategory = typeof WORK_CATEGORIES[number]

// Work Category Helper Functions
export const getWorkCategoryIcon = (category: string): string => {
  switch (category) {
    case 'Concrete Work': return '🏗️'
    case 'Masonry & Blockwork': return '🧱'
    case 'Steel & Reinforcement': return '🔩'
    case 'Carpentry & Timber': return '🪵'
    case 'Roofing & Waterproofing': return '🏠'
    case 'Electrical Work': return '⚡'
    case 'Plumbing & HVAC': return '🔧'
    case 'Finishing Work': return '🎨'
    case 'Earthwork & Excavation': return '🚜'
    case 'General Construction': return '🔨'
    default: return '🏗️'
  }
}

export const getWorkCategoryColor = (category: string): string => {
  switch (category) {
    case 'Concrete Work': return 'gray'
    case 'Masonry & Blockwork': return 'red'
    case 'Steel & Reinforcement': return 'slate'
    case 'Carpentry & Timber': return 'amber'
    case 'Roofing & Waterproofing': return 'indigo'
    case 'Electrical Work': return 'yellow'
    case 'Plumbing & HVAC': return 'cyan'
    case 'Finishing Work': return 'pink'
    case 'Earthwork & Excavation': return 'orange'
    case 'General Construction': return 'blue'
    default: return 'gray'
  }
}

// ==========================================
// PHASE 2: LIBRARY MANAGEMENT SERVICE TYPES
// ==========================================

// Enhanced status type (keeping backward compatibility)
export type LibraryManagementStatus = LibraryItemStatus;

// Version control types
export interface LibraryItemVersion {
  id: string;
  library_item_id: string;
  version_number: number;
  data: LibraryItem;
  created_at: string;
  created_by?: string;
  change_note?: string;
}

// Bulk operation types
export interface BulkOperation {
  successful: number;
  failed: number;
  errors: string[];
  details?: Record<string, number>;
}

// Search and filter for management
export interface LibraryManagementFilter {
  query?: string;
  status?: LibraryManagementStatus;
  divisionId?: string;
  sectionId?: string;
  assemblyId?: string;
  isActive?: boolean;
  hasFactors?: boolean;
  showDeleted?: boolean;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Management search parameters
export interface LibraryManagementSearchParams extends LibraryManagementFilter {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Management search result
export interface LibraryManagementSearchResult {
  items: LibraryItem[];
  total: number;
  hasMore: boolean;
}

// Quick add from estimate
export interface QuickAddFromEstimateData {
  name: string;
  division_id?: string;
  section_id?: string;
  assembly_id?: string;
  unit: string;
  material_rate?: string;
  labour_rate?: string;
  equipment_rate?: string;
  quick_add_context: {
    element_id: string;
    search_term: string;
    created_from: string;
    project_id?: string;
  };
}

// Clone operation
export interface CloneRequest {
  sourceId: string;
  newCode: string;
  newName: string;
  modifications?: Partial<LibraryItem>;
}

export interface BatchCloneRequest {
  cloneRequests: CloneRequest[];
}

// Version comparison
export interface VersionComparison {
  version1: LibraryItemVersion;
  version2: LibraryItemVersion;
  differences: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

// Bulk action types
export interface BulkActionRequest {
  itemIds: string[];
  action: 'confirm' | 'revert_to_draft' | 'mark_actual' | 'delete' | 'restore';
  metadata?: Record<string, any>;
}

// Status transition validation
export interface StatusTransition {
  from: LibraryManagementStatus;
  to: LibraryManagementStatus;
  isValid: boolean;
  requirements: string[];
  missingRequirements?: string[];
}

// Enhanced validation interface for management
export interface LibraryManagementValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  requiredFields?: string[];
  missingFactors?: string[];
}

// Item statistics
export interface LibraryItemStatistics {
  usageCount: number;
  lastUsedAt?: Date;
  projectsUsedIn: number;
  averageQuantity: number;
  totalEstimates?: number;
  lastModifiedAt?: Date;
}

// Audit trail
export interface LibraryItemAuditLog {
  id: string;
  library_item_id: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  performed_by: string;
  performed_at: string;
  reason?: string;
  version_before?: number;
  version_after?: number;
}

// Management service options
export interface LibraryManagementOptions {
  enableVersionControl?: boolean;
  enableAuditLog?: boolean;
  enableBulkOperations?: boolean;
  maxVersionsToKeep?: number;
  enableQuickAdd?: boolean;
}

// Management component props
export interface LibraryManagementProps {
  initialFilters?: LibraryManagementFilter;
  onItemSelect?: (item: LibraryItem) => void;
  onItemCreate?: (item: LibraryItem) => void;
  onItemUpdate?: (item: LibraryItem) => void;
  onItemDelete?: (itemId: string) => void;
  showBulkActions?: boolean;
  showVersionHistory?: boolean;
  allowQuickAdd?: boolean;
  readOnly?: boolean;
}

// Dialog component props
export interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (item: LibraryItem) => void;
  initialData?: Partial<LibraryItem>;
  preselectedAssembly?: string;
}

export interface CloneItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItemId: string;
  onSuccess: (item: LibraryItem) => void;
}

export interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  onRestore?: (versionId: string) => void;
}

export interface BulkActionBarProps {
  selectedCount: number;
  onBulkAction: (action: string, itemIds?: string[]) => Promise<void>;
  onClearSelection: () => void;
  availableActions?: string[];
}

export interface FilterPanelProps {
  filters: LibraryManagementFilter;
  onFilterChange: (filters: LibraryManagementFilter) => void;
  onClear: () => void;
  divisions?: Array<{ id: string; name: string; code: string }>;
  sections?: Array<{ id: string; name: string; code: string }>;
  assemblies?: Array<{ id: string; name: string; code: string }>;
}

export interface QuickAddFromEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchTerm: string;
  elementId: string;
  onSuccess: (itemId: string) => void;
  divisions: Array<{ id: string; name: string; code: string }>;
}