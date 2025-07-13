import { LibraryItem } from '@/features/library/types/library';

export const createLibraryItem = (overrides?: Partial<LibraryItem>): LibraryItem => ({
  id: `item-${Math.random().toString(36).substr(2, 9)}`,
  code: `TEST${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  name: `Test Library Item ${Math.floor(Math.random() * 100)}`,
  description: `Description for test item ${Math.floor(Math.random() * 100)}`,
  unit: ['m²', 'm³', 'kg', 'pcs', 'hr', 'ton'][Math.floor(Math.random() * 6)],
  assembly_id: `assembly-${Math.floor(Math.random() * 10)}`,
  status: ['draft', 'confirmed', 'actual'][Math.floor(Math.random() * 3)] as 'draft' | 'confirmed' | 'actual',
  version: 1,
  is_active: true,
  created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_by: 'test-user',
  confirmed_at: null,
  confirmed_by: null,
  materials: [],
  labour: [],
  equipment: [],
  usage_count_30d: Math.floor(Math.random() * 20),
  last_used_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export interface Factor {
  item_id: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export const createFactor = (overrides?: Partial<Factor>): Factor => ({
  item_id: `CAT${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  quantity: Math.round((Math.random() * 100 + 0.1) * 100) / 100,
  unit: ['kg', 'm²', 'm³', 'hr', 'pcs'][Math.floor(Math.random() * 5)],
  notes: Math.random() > 0.7 ? `Test notes ${Math.floor(Math.random() * 100)}` : undefined,
  ...overrides,
});

export const createLibraryItemWithFactors = (
  overrides?: Partial<LibraryItem>
): LibraryItem => {
  const item = createLibraryItem(overrides);
  return {
    ...item,
    materials: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () =>
      createFactor({ item_id: `MAT${Math.floor(Math.random() * 100)}` })
    ),
    labour: Array.from({ length: Math.floor(Math.random() * 3) }, () =>
      createFactor({ item_id: `LAB${Math.floor(Math.random() * 50)}` })
    ),
    equipment: Array.from({ length: Math.floor(Math.random() * 2) }, () =>
      createFactor({ item_id: `EQP${Math.floor(Math.random() * 30)}` })
    ),
  };
};

export const createLibraryItemBatch = (
  count: number,
  overrides?: Partial<LibraryItem>
): LibraryItem[] => {
  return Array.from({ length: count }, () => createLibraryItem(overrides));
};

export const createConfirmedLibraryItem = (overrides?: Partial<LibraryItem>): LibraryItem => {
  return createLibraryItemWithFactors({
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    confirmed_by: 'test-user',
    ...overrides,
  });
};

export const createDraftLibraryItem = (overrides?: Partial<LibraryItem>): LibraryItem => {
  return createLibraryItemWithFactors({
    status: 'draft',
    confirmed_at: null,
    confirmed_by: null,
    ...overrides,
  });
};

export const createActualLibraryItem = (overrides?: Partial<LibraryItem>): LibraryItem => {
  return createLibraryItemWithFactors({
    status: 'actual',
    confirmed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    confirmed_by: 'test-user',
    ...overrides,
  });
};

// Assembly factory
export interface Assembly {
  id: string;
  code: string;
  name: string;
  section_id: string;
  created_at: string;
  updated_at: string;
}

