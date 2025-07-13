import type {
  LibraryHierarchyNode,
  LibraryItemSelection,
  FactorCalculation,
  MaterialScheduleItem,
  LabourScheduleItem,
  EquipmentScheduleItem,
  BQColumnData,
} from '../../types';

/**
 * Test data factory functions
 */

export const createTestLibraryItem = (overrides: Partial<any> = {}) => ({
  id: 'test-item-1',
  code: '03.10.10.01',
  name: 'Concrete Grade 25 strip foundation',
  unit: 'm³',
  description: 'Supply and place grade 25 concrete for strip foundations',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestLibraryHierarchyNode = (overrides: Partial<LibraryHierarchyNode> = {}): LibraryHierarchyNode => ({
  divisionId: 'div-1',
  divisionCode: '03',
  divisionName: 'Concrete',
  sectionId: 'sec-1',
  sectionCode: '03.10',
  sectionName: 'Concrete Materials',
  assemblyId: 'asm-1',
  assemblyCode: '03.10.10',
  assemblyName: 'Ready Mix Concrete',
  itemId: 'item-1',
  itemCode: '03.10.10.01',
  itemName: 'Concrete Grade 25 strip foundation',
  path: '03.10.10.01',
  unit: 'm³',
  ...overrides,
});

export const createTestEstimateStructure = (overrides: Partial<any> = {}) => ({
  id: 'test-structure-1',
  project_id: 'test-project-1',
  name: 'Main House',
  description: 'Main residential building',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestEstimateElement = (overrides: Partial<any> = {}) => ({
  id: 'test-element-1',
  structure_id: 'test-structure-1',
  name: 'Substructure',
  description: 'Below ground construction',
  hierarchy_level: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestFactorCalculation = (overrides: Partial<FactorCalculation> = {}): FactorCalculation => ({
  libraryItemId: 'item-1',
  libraryItemCode: '03.10.10.01',
  libraryItemName: 'Concrete Grade 25',
  unit: 'm³',
  materialCost: 850,
  labourCost: 450,
  equipmentCost: 200,
  totalRate: 1500,
  breakdown: {
    materials: [
      {
        factor: {} as any,
        catalogue: {
          id: 'mat-1',
          code: 'CEM-001',
          name: 'Cement',
          unit: 'bag',
          rate: 50,
        } as any,
        quantityPerUnit: 7,
        wastagePercentage: 5,
        wastageMultiplier: 1.05,
        effectiveQuantity: 7.35,
        unitRate: 50,
        totalCost: 367.5,
      },
    ],
    labour: [
      {
        factor: {} as any,
        catalogue: {
          id: 'lab-1',
          code: 'MAS-001',
          name: 'Mason',
          trade: 'Masonry',
          skill_level: 'Skilled',
          hourly_rate: 150,
        } as any,
        hoursPerUnit: 2,
        productivityFactor: 0.85,
        effectiveHours: 2.35,
        hourlyRate: 150,
        totalCost: 352.5,
      },
    ],
    equipment: [
      {
        factor: {} as any,
        catalogue: {
          id: 'eqp-1',
          code: 'MIX-001',
          name: 'Concrete Mixer',
          category: 'Mixing Equipment',
          hourly_rate: 200,
        } as any,
        hoursPerUnit: 0.5,
        utilizationFactor: 0.75,
        billableHours: 0.67,
        hourlyRate: 200,
        totalCost: 134,
      },
    ],
    summary: {
      materialCost: 850,
      materialPercentage: 56.67,
      labourCost: 450,
      labourPercentage: 30,
      equipmentCost: 200,
      equipmentPercentage: 13.33,
      totalCost: 1500,
    },
  },
  ...overrides,
});

export const createTestMaterialScheduleItem = (overrides: Partial<MaterialScheduleItem> = {}): MaterialScheduleItem => ({
  project_id: 'test-project-1',
  project_name: 'Test Project',
  material_id: 'mat-1',
  material_code: 'CEM-001',
  material_name: 'Cement',
  material_unit: 'bag',
  material_category: 'Concrete Materials',
  base_quantity: 700,
  wastage_factor: 1.05,
  total_quantity_with_wastage: 735,
  unit_rate_market: 50,
  total_amount_market: 36750,
  source_items: ['03.10.10.01 - Concrete Grade 25'],
  source_item_count: 1,
  calculated_at: new Date(),
  ...overrides,
});

export const createTestBQColumnData = (overrides: Partial<BQColumnData> = {}): BQColumnData => ({
  id: 'bq-1',
  codeIndex: '1.1.03.10.10.01',
  level: 5,
  description: 'Concrete Grade 25 strip foundation',
  quantity: 100,
  unit: 'm³',
  rateManual: 1600,
  rateCalculated: 1500,
  amountManual: 160000,
  amountCalculated: 150000,
  isFromLibrary: true,
  libraryItemId: 'item-1',
  libraryCode: '03.10.10.01',
  libraryPath: '03.10.10',
  children: [],
  ...overrides,
});

export const createTestProject = (overrides: Partial<any> = {}) => ({
  id: 'test-project-1',
  name: 'Test Residential Project',
  description: 'A test project for library integration',
  project_type: 'residential',
  company_id: 'test-company-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a complete test hierarchy
 */
export const createTestHierarchy = () => {
  const items = [
    createTestLibraryHierarchyNode({
      itemCode: '02.10.10.03',
      itemName: 'Survey and layout',
      divisionCode: '02',
      divisionName: 'Sitework',
      sectionCode: '02.10',
      sectionName: 'Site Preparation',
      assemblyCode: '02.10.10',
      assemblyName: 'Site Clearing',
    }),
    createTestLibraryHierarchyNode({
      itemCode: '03.10.10.01',
      itemName: 'Concrete Grade 25 strip foundation',
    }),
    createTestLibraryHierarchyNode({
      itemCode: '03.10.10.02',
      itemName: 'Concrete Grade 30 columns',
    }),
    createTestLibraryHierarchyNode({
      itemCode: '03.20.15.01',
      itemName: 'Precast Concrete Beam',
      sectionCode: '03.20',
      sectionName: 'Precast Concrete',
      assemblyCode: '03.20.15',
      assemblyName: 'Precast Beams',
    }),
  ];

  return items;
};

/**
 * Create test library selections
 */
export const createTestLibrarySelections = (): LibraryItemSelection[] => {
  return [
    {
      libraryItem: createTestLibraryItem({
        id: 'item-1',
        code: '03.10.10.01',
        name: 'Concrete Grade 25',
      }),
      targetStructureId: 'test-structure-1',
      targetElementId: 'test-element-1',
      quantity: 100,
    },
    {
      libraryItem: createTestLibraryItem({
        id: 'item-2',
        code: '03.10.10.02',
        name: 'Concrete Grade 30',
      }),
      targetStructureId: 'test-structure-1',
      targetElementId: 'test-element-1',
      quantity: 50,
    },
  ];
};