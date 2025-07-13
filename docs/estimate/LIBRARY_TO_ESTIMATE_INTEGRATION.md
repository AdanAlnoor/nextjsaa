# Library-to-Estimate Integration Implementation Guide

## Overview

This document provides a comprehensive implementation guide for integrating the admin library's 4-level hierarchy with the estimate system. The integration will allow users to select library items to automatically create estimate hierarchies with intelligent grouping and cost calculations.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Feature-Based Implementation Guide](#feature-based-implementation-guide)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Database Schema Changes](#database-schema-changes)
5. [Implementation Components](#implementation-components)
6. [API Endpoints](#api-endpoints)
7. [Testing Strategy](#testing-strategy)
8. [Migration Plan](#migration-plan)

## System Architecture

### Current State Analysis

#### Library System (4-Level Hierarchy)
```
Division (Level 1) → Section (Level 2) → Assembly (Level 3) → Item (Level 4)
Example: 02 → 02.10 → 02.10.10 → 02.10.10.01
```

#### Estimate System (3-Level Hierarchy)
```
Structure (Level 0) → Element (Level 1) → Detail Item (Level 2)
Example: Main House → Substructure → Excavation Work
```

### Integration Strategy

The integration will map the library's 4-level hierarchy to the estimate's 6-level structure with intelligent grouping:

```
Estimate Structure (Level 0) - Project structures (Main House, Banda, Parking)
Estimate Element (Level 1) - Construction phases (Substructure, Walling, External Finish)
Library Division (Level 2) - Work categories (02 - Sitework, 03 - Concrete, 04 - Masonry)
Library Section (Level 3) - Work types (02.10 - Site Preparation, 03.10 - Concrete Materials)
Library Assembly (Level 4) - Work groups (02.10.10 - Site Clearing, 03.10.10 - Ready Mix Concrete)
Library Item (Level 5) - Specific items (02.10.10.03 - Survey and layout)
```

### Intelligent Grouping Rules

The system will intelligently group library items to minimize duplication:

1. **Same Division + Section + Assembly**: Items group under one hierarchy branch
2. **Same Division + Section, Different Assembly**: Items share Division and Section, separate Assembly branches
3. **Same Division, Different Section**: Items share Division, separate Section branches
4. **Different Division**: Items get separate Division branches

## Visual Examples of Intelligent Grouping

### Example 1: Related Items - Same Division & Section

**📋 Library Items Selected:**
```
✓ 03.10.10.01 - Concrete Grade 25 strip foundation
  └── Division: 03 - Concrete
  └── Section: 03.10 - Concrete Materials
  └── Assembly: 03.10.10 - Ready Mix Concrete

✓ 03.10.10.02 - Concrete Grade 30 columns
  └── Division: 03 - Concrete
  └── Section: 03.10 - Concrete Materials
  └── Assembly: 03.10.10 - Ready Mix Concrete

✓ 03.10.10.03 - Concrete Grade 35 beams
  └── Division: 03 - Concrete
  └── Section: 03.10 - Concrete Materials
  └── Assembly: 03.10.10 - Ready Mix Concrete
```

**🏗️ Resulting Estimate Structure:**
```
🏠 Structure: Main House (3 items)
   └── 🏗️ Element: Substructure (3 items)
       └── 📁 03 - Concrete (3 items)
           └── 📂 03.10 - Concrete Materials (3 items)
               └── 📋 03.10.10 - Ready Mix Concrete (3 items)
                   ├── 📄 03.10.10.01 - Concrete Grade 25 strip foundation
                   ├── 📄 03.10.10.02 - Concrete Grade 30 columns
                   └── 📄 03.10.10.03 - Concrete Grade 35 beams
```

**💡 Result:** All items grouped under one complete hierarchy branch - no duplication.

### Example 2: Same Division, Different Sections

**📋 Library Items Selected:**
```
✓ 03.10.10.01 - Concrete Grade 25 strip foundation
  └── Division: 03 - Concrete, Section: 03.10 - Concrete Materials

✓ 03.20.15.01 - Concrete Precast Beam
  └── Division: 03 - Concrete, Section: 03.20 - Precast Concrete

✓ 03.30.10.01 - Concrete Block Foundation
  └── Division: 03 - Concrete, Section: 03.30 - Cast-in-Place Concrete
```

**🏗️ Resulting Estimate Structure:**
```
🏠 Structure: Main House (3 items)
   └── 🏗️ Element: Substructure (3 items)
       └── 📁 03 - Concrete (3 items)
           ├── 📂 03.10 - Concrete Materials (1 item)
           │   └── 📋 03.10.10 - Ready Mix Concrete (1 item)
           │       └── 📄 03.10.10.01 - Concrete Grade 25 strip foundation
           ├── 📂 03.20 - Precast Concrete (1 item)
           │   └── 📋 03.20.15 - Precast Beams (1 item)
           │       └── 📄 03.20.15.01 - Concrete Precast Beam
           └── 📂 03.30 - Cast-in-Place Concrete (1 item)
               └── 📋 03.30.10 - Foundation Concrete (1 item)
                   └── 📄 03.30.10.01 - Concrete Block Foundation
```

**💡 Result:** Division shared, separate Section branches created.

### Example 3: Multiple Structures with Intelligent Grouping

**📋 Library Items Selected:**
```
✓ 02.10.10.03 - Survey and layout (Main House)
✓ 03.10.10.01 - Concrete Grade 25 strip foundation (Main House)
✓ 03.10.10.02 - Concrete Grade 30 columns (Banda)
✓ 04.10.10.01 - Masonry retaining wall (Parking)
```

**🏗️ Resulting Estimate Structure:**
```
🏠 Structure: Main House (2 items)
   └── 🏗️ Element: Substructure (2 items)
       ├── 📁 02 - Sitework (1 item)
       │   └── 📂 02.10 - Site Preparation (1 item)
       │       └── 📋 02.10.10 - Site Clearing (1 item)
       │           └── 📄 02.10.10.03 - Survey and layout
       └── 📁 03 - Concrete (1 item)
           └── 📂 03.10 - Concrete Materials (1 item)
               └── 📋 03.10.10 - Ready Mix Concrete (1 item)
                   └── 📄 03.10.10.01 - Concrete Grade 25 strip foundation

🏘️ Structure: Banda (1 item)
   └── 🏗️ Element: Substructure (1 item)
       └── 📁 03 - Concrete (1 item)
           └── 📂 03.10 - Concrete Materials (1 item)
               └── 📋 03.10.10 - Ready Mix Concrete (1 item)
                   └── 📄 03.10.10.02 - Concrete Grade 30 columns

🅿️ Structure: Parking (1 item)
   └── 🧱 Element: Walling (1 item)
       └── 📁 04 - Masonry (1 item)
           └── 📂 04.10 - Masonry Materials (1 item)
               └── 📋 04.10.10 - Brick Work (1 item)
                   └── 📄 04.10.10.01 - Masonry retaining wall
```

**💡 Result:** Each structure gets its own complete hierarchy, avoiding cross-structure duplication.

## Estimate Tab Structure

### Overview of 4-Tab Architecture

The estimate system is organized into four interconnected tabs that provide a comprehensive view of project requirements:

1. **BQ Tab (Bill of Quantities)** - Main data entry and source of truth
2. **Materials Tab** - Auto-calculated material schedule
3. **Labour Tab** - Auto-calculated workforce requirements
4. **Equipment Tab** - Auto-calculated equipment schedule

### Data Flow Architecture

```
Library System (Master Data with Factors)
    ↓
BQ Tab (User Input)
├── Structure Selection/Creation (Main House, Banda, Parking)
├── Element Selection/Creation (Substructure, Walling, External Finish)
├── Library Item Selection (with Division → Section → Assembly → Item)
└── Quantity Entry
    ↓
Automatic Calculations Using Library Factors
    ├── Materials Tab (Aggregated material requirements)
    ├── Labour Tab (Aggregated workforce needs)
    └── Equipment Tab (Aggregated equipment schedule)
```

### Tab Details

#### 1. BQ Tab (Bill of Quantities) - Main Tab
**Purpose**: Primary data entry point where users build the estimate structure

**Improved Column Structure**:
1. **Code/Index** - Hierarchical numbering (e.g., 1.1.03.10.10.01)
2. **Description** - Indented hierarchy showing full path
3. **Quantity** - Editable quantity field
4. **Unit** - Unit of measurement
5. **Rate (Manual)** - User-entered rate for manual items
6. **Rate (Calculated)** - Factor-based rate from library
7. **Amount (Manual)** - Quantity × Rate (Manual)
8. **Amount (Calculated)** - Quantity × Rate (Calculated)

**Features**:
- Hierarchical tree view with expandable/collapsible nodes
- Dual rate columns for comparison and validation
- Automatic hierarchy creation from library selections
- Running totals at each hierarchy level
- Support for both library and manual items

**User Workflow**:
1. Select or create a Structure
2. Select or create an Element within that Structure
3. Click "Add from Library" to open library browser
4. Select one or multiple library items
5. System automatically creates the hierarchy (Division/Section/Assembly) under the Element
6. Enter quantities for each item
7. Compare manual vs calculated rates
8. View total costs with both rate options

#### 2. Materials Tab - Automated Material Schedule
**Purpose**: Automatically calculates total material requirements for procurement

**Improved Column Structure**:
1. **Code** - Material catalogue code (e.g., MAT-CEM-001)
2. **Description** - Material name and specification
3. **Source Items** - BQ items requiring this material
4. **Base Quantity** - Raw requirement from calculations
5. **Wastage Factor** - Wastage multiplier (e.g., 1.05)
6. **Total Quantity** - Base × Wastage Factor
7. **Unit** - Unit of measurement
8. **Rate (Market)** - Current market rate
9. **Rate (Contract)** - Negotiated contract rate
10. **Amount (Market)** - Total Qty × Market Rate
11. **Amount (Contract)** - Total Qty × Contract Rate

**Features**:
- Full traceability to source BQ items
- Dual pricing for cost comparison
- Automatic wastage calculations
- Export for procurement planning
- Grouping by material category

**Example Calculation**:
```
BQ Item: "03.10.10.01 - Concrete Grade 25" (Quantity: 100 m³)
Material Factors from Library:
- Cement: 7 bags/m³ × 1.05 wastage = 735 bags total
- Sand: 0.45 m³/m³ × 1.10 wastage = 49.5 m³ total
- Aggregate: 0.90 m³/m³ × 1.10 wastage = 99 m³ total
```

#### 3. Labour Tab - Workforce Planning
**Purpose**: Automatically calculates labor requirements for project scheduling

**Improved Column Structure**:
1. **Code** - Labour catalogue code (e.g., LAB-MAS-001)
2. **Description** - Trade and skill level
3. **Source Items** - BQ items requiring this labour
4. **Total Hours** - Raw hours from calculations
5. **Productivity Factor** - Efficiency multiplier
6. **Adjusted Hours** - Total × Productivity Factor
7. **Crew Size** - Recommended crew size
8. **Rate (Standard)** - Standard hourly rate
9. **Rate (Project)** - Project-specific rate
10. **Amount (Standard)** - Adjusted Hours × Standard Rate
11. **Amount (Project)** - Adjusted Hours × Project Rate

**Features**:
- Productivity adjustments for realistic planning
- Dual rate structure for different scenarios
- Crew size recommendations
- Trade-based grouping
- Export for workforce scheduling

**Example Calculation**:
```
BQ Item: "04.10.10.01 - Masonry Wall" (Quantity: 200 m²)
Labor Factors from Library:
- Mason: 0.8 hours/m² × 200 m² = 160 hours
- With 0.85 productivity factor = 188 adjusted hours
- Helper: 0.4 hours/m² × 200 m² = 80 hours
- With 0.85 productivity factor = 94 adjusted hours
```

#### 4. Equipment Tab - Equipment Schedule
**Purpose**: Automatically calculates equipment needs for logistics planning

**Improved Column Structure**:
1. **Code** - Equipment catalogue code (e.g., EQP-MIX-001)
2. **Description** - Equipment type and capacity
3. **Source Items** - BQ items requiring this equipment
4. **Base Hours** - Raw hours from calculations
5. **Utilization Factor** - Efficiency factor (e.g., 0.75)
6. **Billable Hours** - Base × Utilization Factor
7. **Units Required** - Number of units needed
8. **Rate (Owned)** - Internal rate for owned equipment
9. **Rate (Rental)** - Market rental rate
10. **Amount (Owned)** - Billable Hours × Owned Rate
11. **Amount (Rental)** - Billable Hours × Rental Rate

**Features**:
- Utilization adjustments for realistic planning
- Own vs rent cost comparison
- Equipment scheduling optimization
- Category-based grouping
- Export for logistics planning

**Example Calculation**:
```
BQ Item: "02.10.10.03 - Site Excavation" (Quantity: 500 m³)
Equipment Factors from Library:
- Excavator: 0.1 hours/m³ × 500 m³ = 50 hours
- With 0.75 utilization factor = 67 billable hours
- Tipper Truck: 0.15 hours/m³ × 500 m³ = 75 hours
- With 0.75 utilization factor = 100 billable hours
```

### Benefits of Tab Structure

1. **Single Source of Truth**: BQ tab serves as master data, other tabs are calculated views
2. **No Data Duplication**: Enter data once in BQ, view it differently in other tabs
3. **Real-time Updates**: Changes in BQ automatically update all other tabs
4. **Role-based Views**: Different stakeholders can focus on relevant tabs
   - Estimators: BQ Tab
   - Procurement: Materials Tab
   - HR/Site Managers: Labour Tab
   - Logistics: Equipment Tab
5. **Export Flexibility**: Each tab can be exported for different purposes
   - BQ: Client estimates and contracts
   - Materials: Purchase orders
   - Labour: Workforce schedules
   - Equipment: Rental schedules

### Implementation Approach

The tabs will be implemented using a combination of:
- **Real-time calculations**: Materials, labour, and equipment tabs update instantly when BQ changes
- **Efficient aggregation**: Database views and queries optimize performance
- **Caching**: Frequently accessed calculations are cached
- **Progressive loading**: Large projects load data incrementally

## Feature-Based Implementation Guide

### Project Structure Overview

Our project follows a feature-based architecture where all code related to a specific business capability is organized together. For the library-to-estimate integration, we'll organize code as follows:

```
src/features/estimates/
├── components/
│   ├── library-integration/
│   │   ├── LibraryItemSelector/
│   │   │   ├── index.tsx
│   │   │   ├── LibraryItemSelector.tsx
│   │   │   ├── LibraryItemSelector.types.ts
│   │   │   └── LibraryItemSelector.test.tsx
│   │   ├── FactorPreview/
│   │   │   ├── index.tsx
│   │   │   ├── FactorPreview.tsx
│   │   │   └── FactorPreview.types.ts
│   │   └── IntegrationDialog/
│   │       ├── index.tsx
│   │       └── IntegrationDialog.tsx
│   ├── schedule-tabs/
│   │   ├── MaterialScheduleTab/
│   │   ├── LabourScheduleTab/
│   │   ├── EquipmentScheduleTab/
│   │   └── EstimateTabs/
│   └── [existing components]
├── services/
│   ├── libraryIntegrationService.ts
│   ├── factorCalculatorService.ts
│   ├── scheduleAggregationService.ts
│   └── [existing services]
├── hooks/
│   ├── useLibraryIntegration.ts
│   ├── useFactorCalculation.ts
│   ├── useScheduleAggregation.ts
│   └── [existing hooks]
├── types/
│   ├── libraryIntegration.ts
│   ├── factorCalculation.ts
│   ├── scheduleTypes.ts
│   └── [existing types]
└── utils/
    ├── hierarchyMapper.ts
    ├── costCalculator.ts
    └── [existing utils]
```

### Key Principles

1. **Feature Cohesion**: All integration code lives in the estimates feature
2. **Single Responsibility**: Each service handles one aspect of integration
3. **Type Safety**: Comprehensive TypeScript types for all integration points
4. **Testability**: Unit tests alongside implementation files
5. **Reusability**: Hooks and services can be used across components

## Step-by-Step Implementation

### Phase 1: Database Setup (Days 1-2)

#### Day 1: Schema Design and Migration Scripts

**1. Create Migration Files**
```bash
# Create migration files
touch migrations/2024_01_15_add_library_integration_columns.sql
touch migrations/2024_01_15_create_schedule_views.sql
touch migrations/2024_01_15_create_usage_tracking.sql
```

**2. Update Estimate Tables**
```sql
-- migrations/2024_01_15_add_library_integration_columns.sql
BEGIN;

-- Add library reference columns to estimate_elements
ALTER TABLE estimate_elements 
ADD COLUMN library_division_id UUID REFERENCES divisions(id),
ADD COLUMN library_section_id UUID REFERENCES sections(id),
ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN hierarchy_level INTEGER CHECK (hierarchy_level BETWEEN 1 AND 4),
ADD COLUMN parent_element_id UUID REFERENCES estimate_elements(id),
ADD COLUMN library_code VARCHAR(20),
ADD COLUMN library_path TEXT,
ADD COLUMN is_from_library BOOLEAN DEFAULT false;

-- Add library reference to estimate_detail_items
ALTER TABLE estimate_detail_items 
ADD COLUMN library_item_id UUID REFERENCES library_items(id),
ADD COLUMN library_division_id UUID REFERENCES divisions(id),
ADD COLUMN library_section_id UUID REFERENCES sections(id),
ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN library_code VARCHAR(20),
ADD COLUMN library_path TEXT,
ADD COLUMN factor_breakdown JSONB,
ADD COLUMN is_from_library BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_estimate_elements_library_refs ON estimate_elements(library_division_id, library_section_id, library_assembly_id);
CREATE INDEX idx_estimate_detail_items_library_refs ON estimate_detail_items(library_item_id);
CREATE INDEX idx_estimate_hierarchy ON estimate_elements(parent_element_id, hierarchy_level);

COMMIT;
```

**3. Create Schedule Views**
```sql
-- migrations/2024_01_15_create_schedule_views.sql
BEGIN;

-- Material Schedule View
CREATE OR REPLACE VIEW estimate_material_schedule AS
WITH material_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    mc.id as material_id,
    mc.name as material_name,
    mc.unit as material_unit,
    mc.code as material_code,
    mc.category as material_category,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(mf.quantity_per_unit, 0) * 
      (1 + COALESCE(mf.wastage_percentage, 0)/100)
    ) as total_quantity,
    mc.rate as unit_rate
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN material_factors mf ON mf.library_item_id = li.id
  LEFT JOIN materials_catalogue mc ON mf.material_catalogue_id = mc.id
  WHERE ed.is_from_library = true
  GROUP BY p.id, p.name, mc.id, mc.name, mc.unit, mc.code, mc.category, mc.rate
)
SELECT 
  *,
  total_quantity * unit_rate as total_cost
FROM material_aggregation
ORDER BY material_category, material_name;

-- Labour Schedule View
CREATE OR REPLACE VIEW estimate_labour_schedule AS
WITH labour_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    lc.id as labour_id,
    lc.name as labour_name,
    lc.trade as labour_trade,
    lc.skill_level,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(lf.hours_per_unit, 0)
    ) as total_hours,
    lc.hourly_rate
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN labour_factors lf ON lf.library_item_id = li.id
  LEFT JOIN labour_catalogue lc ON lf.labour_catalogue_id = lc.id
  WHERE ed.is_from_library = true
  GROUP BY p.id, p.name, lc.id, lc.name, lc.trade, lc.skill_level, lc.hourly_rate
)
SELECT 
  *,
  total_hours * hourly_rate as total_cost,
  CEIL(total_hours / 8) as total_days
FROM labour_aggregation
ORDER BY labour_trade, labour_name;

-- Equipment Schedule View
CREATE OR REPLACE VIEW estimate_equipment_schedule AS
WITH equipment_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    ec.id as equipment_id,
    ec.name as equipment_name,
    ec.category as equipment_category,
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(ef.hours_per_unit, 0)
    ) as total_hours,
    ec.hourly_rate
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN equipment_factors ef ON ef.library_item_id = li.id
  LEFT JOIN equipment_catalogue ec ON ef.equipment_catalogue_id = ec.id
  WHERE ed.is_from_library = true
  GROUP BY p.id, p.name, ec.id, ec.name, ec.category, ec.hourly_rate
)
SELECT 
  *,
  total_hours * hourly_rate as total_cost,
  CEIL(total_hours / 8) as total_days
FROM equipment_aggregation
ORDER BY equipment_category, equipment_name;

COMMIT;
```

#### Day 2: Usage Tracking and Testing

**1. Create Usage Tracking Table**
```sql
-- migrations/2024_01_15_create_usage_tracking.sql
BEGIN;

CREATE TABLE estimate_library_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    estimate_structure_id UUID REFERENCES estimate_structures(id) ON DELETE CASCADE,
    estimate_element_id UUID REFERENCES estimate_elements(id) ON DELETE CASCADE,
    estimate_detail_item_id UUID REFERENCES estimate_detail_items(id) ON DELETE CASCADE,
    library_item_id UUID REFERENCES library_items(id),
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    selected_by UUID REFERENCES auth.users(id),
    quantity DECIMAL(10,2),
    calculated_rate DECIMAL(10,2),
    factor_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_library_usage_project ON estimate_library_usage(project_id);
CREATE INDEX idx_library_usage_item ON estimate_library_usage(library_item_id);
CREATE INDEX idx_library_usage_date ON estimate_library_usage(selected_at);

-- Create audit trigger
CREATE TRIGGER update_estimate_library_usage_updated_at
    BEFORE UPDATE ON estimate_library_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

**2. Test Migration Scripts**
```bash
# Test migrations locally
npm run db:migrate:test

# Verify schema changes
npm run db:schema:verify
```

### Phase 2: Core Services (Days 3-5)

#### Day 3: Type Definitions and Base Services

**1. Create Type Definitions**
```typescript
// src/features/estimates/types/libraryIntegration.ts
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
  path: string;
}

export interface LibraryItemSelection {
  libraryItem: LibraryItem;
  targetStructureId: string;
  targetElementId: string;
  quantity?: number;
}

export interface EstimateCreationResult {
  elements: EstimateElement[];
  detailItems: EstimateDetailItem[];
  errors?: string[];
}

export interface HierarchyMapping {
  structure: EstimateStructure;
  element: EstimateElement;
  divisionElements: Map<string, EstimateElement>;
  sectionElements: Map<string, EstimateElement>;
  assemblyElements: Map<string, EstimateElement>;
}

// Column structure interfaces for improved tabs
export interface BQColumnData {
  codeIndex: string;           // e.g., "1.1.03.10.10.01"
  description: string;         // Indented hierarchy description
  quantity: number;
  unit: string;
  rateManual?: number;         // Manual rate if entered
  rateCalculated?: number;     // Calculated from library factors
  amountManual?: number;       // Quantity × rateManual
  amountCalculated?: number;   // Quantity × rateCalculated
  level: number;               // Hierarchy level for indentation
  isFromLibrary: boolean;
  libraryItemId?: string;
  children?: BQColumnData[];
}

export interface MaterialScheduleColumn {
  code: string;                // Material catalogue code
  description: string;         // Material name and spec
  sourceItems: string[];       // BQ item codes using this material
  baseQuantity: number;        // Raw requirement
  wastageFactor: number;       // e.g., 1.05 for 5% wastage
  totalQuantity: number;       // baseQuantity × wastageFactor
  unit: string;
  rateMarket: number;          // Current market rate
  rateContract?: number;       // Negotiated rate if available
  amountMarket: number;        // totalQuantity × rateMarket
  amountContract?: number;     // totalQuantity × rateContract
  category: string;
}

export interface LabourScheduleColumn {
  code: string;                // Labour catalogue code
  description: string;         // Trade and skill level
  sourceItems: string[];       // BQ item codes requiring this labour
  totalHours: number;          // Raw hours from calculations
  productivityFactor: number;  // e.g., 0.85 for 85% efficiency
  adjustedHours: number;       // totalHours / productivityFactor
  crewSize: number;            // Recommended crew size
  rateStandard: number;        // Standard hourly rate
  rateProject?: number;        // Project-specific rate
  amountStandard: number;      // adjustedHours × rateStandard
  amountProject?: number;      // adjustedHours × rateProject
  trade: string;
  skillLevel: string;
}

export interface EquipmentScheduleColumn {
  code: string;                // Equipment catalogue code
  description: string;         // Equipment type and capacity
  sourceItems: string[];       // BQ item codes requiring this equipment
  baseHours: number;           // Raw hours from calculations
  utilizationFactor: number;   // e.g., 0.75 for 75% utilization
  billableHours: number;       // baseHours / utilizationFactor
  unitsRequired: number;       // Number of units needed
  rateOwned?: number;          // Internal rate if owned
  rateRental: number;          // Market rental rate
  amountOwned?: number;        // billableHours × rateOwned
  amountRental: number;        // billableHours × rateRental
  category: string;
  capacity?: string;
}
```

**2. Create Factor Calculator Service**
```typescript
// src/features/estimates/services/factorCalculatorService.ts
import { supabase } from '@/lib/supabase/client';
import type { FactorCalculation, ProjectRates } from '../types/factorCalculation';

export class FactorCalculatorService {
  private static instance: FactorCalculatorService;

  static getInstance(): FactorCalculatorService {
    if (!this.instance) {
      this.instance = new FactorCalculatorService();
    }
    return this.instance;
  }

  async calculateItemCost(
    libraryItemId: string,
    projectId: string
  ): Promise<FactorCalculation> {
    try {
      // Fetch all factors in parallel
      const [materialFactors, labourFactors, equipmentFactors, projectRates] = 
        await Promise.all([
          this.getMaterialFactors(libraryItemId),
          this.getLabourFactors(libraryItemId),
          this.getEquipmentFactors(libraryItemId),
          this.getProjectRates(projectId)
        ]);

      // Calculate costs
      const materialCost = this.calculateMaterialCost(materialFactors, projectRates);
      const labourCost = this.calculateLabourCost(labourFactors, projectRates);
      const equipmentCost = this.calculateEquipmentCost(equipmentFactors, projectRates);

      return {
        materialCost,
        labourCost,
        equipmentCost,
        totalRate: materialCost + labourCost + equipmentCost,
        breakdown: {
          materials: materialFactors,
          labour: labourFactors,
          equipment: equipmentFactors
        }
      };
    } catch (error) {
      console.error('Error calculating item cost:', error);
      throw new Error('Failed to calculate item cost');
    }
  }

  private async getMaterialFactors(libraryItemId: string) {
    const { data, error } = await supabase
      .from('material_factors')
      .select(`
        *,
        material_catalogue:materials_catalogue(*)
      `)
      .eq('library_item_id', libraryItemId);

    if (error) throw error;
    return data || [];
  }

  private async getLabourFactors(libraryItemId: string) {
    const { data, error } = await supabase
      .from('labour_factors')
      .select(`
        *,
        labour_catalogue:labour_catalogue(*)
      `)
      .eq('library_item_id', libraryItemId);

    if (error) throw error;
    return data || [];
  }

  private async getEquipmentFactors(libraryItemId: string) {
    const { data, error } = await supabase
      .from('equipment_factors')
      .select(`
        *,
        equipment_catalogue:equipment_catalogue(*)
      `)
      .eq('library_item_id', libraryItemId);

    if (error) throw error;
    return data || [];
  }

  private async getProjectRates(projectId: string): Promise<ProjectRates> {
    // In the future, this could fetch project-specific rates
    // For now, return default rates from catalogues
    return {
      materials: {},
      labour: {},
      equipment: {}
    };
  }

  private calculateMaterialCost(factors: any[], rates: ProjectRates): number {
    return factors.reduce((total, factor) => {
      const unitRate = rates.materials[factor.material_catalogue_id] || 
                      factor.material_catalogue?.rate || 0;
      const quantity = factor.quantity_per_unit || 0;
      const wastage = 1 + (factor.wastage_percentage || 0) / 100;
      return total + (quantity * wastage * unitRate);
    }, 0);
  }

  private calculateLabourCost(factors: any[], rates: ProjectRates): number {
    return factors.reduce((total, factor) => {
      const hourlyRate = rates.labour[factor.labour_catalogue_id] || 
                        factor.labour_catalogue?.hourly_rate || 0;
      const hours = factor.hours_per_unit || 0;
      return total + (hours * hourlyRate);
    }, 0);
  }

  private calculateEquipmentCost(factors: any[], rates: ProjectRates): number {
    return factors.reduce((total, factor) => {
      const hourlyRate = rates.equipment[factor.equipment_catalogue_id] || 
                        factor.equipment_catalogue?.hourly_rate || 0;
      const hours = factor.hours_per_unit || 0;
      return total + (hours * hourlyRate);
    }, 0);
  }
}

export const factorCalculatorService = FactorCalculatorService.getInstance();
```

#### Day 4: Library Integration Service

**1. Create Library Integration Service**
```typescript
// src/features/estimates/services/libraryIntegrationService.ts
import { supabase } from '@/lib/supabase/client';
import { factorCalculatorService } from './factorCalculatorService';
import type { 
  LibraryItemSelection, 
  EstimateCreationResult,
  HierarchyMapping,
  LibraryHierarchyNode 
} from '../types/libraryIntegration';

export class LibraryIntegrationService {
  private static instance: LibraryIntegrationService;

  static getInstance(): LibraryIntegrationService {
    if (!this.instance) {
      this.instance = new LibraryIntegrationService();
    }
    return this.instance;
  }

  async createEstimateFromLibraryItems(
    projectId: string,
    selections: LibraryItemSelection[]
  ): Promise<EstimateCreationResult> {
    try {
      // Group selections by structure and element
      const groupedSelections = this.groupSelectionsByTarget(selections);
      
      const elements: EstimateElement[] = [];
      const detailItems: EstimateDetailItem[] = [];
      const errors: string[] = [];

      // Process each structure-element group
      for (const [key, items] of groupedSelections) {
        const [structureId, elementId] = key.split('|');
        
        try {
          const result = await this.processSelectionGroup(
            projectId,
            structureId,
            elementId,
            items
          );
          
          elements.push(...result.elements);
          detailItems.push(...result.detailItems);
        } catch (error) {
          errors.push(`Failed to process items for ${key}: ${error.message}`);
        }
      }

      return { elements, detailItems, errors };
    } catch (error) {
      console.error('Error creating estimate from library items:', error);
      throw new Error('Failed to create estimate from library items');
    }
  }

  private groupSelectionsByTarget(
    selections: LibraryItemSelection[]
  ): Map<string, LibraryItemSelection[]> {
    const grouped = new Map<string, LibraryItemSelection[]>();
    
    for (const selection of selections) {
      const key = `${selection.targetStructureId}|${selection.targetElementId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(selection);
    }
    
    return grouped;
  }

  private async processSelectionGroup(
    projectId: string,
    structureId: string,
    elementId: string,
    selections: LibraryItemSelection[]
  ): Promise<EstimateCreationResult> {
    // Build hierarchy nodes for all selections
    const hierarchyNodes = await this.buildHierarchyNodes(selections);
    
    // Create intelligent grouping
    const hierarchyMapping = await this.createHierarchyMapping(
      projectId,
      structureId,
      elementId,
      hierarchyNodes
    );
    
    // Create detail items under appropriate assemblies
    const detailItems = await this.createDetailItems(
      projectId,
      hierarchyMapping,
      selections
    );
    
    return {
      elements: Array.from(hierarchyMapping.divisionElements.values())
        .concat(Array.from(hierarchyMapping.sectionElements.values()))
        .concat(Array.from(hierarchyMapping.assemblyElements.values())),
      detailItems
    };
  }

  private async buildHierarchyNodes(
    selections: LibraryItemSelection[]
  ): Promise<LibraryHierarchyNode[]> {
    const nodes: LibraryHierarchyNode[] = [];
    
    for (const selection of selections) {
      const { data: item } = await supabase
        .from('library_items')
        .select(`
          *,
          assembly:assemblies!inner(
            *,
            section:sections!inner(
              *,
              division:divisions!inner(*)
            )
          )
        `)
        .eq('id', selection.libraryItem.id)
        .single();
      
      if (item) {
        nodes.push({
          divisionId: item.assembly.section.division.id,
          divisionCode: item.assembly.section.division.code,
          divisionName: item.assembly.section.division.name,
          sectionId: item.assembly.section.id,
          sectionCode: item.assembly.section.code,
          sectionName: item.assembly.section.name,
          assemblyId: item.assembly.id,
          assemblyCode: item.assembly.code,
          assemblyName: item.assembly.name,
          itemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          path: `${item.assembly.section.division.code}.${item.assembly.section.code}.${item.assembly.code}.${item.code}`
        });
      }
    }
    
    return nodes;
  }

  private async createHierarchyMapping(
    projectId: string,
    structureId: string,
    elementId: string,
    nodes: LibraryHierarchyNode[]
  ): Promise<HierarchyMapping> {
    const divisionElements = new Map<string, EstimateElement>();
    const sectionElements = new Map<string, EstimateElement>();
    const assemblyElements = new Map<string, EstimateElement>();
    
    // Get structure and element
    const { data: structure } = await supabase
      .from('estimate_structures')
      .select('*')
      .eq('id', structureId)
      .single();
    
    const { data: element } = await supabase
      .from('estimate_elements')
      .select('*')
      .eq('id', elementId)
      .single();
    
    // Process each unique division/section/assembly combination
    for (const node of nodes) {
      // Create or get division element
      if (!divisionElements.has(node.divisionId)) {
        const divisionElement = await this.createOrGetElement({
          project_id: projectId,
          structure_id: structureId,
          parent_element_id: elementId,
          name: `${node.divisionCode} - ${node.divisionName}`,
          hierarchy_level: 2,
          library_division_id: node.divisionId,
          library_code: node.divisionCode,
          library_path: node.divisionCode,
          is_from_library: true
        });
        divisionElements.set(node.divisionId, divisionElement);
      }
      
      // Create or get section element
      const sectionKey = `${node.divisionId}|${node.sectionId}`;
      if (!sectionElements.has(sectionKey)) {
        const sectionElement = await this.createOrGetElement({
          project_id: projectId,
          structure_id: structureId,
          parent_element_id: divisionElements.get(node.divisionId)!.id,
          name: `${node.sectionCode} - ${node.sectionName}`,
          hierarchy_level: 3,
          library_division_id: node.divisionId,
          library_section_id: node.sectionId,
          library_code: node.sectionCode,
          library_path: `${node.divisionCode}.${node.sectionCode}`,
          is_from_library: true
        });
        sectionElements.set(sectionKey, sectionElement);
      }
      
      // Create or get assembly element
      const assemblyKey = `${node.divisionId}|${node.sectionId}|${node.assemblyId}`;
      if (!assemblyElements.has(assemblyKey)) {
        const assemblyElement = await this.createOrGetElement({
          project_id: projectId,
          structure_id: structureId,
          parent_element_id: sectionElements.get(sectionKey)!.id,
          name: `${node.assemblyCode} - ${node.assemblyName}`,
          hierarchy_level: 4,
          library_division_id: node.divisionId,
          library_section_id: node.sectionId,
          library_assembly_id: node.assemblyId,
          library_code: node.assemblyCode,
          library_path: `${node.divisionCode}.${node.sectionCode}.${node.assemblyCode}`,
          is_from_library: true
        });
        assemblyElements.set(assemblyKey, assemblyElement);
      }
    }
    
    return {
      structure,
      element,
      divisionElements,
      sectionElements,
      assemblyElements
    };
  }

  private async createOrGetElement(data: any): Promise<EstimateElement> {
    // Check if element already exists
    const { data: existing } = await supabase
      .from('estimate_elements')
      .select('*')
      .eq('structure_id', data.structure_id)
      .eq('parent_element_id', data.parent_element_id)
      .eq('library_code', data.library_code)
      .single();
    
    if (existing) {
      return existing;
    }
    
    // Create new element
    const { data: newElement, error } = await supabase
      .from('estimate_elements')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return newElement;
  }

  private async createDetailItems(
    projectId: string,
    mapping: HierarchyMapping,
    selections: LibraryItemSelection[]
  ): Promise<EstimateDetailItem[]> {
    const detailItems: EstimateDetailItem[] = [];
    
    for (const selection of selections) {
      // Calculate rate using factors
      const calculation = await factorCalculatorService.calculateItemCost(
        selection.libraryItem.id,
        projectId
      );
      
      // Find the appropriate assembly element
      const node = await this.getNodeForItem(selection.libraryItem.id);
      const assemblyKey = `${node.divisionId}|${node.sectionId}|${node.assemblyId}`;
      const assemblyElement = mapping.assemblyElements.get(assemblyKey);
      
      if (assemblyElement) {
        const { data: detailItem, error } = await supabase
          .from('estimate_detail_items')
          .insert({
            element_id: assemblyElement.id,
            name: `${selection.libraryItem.code} - ${selection.libraryItem.name}`,
            quantity: selection.quantity || 1,
            unit: selection.libraryItem.unit,
            rate: calculation.totalRate,
            amount: (selection.quantity || 1) * calculation.totalRate,
            library_item_id: selection.libraryItem.id,
            library_division_id: node.divisionId,
            library_section_id: node.sectionId,
            library_assembly_id: node.assemblyId,
            library_code: selection.libraryItem.code,
            library_path: node.path,
            factor_breakdown: calculation.breakdown,
            is_from_library: true
          })
          .select()
          .single();
        
        if (error) throw error;
        if (detailItem) detailItems.push(detailItem);
      }
    }
    
    return detailItems;
  }

  private async getNodeForItem(itemId: string): Promise<LibraryHierarchyNode> {
    // Helper method to get hierarchy node for a single item
    const { data: item } = await supabase
      .from('library_items')
      .select(`
        *,
        assembly:assemblies!inner(
          *,
          section:sections!inner(
            *,
            division:divisions!inner(*)
          )
        )
      `)
      .eq('id', itemId)
      .single();
    
    if (!item) throw new Error('Item not found');
    
    return {
      divisionId: item.assembly.section.division.id,
      divisionCode: item.assembly.section.division.code,
      divisionName: item.assembly.section.division.name,
      sectionId: item.assembly.section.id,
      sectionCode: item.assembly.section.code,
      sectionName: item.assembly.section.name,
      assemblyId: item.assembly.id,
      assemblyCode: item.assembly.code,
      assemblyName: item.assembly.name,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      path: `${item.assembly.section.division.code}.${item.assembly.section.code}.${item.assembly.code}.${item.code}`
    };
  }
}

export const libraryIntegrationService = LibraryIntegrationService.getInstance();
```

#### Day 5: Schedule Aggregation Service

**1. Create Schedule Aggregation Service**
```typescript
// src/features/estimates/services/scheduleAggregationService.ts
import { supabase } from '@/lib/supabase/client';
import type { 
  MaterialScheduleItem,
  LabourScheduleItem,
  EquipmentScheduleItem 
} from '../types/scheduleTypes';

export class ScheduleAggregationService {
  private static instance: ScheduleAggregationService;

  static getInstance(): ScheduleAggregationService {
    if (!this.instance) {
      this.instance = new ScheduleAggregationService();
    }
    return this.instance;
  }

  async getMaterialSchedule(projectId: string): Promise<MaterialScheduleItem[]> {
    const { data, error } = await supabase
      .from('estimate_material_schedule')
      .select('*')
      .eq('project_id', projectId)
      .order('material_category, material_name');
    
    if (error) throw error;
    return data || [];
  }

  async getLabourSchedule(projectId: string): Promise<LabourScheduleItem[]> {
    const { data, error } = await supabase
      .from('estimate_labour_schedule')
      .select('*')
      .eq('project_id', projectId)
      .order('labour_trade, labour_name');
    
    if (error) throw error;
    return data || [];
  }

  async getEquipmentSchedule(projectId: string): Promise<EquipmentScheduleItem[]> {
    const { data, error } = await supabase
      .from('estimate_equipment_schedule')
      .select('*')
      .eq('project_id', projectId)
      .order('equipment_category, equipment_name');
    
    if (error) throw error;
    return data || [];
  }

  async exportMaterialSchedule(projectId: string, format: 'csv' | 'excel' = 'excel') {
    const materials = await this.getMaterialSchedule(projectId);
    
    if (format === 'csv') {
      return this.exportToCSV(materials, 'material-schedule');
    } else {
      return this.exportToExcel(materials, 'material-schedule');
    }
  }

  async exportLabourSchedule(projectId: string, format: 'csv' | 'excel' = 'excel') {
    const labour = await this.getLabourSchedule(projectId);
    
    if (format === 'csv') {
      return this.exportToCSV(labour, 'labour-schedule');
    } else {
      return this.exportToExcel(labour, 'labour-schedule');
    }
  }

  async exportEquipmentSchedule(projectId: string, format: 'csv' | 'excel' = 'excel') {
    const equipment = await this.getEquipmentSchedule(projectId);
    
    if (format === 'csv') {
      return this.exportToCSV(equipment, 'equipment-schedule');
    } else {
      return this.exportToExcel(equipment, 'equipment-schedule');
    }
  }

  private exportToCSV(data: any[], filename: string): string {
    // Implementation for CSV export
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    return [headers, ...rows].join('\n');
  }

  private exportToExcel(data: any[], filename: string): Blob {
    // Implementation for Excel export using a library like xlsx
    // This is a placeholder - actual implementation would use xlsx library
    throw new Error('Excel export not implemented yet');
  }
}

export const scheduleAggregationService = ScheduleAggregationService.getInstance();
```

### Phase 3: UI Components (Days 6-8)

#### Day 6: Library Item Selector Component

**1. Create LibraryItemSelector Component**
```typescript
// src/features/estimates/components/library-integration/LibraryItemSelector/LibraryItemSelector.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LibraryBrowser } from '@/features/library/components/LibraryBrowser';
import { FactorPreview } from '../FactorPreview';
import type { LibraryItem } from '@/features/library/types';
import type { LibraryItemSelectorProps } from './LibraryItemSelector.types';

export const LibraryItemSelector: React.FC<LibraryItemSelectorProps> = ({
  open,
  onClose,
  onItemsSelected,
  projectId,
  allowMultiple = true,
  showFactorPreview = true
}) => {
  const [selectedItems, setSelectedItems] = useState<LibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleItemToggle = (item: LibraryItem) => {
    if (allowMultiple) {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          return prev.filter(i => i.id !== item.id);
        }
        return [...prev, item];
      });
    } else {
      setSelectedItems([item]);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onItemsSelected(selectedItems);
      setSelectedItems([]);
      onClose();
    } catch (error) {
      console.error('Error selecting items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Library Items for Estimate</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[600px]">
          {/* Left Panel: Library Browser */}
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search library items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg p-4">
              <LibraryBrowser
                searchQuery={searchQuery}
                selectedItems={selectedItems}
                onItemSelect={handleItemToggle}
                showSelection={true}
                allowMultiple={allowMultiple}
              />
            </div>
          </div>

          {/* Right Panel: Factor Preview */}
          {showFactorPreview && selectedItems.length > 0 && (
            <div className="w-96">
              <FactorPreview
                items={selectedItems}
                projectId={projectId}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedItems.length === 0 || isLoading}
          >
            {isLoading ? 'Adding...' : `Add ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**2. Create Component Types**
```typescript
// src/features/estimates/components/library-integration/LibraryItemSelector/LibraryItemSelector.types.ts
import type { LibraryItem } from '@/features/library/types';

export interface LibraryItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onItemsSelected: (items: LibraryItem[]) => Promise<void>;
  projectId: string;
  allowMultiple?: boolean;
  showFactorPreview?: boolean;
}
```

#### Day 7: Factor Preview and Integration Dialog

**1. Create Factor Preview Component**
```typescript
// src/features/estimates/components/library-integration/FactorPreview/FactorPreview.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Users, Wrench } from 'lucide-react';
import { factorCalculatorService } from '@/features/estimates/services/factorCalculatorService';
import type { LibraryItem } from '@/features/library/types';
import type { FactorCalculation } from '@/features/estimates/types/factorCalculation';

interface FactorPreviewProps {
  items: LibraryItem[];
  projectId: string;
}

export const FactorPreview: React.FC<FactorPreviewProps> = ({ items, projectId }) => {
  const [calculations, setCalculations] = useState<Map<string, FactorCalculation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateFactors = async () => {
      setIsLoading(true);
      const newCalculations = new Map<string, FactorCalculation>();

      for (const item of items) {
        try {
          const calculation = await factorCalculatorService.calculateItemCost(
            item.id,
            projectId
          );
          newCalculations.set(item.id, calculation);
        } catch (error) {
          console.error(`Error calculating factors for ${item.name}:`, error);
        }
      }

      setCalculations(newCalculations);
      setIsLoading(false);
    };

    if (items.length > 0) {
      calculateFactors();
    }
  }, [items, projectId]);

  const totalCost = Array.from(calculations.values()).reduce(
    (sum, calc) => sum + calc.totalRate,
    0
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Cost Breakdown Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Estimated Cost</div>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <div className="text-sm text-gray-500">per unit</div>
          </div>

          {/* Item Breakdown */}
          <div className="space-y-3">
            {items.map(item => {
              const calc = calculations.get(item.id);
              if (!calc) return null;

              return (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="font-medium text-sm mb-2">{item.name}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">Material:</span>
                      <span className="font-medium">${calc.materialCost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">Labour:</span>
                      <span className="font-medium">${calc.labourCost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wrench className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">Equipment:</span>
                      <span className="font-medium">${calc.equipmentCost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Rate:</span>
                      <span className="text-sm font-bold">${calc.totalRate.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Breakdown Tabs */}
          {items.length === 1 && (
            <Tabs defaultValue="materials" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="labour">Labour</TabsTrigger>
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
              </TabsList>
              <TabsContent value="materials" className="space-y-2">
                {calculations.get(items[0].id)?.breakdown.materials.map((material, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{material.name}</span>
                    <span>{material.quantity} {material.unit}</span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="labour" className="space-y-2">
                {calculations.get(items[0].id)?.breakdown.labour.map((labour, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{labour.name}</span>
                    <span>{labour.hours} hours</span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="equipment" className="space-y-2">
                {calculations.get(items[0].id)?.breakdown.equipment.map((equipment, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{equipment.name}</span>
                    <span>{equipment.hours} hours</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

#### Day 8: Schedule Tabs Implementation

**1. Create Material Schedule Tab**
```typescript
// src/features/estimates/components/schedule-tabs/MaterialScheduleTab/MaterialScheduleTab.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { scheduleAggregationService } from '@/features/estimates/services/scheduleAggregationService';
import type { MaterialScheduleItem } from '@/features/estimates/types/scheduleTypes';

interface MaterialScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const MaterialScheduleTab: React.FC<MaterialScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const [materials, setMaterials] = useState<MaterialScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    const fetchMaterials = async () => {
      setIsLoading(true);
      try {
        const data = await scheduleAggregationService.getMaterialSchedule(projectId);
        setMaterials(data);
      } catch (error) {
        console.error('Error fetching material schedule:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterials();
  }, [projectId, refreshTrigger]);

  const filteredMaterials = categoryFilter === 'all' 
    ? materials 
    : materials.filter(m => m.material_category === categoryFilter);

  const categories = Array.from(new Set(materials.map(m => m.material_category)));

  const handleExport = async () => {
    try {
      await scheduleAggregationService.exportMaterialSchedule(projectId, 'excel');
    } catch (error) {
      console.error('Error exporting material schedule:', error);
    }
  };

  const columns = [
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'sourceItems',
      header: 'Source Items',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {row.original.sourceItems.join(', ')}
        </div>
      ),
    },
    {
      accessorKey: 'baseQuantity',
      header: 'Base Qty',
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.baseQuantity.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'wastageFactor',
      header: 'Wastage',
      cell: ({ row }) => (
        <div className="text-right">
          {((row.original.wastageFactor - 1) * 100).toFixed(0)}%
        </div>
      ),
    },
    {
      accessorKey: 'totalQuantity',
      header: 'Total Qty',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.original.totalQuantity.toFixed(2)} {row.original.unit}
        </div>
      ),
    },
    {
      accessorKey: 'rateMarket',
      header: 'Market Rate',
      cell: ({ row }) => (
        <div className="text-right">${row.original.rateMarket.toFixed(2)}</div>
      ),
    },
    {
      accessorKey: 'rateContract',
      header: 'Contract Rate',
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.rateContract 
            ? `$${row.original.rateContract.toFixed(2)}`
            : '-'
          }
        </div>
      ),
    },
    {
      accessorKey: 'amountMarket',
      header: 'Market Amount',
      cell: ({ row }) => (
        <div className="text-right">
          ${row.original.amountMarket.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: 'amountContract',
      header: 'Contract Amount',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.original.amountContract 
            ? `$${row.original.amountContract.toFixed(2)}`
            : '-'
          }
        </div>
      ),
    },
  ];

  const totalCost = filteredMaterials.reduce((sum, m) => sum + m.total_cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Material Schedule</h3>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredMaterials}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Material Cost:</span>
            <span className="text-2xl font-bold">${totalCost.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

**2. Create Main Estimate Tabs Component**
```typescript
// src/features/estimates/components/schedule-tabs/EstimateTabs/EstimateTabs.tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Package, Users, Wrench } from 'lucide-react';
import { BQTab } from '../../BQTab';
import { MaterialScheduleTab } from '../MaterialScheduleTab';
import { LabourScheduleTab } from '../LabourScheduleTab';
import { EquipmentScheduleTab } from '../EquipmentScheduleTab';

interface EstimateTabsProps {
  projectId: string;
}

export const EstimateTabs: React.FC<EstimateTabsProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('bq');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBQUpdate = () => {
    // Trigger refresh of calculated tabs when BQ changes
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="bq" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          BQ
        </TabsTrigger>
        <TabsTrigger value="materials" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Materials
        </TabsTrigger>
        <TabsTrigger value="labour" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Labour
        </TabsTrigger>
        <TabsTrigger value="equipment" className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Equipment
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bq" className="mt-6">
        <BQTab projectId={projectId} onUpdate={handleBQUpdate} />
      </TabsContent>

      <TabsContent value="materials" className="mt-6">
        <MaterialScheduleTab projectId={projectId} refreshTrigger={refreshTrigger} />
      </TabsContent>

      <TabsContent value="labour" className="mt-6">
        <LabourScheduleTab projectId={projectId} refreshTrigger={refreshTrigger} />
      </TabsContent>

      <TabsContent value="equipment" className="mt-6">
        <EquipmentScheduleTab projectId={projectId} refreshTrigger={refreshTrigger} />
      </TabsContent>
    </Tabs>
  );
};
```

### Phase 4: Integration Hooks (Day 9)

**1. Create Integration Hook**
```typescript
// src/features/estimates/hooks/useLibraryIntegration.ts
import { useState, useCallback } from 'react';
import { libraryIntegrationService } from '../services/libraryIntegrationService';
import type { LibraryItem } from '@/features/library/types';
import type { LibraryItemSelection, EstimateCreationResult } from '../types/libraryIntegration';

export const useLibraryIntegration = (projectId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEstimateFromLibraryItems = useCallback(async (
    items: LibraryItem[],
    targetStructureId: string,
    targetElementId: string
  ): Promise<EstimateCreationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const selections: LibraryItemSelection[] = items.map(item => ({
        libraryItem: item,
        targetStructureId,
        targetElementId,
        quantity: 1
      }));

      const result = await libraryIntegrationService.createEstimateFromLibraryItems(
        projectId,
        selections
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  return {
    createEstimateFromLibraryItems,
    isLoading,
    error
  };
};
```

### Phase 5: API Routes (Days 10-11)

#### Day 10: Create API Endpoints

**1. Library Integration API**
```typescript
// src/app/api/estimates/library/integrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { libraryIntegrationService } from '@/features/estimates/services/libraryIntegrationService';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, selections } = await request.json();

    // Validate input
    if (!projectId || !selections || !Array.isArray(selections)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Create estimate from library items
    const result = await libraryIntegrationService.createEstimateFromLibraryItems(
      projectId,
      selections
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in library integration:', error);
    return NextResponse.json(
      { error: 'Failed to integrate library items' },
      { status: 500 }
    );
  }
}
```

**2. Schedule APIs**
```typescript
// src/app/api/estimates/[projectId]/schedules/materials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { scheduleAggregationService } from '@/features/estimates/services/scheduleAggregationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get material schedule
    const materials = await scheduleAggregationService.getMaterialSchedule(
      params.projectId
    );

    return NextResponse.json(materials);
  } catch (error) {
    console.error('Error fetching material schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material schedule' },
      { status: 500 }
    );
  }
}

// Similar endpoints for labour and equipment schedules
```

### Phase 6: Testing (Days 12-13)

#### Day 12: Unit Tests

**1. Test Factor Calculator Service**
```typescript
// src/features/estimates/services/__tests__/factorCalculatorService.test.ts
import { factorCalculatorService } from '../factorCalculatorService';

describe('FactorCalculatorService', () => {
  describe('calculateItemCost', () => {
    it('should calculate correct total cost from factors', async () => {
      const mockLibraryItemId = 'test-item-id';
      const mockProjectId = 'test-project-id';

      const result = await factorCalculatorService.calculateItemCost(
        mockLibraryItemId,
        mockProjectId
      );

      expect(result).toHaveProperty('materialCost');
      expect(result).toHaveProperty('labourCost');
      expect(result).toHaveProperty('equipmentCost');
      expect(result).toHaveProperty('totalRate');
      expect(result.totalRate).toBe(
        result.materialCost + result.labourCost + result.equipmentCost
      );
    });

    it('should handle missing factors gracefully', async () => {
      const mockLibraryItemId = 'item-without-factors';
      const mockProjectId = 'test-project-id';

      const result = await factorCalculatorService.calculateItemCost(
        mockLibraryItemId,
        mockProjectId
      );

      expect(result.totalRate).toBe(0);
    });
  });
});
```

**2. Test Library Integration Service**
```typescript
// src/features/estimates/services/__tests__/libraryIntegrationService.test.ts
import { libraryIntegrationService } from '../libraryIntegrationService';

describe('LibraryIntegrationService', () => {
  describe('createEstimateFromLibraryItems', () => {
    it('should create proper hierarchy for related items', async () => {
      const mockSelections = [
        {
          libraryItem: createMockLibraryItem({
            code: '03.10.10.01',
            divisionCode: '03',
            sectionCode: '03.10',
            assemblyCode: '03.10.10'
          }),
          targetStructureId: 'struct-1',
          targetElementId: 'elem-1'
        },
        {
          libraryItem: createMockLibraryItem({
            code: '03.10.10.02',
            divisionCode: '03',
            sectionCode: '03.10',
            assemblyCode: '03.10.10'
          }),
          targetStructureId: 'struct-1',
          targetElementId: 'elem-1'
        }
      ];

      const result = await libraryIntegrationService.createEstimateFromLibraryItems(
        'project-1',
        mockSelections
      );

      // Should create one division, one section, one assembly
      const divisionElements = result.elements.filter(e => e.hierarchy_level === 2);
      const sectionElements = result.elements.filter(e => e.hierarchy_level === 3);
      const assemblyElements = result.elements.filter(e => e.hierarchy_level === 4);

      expect(divisionElements).toHaveLength(1);
      expect(sectionElements).toHaveLength(1);
      expect(assemblyElements).toHaveLength(1);
      expect(result.detailItems).toHaveLength(2);
    });

    it('should handle different divisions correctly', async () => {
      const mockSelections = [
        {
          libraryItem: createMockLibraryItem({
            code: '02.10.10.01',
            divisionCode: '02'
          }),
          targetStructureId: 'struct-1',
          targetElementId: 'elem-1'
        },
        {
          libraryItem: createMockLibraryItem({
            code: '03.10.10.01',
            divisionCode: '03'
          }),
          targetStructureId: 'struct-1',
          targetElementId: 'elem-1'
        }
      ];

      const result = await libraryIntegrationService.createEstimateFromLibraryItems(
        'project-1',
        mockSelections
      );

      const divisionElements = result.elements.filter(e => e.hierarchy_level === 2);
      expect(divisionElements).toHaveLength(2);
    });
  });
});
```

#### Day 13: Integration Tests

**1. End-to-End Integration Test**
```typescript
// src/features/estimates/__tests__/integration/libraryIntegration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstimatePage } from '@/app/projects/[id]/estimate/page';

describe('Library to Estimate Integration', () => {
  it('should allow selecting library items and creating estimate hierarchy', async () => {
    const user = userEvent.setup();
    
    render(<EstimatePage params={{ id: 'test-project' }} />);

    // Open add item dialog
    const addButton = screen.getByText('Add from Library');
    await user.click(addButton);

    // Search for items
    const searchInput = screen.getByPlaceholderText('Search library items...');
    await user.type(searchInput, 'concrete');

    // Select items
    await waitFor(() => {
      const concreteItem = screen.getByText('Concrete Grade 25');
      user.click(concreteItem);
    });

    // Confirm selection
    const confirmButton = screen.getByText('Add 1 Item');
    await user.click(confirmButton);

    // Verify hierarchy created
    await waitFor(() => {
      expect(screen.getByText('03 - Concrete')).toBeInTheDocument();
      expect(screen.getByText('03.10 - Concrete Materials')).toBeInTheDocument();
      expect(screen.getByText('03.10.10 - Ready Mix Concrete')).toBeInTheDocument();
      expect(screen.getByText('03.10.10.01 - Concrete Grade 25')).toBeInTheDocument();
    });
  });

  it('should update schedule tabs when BQ changes', async () => {
    const user = userEvent.setup();
    
    render(<EstimatePage params={{ id: 'test-project' }} />);

    // Add item from library
    // ... (similar to above)

    // Switch to Materials tab
    const materialsTab = screen.getByText('Materials');
    await user.click(materialsTab);

    // Verify material schedule updated
    await waitFor(() => {
      expect(screen.getByText('Cement')).toBeInTheDocument();
      expect(screen.getByText('350 bags')).toBeInTheDocument();
    });
  });
});
```

### Phase 7: Documentation and Deployment (Days 14-15)

#### Day 14: Create User Documentation

**1. User Guide**
```markdown
# Library-to-Estimate Integration User Guide

## Overview
The Library-to-Estimate integration allows you to quickly create accurate estimates by selecting items from the pre-configured library.

## Getting Started

### 1. Opening the Library Selector
- Navigate to your project's Estimate page
- Click on "Add from Library" button
- The library browser will open

### 2. Searching for Items
- Use the search bar to find specific items
- Browse by category using the tree structure
- Filter by division, section, or assembly

### 3. Selecting Items
- Click on items to select them
- View the cost breakdown in the preview panel
- Select multiple items at once for bulk addition

### 4. Adding to Estimate
- Review selected items and their costs
- Click "Add Items" to create the estimate hierarchy
- Items will be organized automatically by division/section/assembly

### 5. Viewing Schedules
- Switch to Materials tab to see aggregated materials
- Labour tab shows workforce requirements
- Equipment tab displays machinery needs
- All tabs update automatically when you change quantities

## Tips
- Use the search function for faster item location
- Preview costs before adding to ensure accuracy
- Export schedules for procurement and planning
```

#### Day 15: Deployment Checklist

**1. Pre-Deployment Checklist**
```markdown
# Deployment Checklist

## Database
- [ ] Run migrations on staging environment
- [ ] Verify all views created successfully
- [ ] Test data integrity after migration
- [ ] Create database backups

## Code
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance testing done
- [ ] Security review completed

## Infrastructure
- [ ] Environment variables configured
- [ ] API rate limits set
- [ ] Monitoring configured
- [ ] Error tracking enabled

## User Communication
- [ ] Feature announcement prepared
- [ ] Training materials distributed
- [ ] Support team briefed
- [ ] Rollback plan documented
```

## Migration Scripts

### Complete Migration Script

Create a single migration file that handles all schema changes:

```sql
-- migrations/2024_01_15_library_estimate_integration.sql
BEGIN;

-- Step 1: Add library reference columns to estimate tables
ALTER TABLE estimate_elements 
ADD COLUMN IF NOT EXISTS library_division_id UUID REFERENCES divisions(id),
ADD COLUMN IF NOT EXISTS library_section_id UUID REFERENCES sections(id),
ADD COLUMN IF NOT EXISTS library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER CHECK (hierarchy_level BETWEEN 1 AND 4),
ADD COLUMN IF NOT EXISTS parent_element_id UUID REFERENCES estimate_elements(id),
ADD COLUMN IF NOT EXISTS library_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS library_path TEXT,
ADD COLUMN IF NOT EXISTS is_from_library BOOLEAN DEFAULT false;

ALTER TABLE estimate_detail_items 
ADD COLUMN IF NOT EXISTS library_item_id UUID REFERENCES library_items(id),
ADD COLUMN IF NOT EXISTS library_division_id UUID REFERENCES divisions(id),
ADD COLUMN IF NOT EXISTS library_section_id UUID REFERENCES sections(id),
ADD COLUMN IF NOT EXISTS library_assembly_id UUID REFERENCES assemblies(id),
ADD COLUMN IF NOT EXISTS library_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS library_path TEXT,
ADD COLUMN IF NOT EXISTS factor_breakdown JSONB,
ADD COLUMN IF NOT EXISTS is_from_library BOOLEAN DEFAULT false;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_elements_library_refs 
ON estimate_elements(library_division_id, library_section_id, library_assembly_id);

CREATE INDEX IF NOT EXISTS idx_estimate_detail_items_library_refs 
ON estimate_detail_items(library_item_id);

CREATE INDEX IF NOT EXISTS idx_estimate_hierarchy 
ON estimate_elements(parent_element_id, hierarchy_level);

-- Step 3: Create usage tracking table
CREATE TABLE IF NOT EXISTS estimate_library_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    estimate_structure_id UUID REFERENCES estimate_structures(id) ON DELETE CASCADE,
    estimate_element_id UUID REFERENCES estimate_elements(id) ON DELETE CASCADE,
    estimate_detail_item_id UUID REFERENCES estimate_detail_items(id) ON DELETE CASCADE,
    library_item_id UUID REFERENCES library_items(id),
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    selected_by UUID REFERENCES auth.users(id),
    quantity DECIMAL(10,2),
    calculated_rate DECIMAL(10,2),
    factor_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create schedule views with improved columns
-- Create project_rates table for contract rates (if not exists)
CREATE TABLE IF NOT EXISTS project_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    catalogue_type VARCHAR(20) CHECK (catalogue_type IN ('material', 'labour', 'equipment')),
    catalogue_id UUID,
    contract_rate DECIMAL(10,2),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, catalogue_type, catalogue_id)
);

-- Material Schedule View with improved columns
CREATE OR REPLACE VIEW estimate_material_schedule AS
WITH material_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    mc.id as material_id,
    mc.code as code,
    mc.name as description,
    mc.unit as unit,
    mc.category as category,
    -- Aggregate source items
    ARRAY_AGG(DISTINCT COALESCE(ed.library_code, ed.name)) as source_items,
    -- Calculate base quantity without wastage
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(mf.quantity_per_unit, 0)
    ) as base_quantity,
    -- Average wastage factor
    AVG(1 + COALESCE(mf.wastage_percentage, 0)/100) as wastage_factor,
    -- Total quantity with wastage
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(mf.quantity_per_unit, 0) * 
      (1 + COALESCE(mf.wastage_percentage, 0)/100)
    ) as total_quantity,
    -- Market rate from catalogue
    mc.rate as rate_market,
    -- Contract rate (if exists)
    pr.contract_rate as rate_contract
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN material_factors mf ON mf.library_item_id = li.id
  LEFT JOIN materials_catalogue mc ON mf.material_catalogue_id = mc.id
  LEFT JOIN project_rates pr ON pr.project_id = p.id 
    AND pr.catalogue_type = 'material' 
    AND pr.catalogue_id = mc.id
  WHERE ed.is_from_library = true AND mc.id IS NOT NULL
  GROUP BY p.id, p.name, mc.id, mc.code, mc.name, mc.unit, 
           mc.category, mc.rate, pr.contract_rate
)
SELECT 
  project_id,
  project_name,
  material_id,
  code,
  description,
  unit,
  category,
  source_items,
  base_quantity,
  wastage_factor,
  total_quantity,
  rate_market,
  rate_contract,
  total_quantity * rate_market as amount_market,
  total_quantity * COALESCE(rate_contract, rate_market) as amount_contract
FROM material_aggregation
ORDER BY category, description;

-- Labour Schedule View with improved columns
CREATE OR REPLACE VIEW estimate_labour_schedule AS
WITH labour_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    lc.id as labour_id,
    lc.code as code,
    lc.name as description,
    lc.trade as trade,
    lc.skill_level as skill_level,
    -- Aggregate source items
    ARRAY_AGG(DISTINCT COALESCE(ed.library_code, ed.name)) as source_items,
    -- Total hours from calculations
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(lf.hours_per_unit, 0)
    ) as total_hours,
    -- Productivity factor (default 0.85 if not specified)
    COALESCE(AVG(lf.productivity_factor), 0.85) as productivity_factor,
    -- Standard rate from catalogue
    lc.hourly_rate as rate_standard,
    -- Project rate (if exists)
    pr.contract_rate as rate_project,
    -- Recommended crew size
    MAX(COALESCE(lf.crew_size, 1)) as crew_size
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN labour_factors lf ON lf.library_item_id = li.id
  LEFT JOIN labour_catalogue lc ON lf.labour_catalogue_id = lc.id
  LEFT JOIN project_rates pr ON pr.project_id = p.id 
    AND pr.catalogue_type = 'labour' 
    AND pr.catalogue_id = lc.id
  WHERE ed.is_from_library = true AND lc.id IS NOT NULL
  GROUP BY p.id, p.name, lc.id, lc.code, lc.name, lc.trade, 
           lc.skill_level, lc.hourly_rate, pr.contract_rate
)
SELECT 
  project_id,
  project_name,
  labour_id,
  code,
  description,
  trade,
  skill_level,
  source_items,
  total_hours,
  productivity_factor,
  total_hours / productivity_factor as adjusted_hours,
  crew_size,
  rate_standard,
  rate_project,
  (total_hours / productivity_factor) * rate_standard as amount_standard,
  (total_hours / productivity_factor) * COALESCE(rate_project, rate_standard) as amount_project,
  CEIL((total_hours / productivity_factor) / 8) as total_days
FROM labour_aggregation
ORDER BY trade, description;

-- Equipment Schedule View with improved columns
CREATE OR REPLACE VIEW estimate_equipment_schedule AS
WITH equipment_aggregation AS (
  SELECT 
    p.id as project_id,
    p.name as project_name,
    ec.id as equipment_id,
    ec.code as code,
    ec.name as description,
    ec.category as category,
    ec.capacity as capacity,
    -- Aggregate source items
    ARRAY_AGG(DISTINCT COALESCE(ed.library_code, ed.name)) as source_items,
    -- Base hours from calculations
    SUM(
      COALESCE(ed.quantity, 0) * 
      COALESCE(ef.hours_per_unit, 0)
    ) as base_hours,
    -- Utilization factor (default 0.75 if not specified)
    COALESCE(AVG(ef.utilization_factor), 0.75) as utilization_factor,
    -- Units required
    MAX(COALESCE(ef.units_required, 1)) as units_required,
    -- Owned rate (internal cost)
    ec.owned_rate as rate_owned,
    -- Rental rate from catalogue
    ec.hourly_rate as rate_rental,
    -- Project rental rate (if negotiated)
    pr.contract_rate as rate_rental_project
  FROM estimate_detail_items ed
  INNER JOIN estimate_elements ee ON ed.element_id = ee.id
  INNER JOIN estimate_structures es ON ee.structure_id = es.id
  INNER JOIN projects p ON es.project_id = p.id
  LEFT JOIN library_items li ON ed.library_item_id = li.id
  LEFT JOIN equipment_factors ef ON ef.library_item_id = li.id
  LEFT JOIN equipment_catalogue ec ON ef.equipment_catalogue_id = ec.id
  LEFT JOIN project_rates pr ON pr.project_id = p.id 
    AND pr.catalogue_type = 'equipment' 
    AND pr.catalogue_id = ec.id
  WHERE ed.is_from_library = true AND ec.id IS NOT NULL
  GROUP BY p.id, p.name, ec.id, ec.code, ec.name, ec.category, 
           ec.capacity, ec.owned_rate, ec.hourly_rate, pr.contract_rate
)
SELECT 
  project_id,
  project_name,
  equipment_id,
  code,
  description,
  category,
  capacity,
  source_items,
  base_hours,
  utilization_factor,
  base_hours / utilization_factor as billable_hours,
  units_required,
  rate_owned,
  rate_rental,
  rate_rental_project,
  (base_hours / utilization_factor) * COALESCE(rate_owned, 0) as amount_owned,
  (base_hours / utilization_factor) * COALESCE(rate_rental_project, rate_rental) as amount_rental,
  CEIL((base_hours / utilization_factor) / 8) as total_days
FROM equipment_aggregation
ORDER BY category, description;

-- Step 5: Create helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create audit trigger
CREATE TRIGGER update_estimate_library_usage_updated_at
    BEFORE UPDATE ON estimate_library_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Grant permissions
GRANT SELECT ON estimate_material_schedule TO authenticated;
GRANT SELECT ON estimate_labour_schedule TO authenticated;
GRANT SELECT ON estimate_equipment_schedule TO authenticated;
GRANT ALL ON estimate_library_usage TO authenticated;

COMMIT;
```

### Rollback Script

```sql
-- migrations/2024_01_15_library_estimate_integration_rollback.sql
BEGIN;

-- Drop views
DROP VIEW IF EXISTS estimate_material_schedule CASCADE;
DROP VIEW IF EXISTS estimate_labour_schedule CASCADE;
DROP VIEW IF EXISTS estimate_equipment_schedule CASCADE;

-- Drop usage tracking table
DROP TABLE IF EXISTS estimate_library_usage CASCADE;

-- Remove columns from estimate tables
ALTER TABLE estimate_elements 
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS hierarchy_level,
DROP COLUMN IF EXISTS parent_element_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS is_from_library;

ALTER TABLE estimate_detail_items 
DROP COLUMN IF EXISTS library_item_id,
DROP COLUMN IF EXISTS library_division_id,
DROP COLUMN IF EXISTS library_section_id,
DROP COLUMN IF EXISTS library_assembly_id,
DROP COLUMN IF EXISTS library_code,
DROP COLUMN IF EXISTS library_path,
DROP COLUMN IF EXISTS factor_breakdown,
DROP COLUMN IF EXISTS is_from_library;

COMMIT;
```

### Migration Testing Script

```bash
#!/bin/bash
# scripts/test-migration.sh

echo "Testing Library-Estimate Integration Migration..."

# Test on local database
echo "1. Creating test database..."
createdb test_library_estimate

echo "2. Running base migrations..."
psql test_library_estimate < migrations/base_schema.sql

echo "3. Running integration migration..."
psql test_library_estimate < migrations/2024_01_15_library_estimate_integration.sql

echo "4. Testing rollback..."
psql test_library_estimate < migrations/2024_01_15_library_estimate_integration_rollback.sql

echo "5. Re-applying migration..."
psql test_library_estimate < migrations/2024_01_15_library_estimate_integration.sql

echo "6. Running validation queries..."
psql test_library_estimate << EOF
-- Check if all columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'estimate_elements' 
AND column_name LIKE 'library_%';

-- Check if views exist
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE 'estimate_%_schedule';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('estimate_elements', 'estimate_detail_items')
AND indexname LIKE 'idx_%library%';
EOF

echo "7. Cleaning up..."
dropdb test_library_estimate

echo "Migration test complete!"
```

## Database Schema Changes

### 1. Estimate Hierarchy Enhancement

```sql
-- Add library reference columns to estimate_elements for Division/Section/Assembly hierarchy
ALTER TABLE estimate_elements ADD COLUMN library_division_id UUID REFERENCES divisions(id);
ALTER TABLE estimate_elements ADD COLUMN library_section_id UUID REFERENCES sections(id);
ALTER TABLE estimate_elements ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id);
ALTER TABLE estimate_elements ADD COLUMN hierarchy_level INTEGER; -- 1=Element, 2=Division, 3=Section, 4=Assembly
ALTER TABLE estimate_elements ADD COLUMN parent_element_id UUID REFERENCES estimate_elements(id);
ALTER TABLE estimate_elements ADD COLUMN library_code VARCHAR(20);
ALTER TABLE estimate_elements ADD COLUMN library_path TEXT;

-- Add library reference columns to estimate_detail_items  
ALTER TABLE estimate_detail_items ADD COLUMN library_item_id UUID REFERENCES library_items(id);
ALTER TABLE estimate_detail_items ADD COLUMN library_division_id UUID REFERENCES divisions(id);
ALTER TABLE estimate_detail_items ADD COLUMN library_section_id UUID REFERENCES sections(id);
ALTER TABLE estimate_detail_items ADD COLUMN library_assembly_id UUID REFERENCES assemblies(id);
ALTER TABLE estimate_detail_items ADD COLUMN library_code VARCHAR(20);
ALTER TABLE estimate_detail_items ADD COLUMN library_path TEXT;

-- Create indexes for performance
CREATE INDEX idx_estimate_elements_library_division ON estimate_elements(library_division_id);
CREATE INDEX idx_estimate_elements_library_section ON estimate_elements(library_section_id);
CREATE INDEX idx_estimate_elements_library_assembly ON estimate_elements(library_assembly_id);
CREATE INDEX idx_estimate_elements_parent ON estimate_elements(parent_element_id);
CREATE INDEX idx_estimate_detail_items_library_item ON estimate_detail_items(library_item_id);
CREATE INDEX idx_estimate_detail_items_library_path ON estimate_detail_items(library_path);
```

### 2. Library Usage Tracking

```sql
-- Create table to track library item usage in estimates
CREATE TABLE estimate_library_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    library_item_id UUID REFERENCES library_items(id),
    estimate_detail_item_id UUID REFERENCES estimate_detail_items(id),
    selected_at TIMESTAMP DEFAULT NOW(),
    selected_by UUID REFERENCES auth.users(id),
    quantity DECIMAL(10,2),
    calculated_rate DECIMAL(10,2),
    factor_breakdown JSONB -- Store material/labor/equipment breakdown
);
```

### 3. Hierarchy Mapping Views

```sql
-- Create view for library-estimate hierarchy mapping
CREATE VIEW estimate_library_hierarchy AS
SELECT 
    ed.id as detail_item_id,
    ed.name as detail_item_name,
    ed.quantity,
    ed.unit,
    ed.rate,
    ed.amount,
    d.code as division_code,
    d.name as division_name,
    s.code as section_code,
    s.name as section_name,
    a.code as assembly_code,
    a.name as assembly_name,
    li.code as item_code,
    li.name as item_name,
    li.specifications,
    es.name as structure_name,
    ee.name as element_name
FROM estimate_detail_items ed
LEFT JOIN library_items li ON ed.library_item_id = li.id
LEFT JOIN assemblies a ON li.assembly_id = a.id
LEFT JOIN sections s ON a.section_id = s.id
LEFT JOIN divisions d ON s.division_id = d.id
LEFT JOIN estimate_elements ee ON ed.element_id = ee.id
LEFT JOIN estimate_structures es ON ee.structure_id = es.id;
```

### 4. Material, Labour, and Equipment Schedule Views

```sql
-- Create view for aggregated material schedule
CREATE VIEW estimate_material_schedule AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    mc.id as material_id,
    mc.name as material_name,
    mc.unit as material_unit,
    mc.code as material_code,
    SUM(ed.quantity * mf.quantity_per_unit * (1 + mf.wastage_percentage/100)) as total_quantity,
    mc.rate as unit_rate,
    SUM(ed.quantity * mf.quantity_per_unit * (1 + mf.wastage_percentage/100) * mc.rate) as total_cost
FROM estimate_detail_items ed
INNER JOIN estimate_elements ee ON ed.element_id = ee.id
INNER JOIN estimate_structures es ON ee.structure_id = es.id
INNER JOIN projects p ON es.project_id = p.id
INNER JOIN library_items li ON ed.library_item_id = li.id
INNER JOIN material_factors mf ON mf.library_item_id = li.id
INNER JOIN materials_catalogue mc ON mf.material_catalogue_id = mc.id
GROUP BY p.id, p.name, mc.id, mc.name, mc.unit, mc.code, mc.rate
ORDER BY mc.name;

-- Create view for aggregated labour schedule
CREATE VIEW estimate_labour_schedule AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    lc.id as labour_id,
    lc.name as labour_name,
    lc.trade as labour_trade,
    lc.skill_level,
    SUM(ed.quantity * lf.hours_per_unit) as total_hours,
    lc.hourly_rate,
    SUM(ed.quantity * lf.hours_per_unit * lc.hourly_rate) as total_cost
FROM estimate_detail_items ed
INNER JOIN estimate_elements ee ON ed.element_id = ee.id
INNER JOIN estimate_structures es ON ee.structure_id = es.id
INNER JOIN projects p ON es.project_id = p.id
INNER JOIN library_items li ON ed.library_item_id = li.id
INNER JOIN labour_factors lf ON lf.library_item_id = li.id
INNER JOIN labour_catalogue lc ON lf.labour_catalogue_id = lc.id
GROUP BY p.id, p.name, lc.id, lc.name, lc.trade, lc.skill_level, lc.hourly_rate
ORDER BY lc.trade, lc.name;

-- Create view for aggregated equipment schedule
CREATE VIEW estimate_equipment_schedule AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    ec.id as equipment_id,
    ec.name as equipment_name,
    ec.category as equipment_category,
    SUM(ed.quantity * ef.hours_per_unit) as total_hours,
    ec.hourly_rate,
    SUM(ed.quantity * ef.hours_per_unit * ec.hourly_rate) as total_cost
FROM estimate_detail_items ed
INNER JOIN estimate_elements ee ON ed.element_id = ee.id
INNER JOIN estimate_structures es ON ee.structure_id = es.id
INNER JOIN projects p ON es.project_id = p.id
INNER JOIN library_items li ON ed.library_item_id = li.id
INNER JOIN equipment_factors ef ON ef.library_item_id = li.id
INNER JOIN equipment_catalogue ec ON ef.equipment_catalogue_id = ec.id
GROUP BY p.id, p.name, ec.id, ec.name, ec.category, ec.hourly_rate
ORDER BY ec.category, ec.name;

-- Create indexes for performance optimization
CREATE INDEX idx_material_factors_library_item ON material_factors(library_item_id);
CREATE INDEX idx_labour_factors_library_item ON labour_factors(library_item_id);
CREATE INDEX idx_equipment_factors_library_item ON equipment_factors(library_item_id);
CREATE INDEX idx_estimate_detail_items_project ON estimate_detail_items(element_id);
```

## Implementation Components

### 1. Library Item Selector Component

```typescript
// src/features/estimates/components/LibraryItemSelector.tsx
interface LibraryItemSelectorProps {
  onItemSelect: (item: LibraryItem) => void;
  onMultipleSelect: (items: LibraryItem[]) => void;
  projectId: string;
  showFactorPreview?: boolean;
  allowMultipleSelection?: boolean;
}

export const LibraryItemSelector: React.FC<LibraryItemSelectorProps> = ({
  onItemSelect,
  onMultipleSelect,
  projectId,
  showFactorPreview = true,
  allowMultipleSelection = false
}) => {
  const [selectedItems, setSelectedItems] = useState<LibraryItem[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  return (
    <Dialog>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Select Library Items for Estimate</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Library Browser */}
          <div className="space-y-4">
            <LibraryBrowser
              onItemSelect={handleItemSelect}
              selectedItems={selectedItems}
              showOnlyConfirmed={true}
              allowMultipleSelection={allowMultipleSelection}
            />
          </div>
          
          {/* Right: Factor Preview */}
          {showFactorPreview && (
            <div className="space-y-4">
              <FactorPreview
                items={selectedItems}
                projectId={projectId}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            onClick={() => onMultipleSelect(selectedItems)}
            disabled={selectedItems.length === 0}
          >
            Add Selected Items ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 2. Factor Preview Component

```typescript
// src/features/estimates/components/FactorPreview.tsx
interface FactorPreviewProps {
  items: LibraryItem[];
  projectId: string;
}

export const FactorPreview: React.FC<FactorPreviewProps> = ({ items, projectId }) => {
  const [calculations, setCalculations] = useState<FactorCalculation[]>([]);
  
  useEffect(() => {
    const calculateFactors = async () => {
      const results = await Promise.all(
        items.map(item => FactorCalculatorService.calculateItemCost(item.id, projectId))
      );
      setCalculations(results);
    };
    
    if (items.length > 0) {
      calculateFactors();
    }
  }, [items, projectId]);
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cost Breakdown Preview</h3>
      {calculations.map((calc, index) => (
        <Card key={items[index].id} className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{items[index].name}</span>
              <span className="text-sm text-gray-500">{items[index].code}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Material:</span>
                <span>${calc.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Labor:</span>
                <span>${calc.laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Equipment:</span>
                <span>${calc.equipmentCost.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold">
                <span>Total Rate:</span>
                <span>${calc.totalRate.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
```

### 3. Intelligent Grouping Service

```typescript
// src/services/EstimateLibraryGroupingService.ts
interface LibraryHierarchyNode {
  divisionId: string;
  sectionId: string;
  assemblyId: string;
  itemId: string;
  path: string;
  item: LibraryItem;
}

class EstimateLibraryGroupingService {
  static async createEstimateFromLibraryItems(
    projectId: string,
    libraryItems: LibraryItem[]
  ): Promise<EstimateCreationResult> {
    const hierarchyNodes = await this.buildHierarchyNodes(libraryItems);
    const groupedStructure = this.groupByHierarchy(hierarchyNodes);
    
    return await this.createEstimateStructure(projectId, groupedStructure);
  }
  
  private static async buildHierarchyNodes(
    items: LibraryItem[]
  ): Promise<LibraryHierarchyNode[]> {
    const nodes: LibraryHierarchyNode[] = [];
    
    for (const item of items) {
      const hierarchy = await this.getItemHierarchy(item.id);
      nodes.push({
        divisionId: hierarchy.division.id,
        sectionId: hierarchy.section.id,
        assemblyId: hierarchy.assembly.id,
        itemId: item.id,
        path: `${hierarchy.division.code}.${hierarchy.section.code}.${hierarchy.assembly.code}`,
        item
      });
    }
    
    return nodes;
  }
  
  private static groupByHierarchy(nodes: LibraryHierarchyNode[]) {
    const grouped = new Map<string, {
      division: Division;
      sections: Map<string, {
        section: Section;
        assemblies: Map<string, {
          assembly: Assembly;
          items: LibraryItem[];
        }>;
      }>;
    }>();
    
    for (const node of nodes) {
      // Group by division
      if (!grouped.has(node.divisionId)) {
        grouped.set(node.divisionId, {
          division: node.item.assembly.section.division,
          sections: new Map()
        });
      }
      
      const divisionGroup = grouped.get(node.divisionId)!;
      
      // Group by section
      if (!divisionGroup.sections.has(node.sectionId)) {
        divisionGroup.sections.set(node.sectionId, {
          section: node.item.assembly.section,
          assemblies: new Map()
        });
      }
      
      const sectionGroup = divisionGroup.sections.get(node.sectionId)!;
      
      // Group by assembly
      if (!sectionGroup.assemblies.has(node.assemblyId)) {
        sectionGroup.assemblies.set(node.assemblyId, {
          assembly: node.item.assembly,
          items: []
        });
      }
      
      const assemblyGroup = sectionGroup.assemblies.get(node.assemblyId)!;
      assemblyGroup.items.push(node.item);
    }
    
    return grouped;
  }
  
  private static async createEstimateStructure(
    projectId: string,
    groupedStructure: any,
    targetStructureId: string, // User-selected structure (Main House, Banda, Parking)
    targetElementId: string    // User-selected element (Substructure, Walling, External Finish)
  ): Promise<EstimateCreationResult> {
    const createdElements: EstimateElement[] = [];
    const createdDetailItems: EstimateDetailItem[] = [];
    
    for (const [divisionId, divisionGroup] of groupedStructure) {
      // Create Division Element (Level 2)
      const divisionElement = await EstimateService.createElement({
        projectId,
        structureId: targetStructureId,
        name: `${divisionGroup.division.code} - ${divisionGroup.division.name}`,
        parentElementId: targetElementId,
        hierarchyLevel: 2, // Division level
        libraryDivisionId: divisionId,
        libraryCode: divisionGroup.division.code,
        libraryPath: divisionGroup.division.code
      });
      createdElements.push(divisionElement);
      
      for (const [sectionId, sectionGroup] of divisionGroup.sections) {
        // Create Section Element (Level 3)
        const sectionElement = await EstimateService.createElement({
          projectId,
          structureId: targetStructureId,
          name: `${sectionGroup.section.code} - ${sectionGroup.section.name}`,
          parentElementId: divisionElement.id,
          hierarchyLevel: 3, // Section level
          libraryDivisionId: divisionId,
          librarySectionId: sectionId,
          libraryCode: sectionGroup.section.code,
          libraryPath: `${divisionGroup.division.code}.${sectionGroup.section.code}`
        });
        createdElements.push(sectionElement);
        
        for (const [assemblyId, assemblyGroup] of sectionGroup.assemblies) {
          // Create Assembly Element (Level 4)
          const assemblyElement = await EstimateService.createElement({
            projectId,
            structureId: targetStructureId,
            name: `${assemblyGroup.assembly.code} - ${assemblyGroup.assembly.name}`,
            parentElementId: sectionElement.id,
            hierarchyLevel: 4, // Assembly level
            libraryDivisionId: divisionId,
            librarySectionId: sectionId,
            libraryAssemblyId: assemblyId,
            libraryCode: assemblyGroup.assembly.code,
            libraryPath: `${divisionGroup.division.code}.${sectionGroup.section.code}.${assemblyGroup.assembly.code}`
          });
          createdElements.push(assemblyElement);
          
          // Create Detail Items under Assembly (Level 5)
          for (const item of assemblyGroup.items) {
            const calculatedRate = await FactorCalculatorService.calculateItemCost(
              item.id,
              projectId
            );
            
            const detailItem = await EstimateService.createDetailItem({
              projectId,
              elementId: assemblyElement.id,
              name: `${item.code} - ${item.name}`,
              quantity: 1,
              unit: item.unit,
              rate: calculatedRate.totalRate,
              libraryItemId: item.id,
              libraryDivisionId: divisionId,
              librarySectionId: sectionId,
              libraryAssemblyId: assemblyId,
              libraryCode: item.code,
              libraryPath: `${divisionGroup.division.code}.${sectionGroup.section.code}.${assemblyGroup.assembly.code}.${item.code}`
            });
            createdDetailItems.push(detailItem);
          }
        }
      }
    }
    
    return {
      elements: createdElements,
      detailItems: createdDetailItems
    };
  }
}
```

### 4. Factor Calculator Service

```typescript
// src/services/FactorCalculatorService.ts
interface FactorCalculation {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalRate: number;
  breakdown: {
    materials: MaterialFactorBreakdown[];
    labor: LaborFactorBreakdown[];
    equipment: EquipmentFactorBreakdown[];
  };
}

class FactorCalculatorService {
  static async calculateItemCost(
    libraryItemId: string,
    projectId: string
  ): Promise<FactorCalculation> {
    const [materialFactors, laborFactors, equipmentFactors] = await Promise.all([
      this.getMaterialFactors(libraryItemId),
      this.getLaborFactors(libraryItemId),
      this.getEquipmentFactors(libraryItemId)
    ]);
    
    const projectRates = await this.getProjectRates(projectId);
    
    const materialCost = await this.calculateMaterialCost(materialFactors, projectRates);
    const laborCost = await this.calculateLaborCost(laborFactors, projectRates);
    const equipmentCost = await this.calculateEquipmentCost(equipmentFactors, projectRates);
    
    return {
      materialCost,
      laborCost,
      equipmentCost,
      totalRate: materialCost + laborCost + equipmentCost,
      breakdown: {
        materials: materialFactors,
        labor: laborFactors,
        equipment: equipmentFactors
      }
    };
  }
  
  private static async calculateMaterialCost(
    factors: MaterialFactorBreakdown[],
    projectRates: ProjectRates
  ): Promise<number> {
    let totalCost = 0;
    
    for (const factor of factors) {
      const unitRate = projectRates.materials[factor.catalogueId] || factor.defaultRate;
      const baseQuantity = factor.quantityPerUnit;
      const wastageMultiplier = 1 + (factor.wastagePercentage / 100);
      const adjustedQuantity = baseQuantity * wastageMultiplier;
      
      totalCost += adjustedQuantity * unitRate;
    }
    
    return totalCost;
  }
  
  private static async calculateLaborCost(
    factors: LaborFactorBreakdown[],
    projectRates: ProjectRates
  ): Promise<number> {
    let totalCost = 0;
    
    for (const factor of factors) {
      const hourlyRate = projectRates.labor[factor.catalogueId] || factor.defaultRate;
      const hours = factor.hoursPerUnit;
      
      totalCost += hours * hourlyRate;
    }
    
    return totalCost;
  }
  
  private static async calculateEquipmentCost(
    factors: EquipmentFactorBreakdown[],
    projectRates: ProjectRates
  ): Promise<number> {
    let totalCost = 0;
    
    for (const factor of factors) {
      const hourlyRate = projectRates.equipment[factor.catalogueId] || factor.defaultRate;
      const hours = factor.hoursPerUnit;
      
      totalCost += hours * hourlyRate;
    }
    
    return totalCost;
  }
}
```

### 5. Enhanced AddEstimateDialog

```typescript
// src/features/estimates/components/AddEstimateDialog.tsx
interface AddEstimateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  parentType: 'structure' | 'element';
  parentId?: string;
  onSuccess: () => void;
}

export const AddEstimateDialog: React.FC<AddEstimateDialogProps> = ({
  open,
  onClose,
  projectId,
  parentType,
  parentId,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'library'>('manual');
  const [selectedLibraryItems, setSelectedLibraryItems] = useState<LibraryItem[]>([]);
  
  const handleLibraryItemsSelected = async (items: LibraryItem[]) => {
    try {
      if (parentType === 'structure') {
        // Create elements from library items
        await EstimateLibraryGroupingService.createElementsFromLibraryItems(
          projectId,
          parentId!,
          items
        );
      } else {
        // Create detail items from library items
        await EstimateLibraryGroupingService.createDetailItemsFromLibraryItems(
          projectId,
          parentId!,
          items
        );
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating estimate items from library:', error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Estimate Item</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="library">From Library</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <ManualEntryForm
              projectId={projectId}
              parentType={parentType}
              parentId={parentId}
              onSuccess={onSuccess}
            />
          </TabsContent>
          
          <TabsContent value="library">
            <LibraryItemSelector
              projectId={projectId}
              onMultipleSelect={handleLibraryItemsSelected}
              allowMultipleSelection={true}
              showFactorPreview={true}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
```

### 6. Material Schedule Tab Component

```typescript
// src/features/estimates/components/MaterialScheduleTab.tsx
interface MaterialScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const MaterialScheduleTab: React.FC<MaterialScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const [materials, setMaterials] = useState<MaterialScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMaterialSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/estimates/${projectId}/materials`);
        const data = await response.json();
        setMaterials(data);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterialSchedule();
  }, [projectId, refreshTrigger]);
  
  const exportToExcel = () => {
    // Export material schedule for procurement
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Material Schedule</h3>
        <Button onClick={exportToExcel} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material Code</TableHead>
              <TableHead>Material Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Required Qty</TableHead>
              <TableHead className="text-right">Wastage %</TableHead>
              <TableHead className="text-right">Total Qty</TableHead>
              <TableHead className="text-right">Unit Rate</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell>{material.code}</TableCell>
                <TableCell>{material.name}</TableCell>
                <TableCell>{material.unit}</TableCell>
                <TableCell className="text-right">
                  {material.requiredQuantity.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {material.wastagePercentage}%
                </TableCell>
                <TableCell className="text-right font-medium">
                  {material.totalQuantity.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${material.unitRate.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${material.totalCost.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="text-right font-semibold">
                Total Material Cost:
              </TableCell>
              <TableCell className="text-right font-semibold">
                ${materials.reduce((sum, m) => sum + m.totalCost, 0).toFixed(2)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};
```

### 7. Labour Schedule Tab Component

```typescript
// src/features/estimates/components/LabourScheduleTab.tsx
interface LabourScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const LabourScheduleTab: React.FC<LabourScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const [labourItems, setLabourItems] = useState<LabourScheduleItem[]>([]);
  const [groupBy, setGroupBy] = useState<'trade' | 'skill'>('trade');
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Labour Requirements</h3>
        <div className="flex gap-2">
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trade">Group by Trade</SelectItem>
              <SelectItem value="skill">Group by Skill Level</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Schedule
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labourItems.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="text-base">{group.tradeName}</CardTitle>
              <CardDescription>{group.skillLevel}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Hours:</span>
                  <span className="font-medium">{group.totalHours.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Hourly Rate:</span>
                  <span>${group.hourlyRate.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Cost:</span>
                  <span className="font-semibold">${group.totalCost.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Labour Hours:</span>
            <p className="font-semibold text-lg">
              {labourItems.reduce((sum, l) => sum + l.totalHours, 0).toFixed(0)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Labour Cost:</span>
            <p className="font-semibold text-lg">
              ${labourItems.reduce((sum, l) => sum + l.totalCost, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Crew Size (8hr/day):</span>
            <p className="font-semibold text-lg">
              {Math.ceil(labourItems.reduce((sum, l) => sum + l.totalHours, 0) / 8)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Duration (days):</span>
            <p className="font-semibold text-lg">
              {Math.ceil(labourItems.reduce((sum, l) => sum + l.totalHours, 0) / (8 * 10))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 8. Equipment Schedule Tab Component

```typescript
// src/features/estimates/components/EquipmentScheduleTab.tsx
interface EquipmentScheduleTabProps {
  projectId: string;
  refreshTrigger?: number;
}

export const EquipmentScheduleTab: React.FC<EquipmentScheduleTabProps> = ({ 
  projectId, 
  refreshTrigger 
}) => {
  const [equipment, setEquipment] = useState<EquipmentScheduleItem[]>([]);
  const [view, setView] = useState<'list' | 'timeline'>('list');
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Equipment Schedule</h3>
        <div className="flex gap-2">
          <ToggleGroup type="single" value={view} onValueChange={setView}>
            <ToggleGroupItem value="list">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="timeline">
              <Calendar className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Schedule
          </Button>
        </div>
      </div>
      
      {view === 'list' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Code</TableHead>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">Days (8hr)</TableHead>
                <TableHead className="text-right">Hourly Rate</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right">
                    {item.totalHours.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Math.ceil(item.totalHours / 8)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${item.hourlyRate.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${item.totalCost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-semibold">
                  Total Equipment Cost:
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${equipment.reduce((sum, e) => sum + e.totalCost, 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      ) : (
        <EquipmentTimeline equipment={equipment} />
      )}
    </div>
  );
};
```

### 9. Main Estimate Tabs Component

```typescript
// src/features/estimates/components/EstimateTabs.tsx
interface EstimateTabsProps {
  projectId: string;
}

export const EstimateTabs: React.FC<EstimateTabsProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('bq');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Trigger refresh of calculated tabs when BQ changes
  const handleBQUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="bq">
          <FileText className="mr-2 h-4 w-4" />
          BQ
        </TabsTrigger>
        <TabsTrigger value="materials">
          <Package className="mr-2 h-4 w-4" />
          Materials
        </TabsTrigger>
        <TabsTrigger value="labour">
          <Users className="mr-2 h-4 w-4" />
          Labour
        </TabsTrigger>
        <TabsTrigger value="equipment">
          <Wrench className="mr-2 h-4 w-4" />
          Equipment
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="bq" className="mt-6">
        <BQTab projectId={projectId} onUpdate={handleBQUpdate} />
      </TabsContent>
      
      <TabsContent value="materials" className="mt-6">
        <MaterialScheduleTab projectId={projectId} refreshTrigger={refreshTrigger} />
      </TabsContent>
      
      <TabsContent value="labour" className="mt-6">
        <LabourScheduleTab projectId={projectId} refreshTrigger={refreshTrigger} />
      </TabsContent>
      
      <TabsContent value="equipment" className="mt-6">
        <EquipmentScheduleTab projectId={projectId} refreshTrigger={refreshTrigger} />
      </TabsContent>
    </Tabs>
  );
};
```

## API Endpoints

### 1. Library Integration APIs

```typescript
// src/app/api/estimates/library/route.ts
export async function POST(request: Request) {
  try {
    const { projectId, libraryItems } = await request.json();
    
    const result = await EstimateLibraryGroupingService.createEstimateFromLibraryItems(
      projectId,
      libraryItems
    );
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/estimates/library/calculate/route.ts
export async function POST(request: Request) {
  try {
    const { libraryItemId, projectId } = await request.json();
    
    const calculation = await FactorCalculatorService.calculateItemCost(
      libraryItemId,
      projectId
    );
    
    return NextResponse.json(calculation);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2. Schedule APIs for Material, Labour, and Equipment Tabs

```typescript
// src/app/api/estimates/[projectId]/materials/route.ts
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const materials = await supabase
      .from('estimate_material_schedule')
      .select('*')
      .eq('project_id', params.projectId)
      .order('material_name');
    
    return NextResponse.json(materials.data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/estimates/[projectId]/labour/route.ts
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const labour = await supabase
      .from('estimate_labour_schedule')
      .select('*')
      .eq('project_id', params.projectId)
      .order('labour_trade, labour_name');
    
    return NextResponse.json(labour.data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/estimates/[projectId]/equipment/route.ts
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const equipment = await supabase
      .from('estimate_equipment_schedule')
      .select('*')
      .eq('project_id', params.projectId)
      .order('equipment_category, equipment_name');
    
    return NextResponse.json(equipment.data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Hierarchy Management APIs

```typescript
// src/app/api/estimates/hierarchy/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const hierarchy = await EstimateService.getEstimateHierarchy(projectId);
    
    return NextResponse.json(hierarchy);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
// __tests__/services/EstimateLibraryGroupingService.test.ts
describe('EstimateLibraryGroupingService', () => {
  describe('createEstimateFromLibraryItems', () => {
    it('should create proper hierarchy from library items', async () => {
      const mockLibraryItems = [
        createMockLibraryItem({ code: '02.10.10.01', divisionCode: '02' }),
        createMockLibraryItem({ code: '02.10.10.02', divisionCode: '02' }),
        createMockLibraryItem({ code: '02.10.20.01', divisionCode: '02' })
      ];
      
      const result = await EstimateLibraryGroupingService.createEstimateFromLibraryItems(
        'project-1',
        mockLibraryItems
      );
      
      expect(result.structures).toHaveLength(1); // One division
      expect(result.elements).toHaveLength(2); // Two sections
      expect(result.detailItems).toHaveLength(3); // Three items
    });
  });
});
```

### 2. Integration Tests

```typescript
// __tests__/integration/LibraryEstimateIntegration.test.ts
describe('Library-Estimate Integration', () => {
  it('should create estimate from library selection end-to-end', async () => {
    // Setup test data
    const project = await createTestProject();
    const libraryItems = await createTestLibraryItems();
    
    // Test the integration
    const response = await fetch('/api/estimates/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        libraryItems: libraryItems.map(item => item.id)
      })
    });
    
    const result = await response.json();
    
    // Verify results
    expect(result.structures).toBeDefined();
    expect(result.elements).toBeDefined();
    expect(result.detailItems).toBeDefined();
    
    // Verify database state
    const estimate = await EstimateService.getProjectEstimate(project.id);
    expect(estimate.structures).toHaveLength(1);
  });
});
```

## Migration Plan

### Phase 1: Database Schema Updates
1. **Add library reference columns** to estimate tables
2. **Create library usage tracking** tables
3. **Update constraints and indexes** for performance
4. **Create migration scripts** for existing data

### Phase 2: Core Services Implementation
1. **Implement FactorCalculatorService** for cost calculations
2. **Create EstimateLibraryGroupingService** for hierarchy management
3. **Update EstimateService** with library integration methods
4. **Add validation and error handling**

### Phase 3: UI Components Development
1. **Create LibraryItemSelector** component
2. **Implement FactorPreview** component
3. **Update AddEstimateDialog** with library tabs
4. **Add library indicators** to estimate display

### Phase 4: API Integration
1. **Create library-estimate API endpoints**
2. **Update existing estimate APIs** for library support
3. **Add hierarchy management endpoints**
4. **Implement caching for performance**

### Phase 5: Testing and Deployment
1. **Comprehensive unit testing** of all services
2. **Integration testing** of the complete flow
3. **User acceptance testing** with real data
4. **Performance testing** with large datasets
5. **Production deployment** with rollback plan

## Benefits

### 1. Standardization
- **Consistent rates** across all estimates
- **Standardized specifications** from library
- **Centralized maintenance** of item definitions
- **Quality control** through library validation

### 2. Efficiency
- **Faster estimate creation** through library selection
- **Automatic cost calculation** from factors
- **Reduced manual errors** through automation
- **Template-based estimates** for common projects

### 3. Accuracy
- **Factor-based calculations** instead of fixed percentages
- **Real-time cost updates** when library changes
- **Waste and productivity factors** included
- **Validated item specifications** from library

### 4. Traceability
- **Library item lineage** in estimates
- **Cost breakdown transparency** through factors
- **Usage analytics** for library items
- **Audit trail** for estimate changes

## Conclusion

This implementation guide provides a comprehensive approach to integrating the library system with estimates, creating a unified system where library items serve as the source of truth for all estimate detail items. The intelligent grouping system ensures that the library's 4-level hierarchy is properly mapped to the estimate's 6-level structure while avoiding duplication and maintaining performance.

### Key Benefits of the New System:

1. **Complete Library Hierarchy**: Full 6-level structure (Structure → Element → Division → Section → Assembly → Item) maintains all library organization
2. **Intelligent Grouping**: Automatic grouping of related items minimizes duplication while preserving hierarchy
3. **Real Construction Workflow**: Structures like "Main House", "Banda", "Parking" with elements like "Substructure", "Walling", "External Finish"
4. **Actual Library Items**: Uses real items like "03.10.10.01 - Concrete Grade 25 strip foundation" from your Construction Library
5. **Factor-Based Costing**: Automatic cost calculation from materials, labor, and equipment factors
6. **Performance Optimized**: Efficient database schema with proper indexing for fast hierarchical queries
7. **4-Tab Architecture**: Organized estimate view with BQ (main data), Materials, Labour, and Equipment tabs

### What Makes This System Smart:

- **No Duplication**: If you select multiple concrete items, the system creates "03 - Concrete" division only once
- **Logical Organization**: Items are grouped by construction phase and work type automatically  
- **Flexible Hierarchy**: Supports any combination of related/unrelated items with optimal structure
- **Scalable Design**: Can handle complex projects with multiple buildings and thousands of items
- **Single Source of Truth**: BQ tab is the master data, other tabs are automatically calculated views
- **Role-Based Views**: Different stakeholders can focus on their relevant tabs (estimators on BQ, procurement on Materials, etc.)

### The 4-Tab Structure Benefits:

1. **BQ Tab**: Complete bill of quantities with library integration
2. **Materials Tab**: Automatic material schedule with wastage calculations
3. **Labour Tab**: Workforce planning with trade grouping and cost analysis
4. **Equipment Tab**: Equipment scheduling with utilization tracking

The phased implementation approach allows for incremental development and testing, ensuring a smooth transition from the current manual system to the new library-integrated approach that will transform how estimates are created in your construction workflow.

## Testing Strategy for Feature-Based Architecture

### 1. Unit Testing Structure

Following the feature-based architecture, tests are organized alongside the code they test:

```
src/features/estimates/
├── services/
│   ├── factorCalculatorService.ts
│   ├── factorCalculatorService.test.ts
│   ├── libraryIntegrationService.ts
│   └── libraryIntegrationService.test.ts
├── components/
│   └── library-integration/
│       ├── LibraryItemSelector/
│       │   ├── LibraryItemSelector.tsx
│       │   └── LibraryItemSelector.test.tsx
│       └── FactorPreview/
│           ├── FactorPreview.tsx
│           └── FactorPreview.test.tsx
└── hooks/
    ├── useLibraryIntegration.ts
    └── useLibraryIntegration.test.ts
```

### 2. Test Categories

#### a. Service Tests
- **Location**: Next to service files
- **Focus**: Business logic, calculations, data transformations
- **Example**: `factorCalculatorService.test.ts`

```typescript
describe('FactorCalculatorService', () => {
  it('should calculate costs from multiple factors', async () => {
    // Test factor aggregation logic
  });
  
  it('should handle missing project rates', async () => {
    // Test fallback to default rates
  });
});
```

#### b. Component Tests
- **Location**: Within component folders
- **Focus**: UI behavior, user interactions, component state
- **Example**: `LibraryItemSelector.test.tsx`

```typescript
describe('LibraryItemSelector', () => {
  it('should allow multiple item selection', async () => {
    // Test multi-select functionality
  });
  
  it('should display factor preview when items selected', async () => {
    // Test preview panel visibility
  });
});
```

#### c. Hook Tests
- **Location**: Next to hook files
- **Focus**: Hook logic, state management, side effects
- **Example**: `useLibraryIntegration.test.ts`

```typescript
describe('useLibraryIntegration', () => {
  it('should handle loading states correctly', () => {
    // Test loading state transitions
  });
  
  it('should propagate service errors', async () => {
    // Test error handling
  });
});
```

#### d. Integration Tests
- **Location**: `src/features/estimates/__tests__/integration/`
- **Focus**: Feature-wide workflows, cross-component interactions
- **Example**: `libraryToEstimateFlow.test.tsx`

```typescript
describe('Library to Estimate Integration Flow', () => {
  it('should complete full item selection to hierarchy creation', async () => {
    // Test end-to-end flow
  });
});
```

### 3. Testing Best Practices

#### a. Mock Boundaries
- Mock at feature boundaries, not within features
- Use real implementations within a feature
- Mock external dependencies (database, API calls)

```typescript
// Mock external library feature
jest.mock('@/features/library/services/libraryService');

// Use real services within estimates feature
import { factorCalculatorService } from '../factorCalculatorService';
```

#### b. Test Data Factories
Create test data factories for each feature:

```typescript
// src/features/estimates/test-utils/factories.ts
export const createMockLibraryItem = (overrides = {}) => ({
  id: 'test-id',
  code: '03.10.10.01',
  name: 'Test Concrete',
  unit: 'm³',
  ...overrides
});

export const createMockFactorCalculation = (overrides = {}) => ({
  materialCost: 100,
  labourCost: 50,
  equipmentCost: 25,
  totalRate: 175,
  ...overrides
});
```

#### c. Feature Test Setup
Each feature should have its own test setup:

```typescript
// src/features/estimates/test-utils/setup.ts
export const setupEstimatesTests = () => {
  // Mock supabase client
  jest.mock('@/lib/supabase/client', () => ({
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      }))
    }
  }));
};
```

### 4. E2E Testing Strategy

#### a. Critical Path Tests
Focus on the most important user journeys:

1. **Library Item Selection Flow**
   - Open library browser
   - Search and filter items
   - Select multiple items
   - View factor preview
   - Confirm selection

2. **Hierarchy Creation Flow**
   - Items create proper division/section/assembly structure
   - Intelligent grouping works correctly
   - Costs calculate properly

3. **Schedule Tab Updates**
   - BQ changes trigger schedule recalculation
   - Material aggregation works correctly
   - Export functionality works

#### b. Test Organization
```
e2e/
├── features/
│   ├── estimates/
│   │   ├── library-integration.spec.ts
│   │   ├── schedule-tabs.spec.ts
│   │   └── factor-calculation.spec.ts
│   └── shared/
│       └── test-helpers.ts
```

### 5. Performance Testing

#### a. Component Performance
```typescript
// Test large dataset handling
it('should handle 1000+ library items efficiently', async () => {
  const manyItems = Array.from({ length: 1000 }, (_, i) => 
    createMockLibraryItem({ id: `item-${i}` })
  );
  
  const { result } = renderHook(() => useLibraryIntegration('project-1'));
  
  const startTime = performance.now();
  await result.current.createEstimateFromLibraryItems(manyItems, 'struct-1', 'elem-1');
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
});
```

#### b. Database Query Performance
Monitor and test critical queries:
- Material/Labour/Equipment schedule aggregation
- Hierarchical data fetching
- Factor calculations

### 6. Test Coverage Goals

#### Minimum Coverage Targets
- **Services**: 90% coverage (critical business logic)
- **Hooks**: 85% coverage (state management)
- **Components**: 80% coverage (UI interactions)
- **Utils**: 95% coverage (pure functions)

#### Coverage Reports
```json
// package.json
{
  "scripts": {
    "test:coverage": "jest --coverage --coverageDirectory=coverage",
    "test:coverage:feature": "jest --coverage --collectCoverageFrom='src/features/estimates/**/*.{ts,tsx}'"
  }
}
```

### 7. Continuous Integration

#### CI Pipeline Tests
```yaml
# .github/workflows/test.yml
name: Test Library-Estimate Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit -- src/features/estimates
        
      - name: Run integration tests
        run: npm run test:integration -- src/features/estimates
        
      - name: Check test coverage
        run: npm run test:coverage:feature
        
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

### 8. Testing Checklist

Before deployment, ensure:

- [ ] All unit tests passing
- [ ] Integration tests cover critical paths
- [ ] Performance tests meet benchmarks
- [ ] Test coverage meets minimums
- [ ] No console errors in component tests
- [ ] Mock data matches real data structure
- [ ] Error scenarios are tested
- [ ] Loading states are tested
- [ ] Empty states are tested
- [ ] Edge cases are covered

This comprehensive testing strategy ensures the library-to-estimate integration is robust, performant, and maintainable within the feature-based architecture.