export const createAssembly = (overrides?: Partial<Assembly>): Assembly => ({
  id: `assembly-${Math.random().toString(36).substr(2, 9)}`,
  code: `ASM${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  name: `Test Assembly ${Math.floor(Math.random() * 100)}`,
  section_id: `section-${Math.floor(Math.random() * 10)}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Section factory
export interface Section {
  id: string;
  code: string;
  name: string;
  division_id: string;
  created_at: string;
  updated_at: string;
}

export const createSection = (overrides?: Partial<Section>): Section => ({
  id: `section-${Math.random().toString(36).substr(2, 9)}`,
  code: `SEC${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
  name: `Test Section ${Math.floor(Math.random() * 100)}`,
  division_id: `division-${Math.floor(Math.random() * 10)}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Division factory
export interface Division {
  id: string;
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const createDivision = (overrides?: Partial<Division>): Division => ({
  id: `division-${Math.random().toString(36).substr(2, 9)}`,
  code: `${Math.floor(Math.random() * 50) + 1}`.padStart(2, '0'),
  name: `Test Division ${Math.floor(Math.random() * 100)}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Project rates factory
export interface ProjectRates {
  project_id: string;
  materials: Record<string, number>;
  labour: Record<string, number>;
  equipment: Record<string, number>;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export const createProjectRates = (overrides?: Partial<ProjectRates>): ProjectRates => ({
  project_id: `project-${Math.random().toString(36).substr(2, 9)}`,
  materials: Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [`MAT${i.toString().padStart(3, '0')}`, Math.random() * 100 + 10])
  ),
  labour: Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`LAB${i.toString().padStart(3, '0')}`, Math.random() * 50 + 20])
  ),
  equipment: Object.fromEntries(
    Array.from({ length: 5 }, (_, i) => [`EQP${i.toString().padStart(3, '0')}`, Math.random() * 200 + 50])
  ),
  effective_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Estimate item factory
export interface EstimateItem {
  id: string;
  project_id: string;
  library_item_id: string;
  quantity: number;
  unit: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const createEstimateItem = (overrides?: Partial<EstimateItem>): EstimateItem => ({
  id: `estimate-item-${Math.random().toString(36).substr(2, 9)}`,
  project_id: `project-${Math.random().toString(36).substr(2, 9)}`,
  library_item_id: `item-${Math.random().toString(36).substr(2, 9)}`,
  quantity: Math.round((Math.random() * 1000 + 1) * 100) / 100,
  unit: ['m²', 'm³', 'kg', 'pcs', 'hr'][Math.floor(Math.random() * 5)],
  location: Math.random() > 0.3 ? `Location ${Math.floor(Math.random() * 10)}` : undefined,
  notes: Math.random() > 0.7 ? `Test notes ${Math.floor(Math.random() * 100)}` : undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Helper to create realistic test scenarios
export const createRealisticLibraryItem = (type: 'concrete' | 'steel' | 'masonry' | 'electrical'): LibraryItem => {
  const scenarios = {
    concrete: {
      code: 'CONC001',
      name: 'Concrete Foundation',
      unit: 'm³',
      materials: [
        { item_id: 'CEMENT', quantity: 300, unit: 'kg' },
        { item_id: 'SAND', quantity: 500, unit: 'kg' },
        { item_id: 'GRAVEL', quantity: 800, unit: 'kg' },
        { item_id: 'WATER', quantity: 150, unit: 'L' },
      ],
      labour: [
        { item_id: 'MASON', quantity: 2, unit: 'hr' },
        { item_id: 'HELPER', quantity: 4, unit: 'hr' },
      ],
      equipment: [
        { item_id: 'MIXER', quantity: 0.5, unit: 'hr' },
      ],
    },
    steel: {
      code: 'STEEL001',
      name: 'Steel Reinforcement',
      unit: 'kg',
      materials: [
        { item_id: 'REBAR12', quantity: 1, unit: 'kg' },
        { item_id: 'TIEWIRE', quantity: 0.02, unit: 'kg' },
      ],
      labour: [
        { item_id: 'STEELFIXER', quantity: 0.02, unit: 'hr' },
      ],
      equipment: [],
    },
    masonry: {
      code: 'MASON001',
      name: 'Brick Wall',
      unit: 'm²',
      materials: [
        { item_id: 'BRICK', quantity: 55, unit: 'pcs' },
        { item_id: 'MORTAR', quantity: 0.03, unit: 'm³' },
      ],
      labour: [
        { item_id: 'BRICKLAYER', quantity: 1.5, unit: 'hr' },
        { item_id: 'HELPER', quantity: 0.5, unit: 'hr' },
      ],
      equipment: [],
    },
    electrical: {
      code: 'ELEC001',
      name: 'Electrical Outlet Installation',
      unit: 'pcs',
      materials: [
        { item_id: 'OUTLET', quantity: 1, unit: 'pcs' },
        { item_id: 'WIRE12AWG', quantity: 3, unit: 'm' },
        { item_id: 'CONDUIT', quantity: 1, unit: 'm' },
      ],
      labour: [
        { item_id: 'ELECTRICIAN', quantity: 0.5, unit: 'hr' },
      ],
      equipment: [],
    },
  };

  const scenario = scenarios[type];
  return createLibraryItem({
    code: scenario.code,
    name: scenario.name,
    unit: scenario.unit,
    status: 'confirmed',
    materials: scenario.materials as Factor[],
    labour: scenario.labour as Factor[],
    equipment: scenario.equipment as Factor[],
  });
};