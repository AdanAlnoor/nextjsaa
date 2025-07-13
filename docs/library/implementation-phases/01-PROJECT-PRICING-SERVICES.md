# Phase 1: Project-Specific Pricing Services

## Student-Friendly Overview 📚

**What We're Building:** A system where each construction project can have its own custom prices, different from the standard catalog.

**Think of it like:** A restaurant menu (catalog) vs. a catering order (project). The menu says "Pizza: $15", but for your big event downtown, that same pizza might cost $20 due to delivery and setup.

**Important Architecture Note:** 
- We now use a **library-only** system (Phase 0 completed)
- No more manual detail items!
- All items come from the library
- Dual rate system: Manual rates (user override) + Calculated rates (system computed)
- Project-specific price overrides apply to calculated rates

**Duration**: 2 days  
**Priority**: HIGH  
**Prerequisites**: 
- Phase 0 (Architecture Migration) must be completed
- Database table `project_rates` exists
- Junction table `estimate_element_items` exists (no more detail_items!)

## What Problem Does This Solve? 🤔

### The Scenario
Imagine you're a construction company with a standard price list:
- Concrete: $100 per cubic meter
- Steel: $1000 per ton
- Labor: $50 per hour

But in reality:
- **Downtown Project**: Concrete costs $150 (parking fees, traffic delays)
- **Rural Project**: Concrete costs $120 (long transport distance)
- **Government Project**: Labor costs $65 (prevailing wage requirements)

Without this system, estimators manually adjust every price. With this system, prices automatically adjust based on the project.

## How Will We Know It Works? ✅

### Test Scenario 1: Setting Project Prices
```typescript
// What you'll do:
1. Open Project A (Downtown Tower)
2. Go to "Project Rates" tab
3. Set custom price for concrete: $150
4. Save

// How to verify:
- Check database: SELECT * FROM project_rates WHERE project_id = 'project_a'
- Should see: { materials: { "CONC-C25": 150.00 } }
- Original catalog still shows $100 (unchanged)
```

### Test Scenario 2: Prices Change Over Time
```typescript
// What you'll do:
1. Set concrete = $100 on January 1st
2. Set concrete = $120 on March 1st (supplier increase)
3. Create estimate on March 15th

// How to verify:
- System automatically uses $120 (most recent price before March 15)
- January estimates still show they used $100
- History tab shows both price changes
```

### Test Scenario 3: Copy Prices Between Projects
```typescript
// What you'll do:
1. Finish "Office Building A" with 200+ custom prices
2. Start "Office Building B" (similar project)
3. Click "Import Rates" → Select "Office Building A"
4. All 200+ prices copied in one click

// How to verify:
- Project B now has same rates as Project A
- Can modify individual prices without affecting Project A
- Saved hours of manual entry
```

## Business Requirements

### 1. Projects Need Custom Rates That Differ From Standard Catalog Prices

**The Vibe:** Your catalog is like a menu, but each project is a special order 🍔

**Real Example:**
```typescript
// Standard catalog rate (stored in library_catalogues_materials)
const catalogRate = {
  item_code: "CONC-C25",
  description: "Concrete C25/30",
  unit: "m³",
  rate: 100.00  // Standard price
};

// Project-specific override (stored in project_rates table)
const downtownProject = {
  project_id: "proj_downtown_tower",
  materials: {
    "CONC-C25": 150.00  // Premium due to city center delivery
  }
};

const ruralProject = {
  project_id: "proj_rural_warehouse",
  materials: {
    "CONC-C25": 120.00  // Higher transport costs
  }
};
```

**Supabase Magic:**
```sql
-- The project_rates table uses JSONB columns for flexibility
CREATE TABLE project_rates (
  id UUID DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  materials JSONB DEFAULT '{}',  -- {"CONC-C25": 150.00, "STEEL-REBAR": 1200.00}
  labour JSONB DEFAULT '{}',
  equipment JSONB DEFAULT '{}'
);
```

### 2. Rates Should Have Effective Dates for Historical Tracking

**The Vibe:** Time travel for your prices - see what things cost last month 📅

**Real Example:**
```typescript
// Price changes over time for "Downtown Tower" project
const priceHistory = [
  {
    effective_date: "2024-01-01",
    materials: { "STEEL-REBAR": 1000.00 }
  },
  {
    effective_date: "2024-03-01", 
    materials: { "STEEL-REBAR": 1200.00 }  // 20% increase!
  },
  {
    effective_date: "2024-06-01",
    materials: { "STEEL-REBAR": 1150.00 }  // Slight decrease
  }
];

// Query rates at specific date
const marchEstimate = await supabase
  .from('project_rates')
  .select('*')
  .eq('project_id', 'proj_downtown_tower')
  .lte('effective_date', '2024-03-15')
  .order('effective_date', { ascending: false })
  .limit(1)
  .single();
// Returns: STEEL-REBAR = $1200 (March 1st rate applies)
```

### 3. Support Bulk Import of Rates From Other Projects

**The Vibe:** Copy homework but make it professional 📋

**Real Example:**
```typescript
// You just finished "Office Complex A" and starting "Office Complex B"
const importRates = async () => {
  // Source: Office Complex A (similar scope, same area)
  const sourceProject = await projectRatesService.getCurrentRates('proj_office_a');
  
  // Target: Office Complex B (new project)
  await projectRatesService.importRatesFromProject({
    sourceProjectId: 'proj_office_a',
    targetProjectId: 'proj_office_b',
    categories: ['materials', 'labour'],  // Skip equipment, we'll rent different ones
    effectiveDate: new Date()
  });
  
  // Boom! 200+ material rates copied in one click
};
```

**Supabase RPC for Efficiency:**
```sql
-- Edge function for bulk copying
CREATE OR REPLACE FUNCTION copy_project_rates(
  source_id UUID,
  target_id UUID,
  categories TEXT[]
) RETURNS void AS $$
BEGIN
  INSERT INTO project_rates (project_id, materials, labour, equipment)
  SELECT 
    target_id,
    CASE WHEN 'materials' = ANY(categories) THEN materials ELSE '{}'::JSONB END,
    CASE WHEN 'labour' = ANY(categories) THEN labour ELSE '{}'::JSONB END,
    CASE WHEN 'equipment' = ANY(categories) THEN equipment ELSE '{}'::JSONB END
  FROM project_rates
  WHERE project_id = source_id
  ORDER BY effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### 4. Maintain Audit Trail of Rate Changes

**The Vibe:** Every price change has receipts - CYA mode activated 🧾

**Real Example:**
```typescript
// Automatic audit logging with Supabase
const rateChange = {
  // Before (from audit log)
  previous: {
    user: "sarah@construction.com",
    timestamp: "2024-05-15T14:30:00Z",
    action: "UPDATE",
    old_value: { "CONC-C25": 100.00 },
    new_value: { "CONC-C25": 120.00 },
    reason: "Supplier price increase"
  },
  
  // Current change
  current: {
    user: "mike@construction.com", 
    timestamp: "2024-05-20T09:15:00Z",
    action: "UPDATE",
    old_value: { "CONC-C25": 120.00 },
    new_value: { "CONC-C25": 115.00 },
    reason: "Negotiated bulk discount"
  }
};

// Supabase automatically logs via RLS and triggers
const updateWithAudit = await supabase
  .from('project_rates')
  .update({ 
    materials: { ...currentRates.materials, "CONC-C25": 115.00 }
  })
  .eq('project_id', projectId)
  .select(); // Trigger captures the change
```

**Supabase Audit Trigger:**
```sql
-- Automatic audit trail
CREATE TRIGGER project_rates_audit
AFTER UPDATE ON project_rates
FOR EACH ROW
EXECUTE FUNCTION audit.log_changes();
```

### 5. Integrate Seamlessly With Factor Calculations

**The Vibe:** It just works™ - like autocorrect for construction costs 🎯

**Real Example:**
```typescript
// NEW ARCHITECTURE: When adding a library item to an element
const calculateItemCost = async (libraryItem: LibraryItem, elementId: string, projectId: string) => {
  // 1. Get item's factors from library (stored in catalog tables)
  const factors = await getLibraryItemFactors(libraryItem.id);
  // Example: { material: 105.00, labour: 25.00, equipment: 5.00 }
  
  // 2. System automatically fetches project-specific rates
  const projectRates = await projectRatesService.getCurrentRates(projectId);
  
  // 3. Apply project rate overrides (if any)
  const finalRates = {
    material: projectRates.materials[libraryItem.code] || factors.material,
    labour: projectRates.labour[libraryItem.code] || factors.labour,
    equipment: projectRates.equipment[libraryItem.code] || factors.equipment
  };
  
  // 4. Apply adjustments (VAT, overheads, profit)
  const adjustments = await getProjectAdjustments(projectId);
  const calculatedRate = 
    (finalRates.material * (1 + adjustments.material_overhead)) +
    (finalRates.labour * (1 + adjustments.labour_overhead)) +
    (finalRates.equipment * (1 + adjustments.equipment_overhead));
  
  const totalWithProfit = calculatedRate * (1 + adjustments.profit_margin);
  const totalWithVAT = totalWithProfit * (1 + adjustments.vat_rate);
  
  // 5. Link to element with BOTH rate columns
  await linkLibraryItemToElement({
    element_id: elementId,
    library_item_id: libraryItem.id,
    quantity: quantity,
    rate_manual: null,              // User can override later
    rate_calculated: totalWithVAT,  // System calculated with all adjustments
    rate_override: projectRates.override?.[libraryItem.code] || null
  });
  
  return {
    base: finalRates,
    adjustments,
    calculated: totalWithVAT,
    breakdown: {
      material: finalRates.material,
      labour: finalRates.labour,
      equipment: finalRates.equipment,
      overheads: calculatedRate - (finalRates.material + finalRates.labour + finalRates.equipment),
      profit: totalWithProfit - calculatedRate,
      vat: totalWithVAT - totalWithProfit
    }
  };
};

// NEW: Supabase View for Library-Based Architecture with Dual Rates
CREATE VIEW element_items_with_rates AS
SELECT 
  eei.*,
  li.code as library_code,
  li.name as item_name,
  li.unit,
  -- Manual rate (user override)
  eei.rate_manual,
  -- Calculated rate with all adjustments
  eei.rate_calculated,
  -- Effective rate (manual takes precedence)
  COALESCE(eei.rate_manual, eei.rate_calculated) as rate_effective,
  -- Amounts
  (eei.quantity * COALESCE(eei.rate_manual, 0)) as amount_manual,
  (eei.quantity * COALESCE(eei.rate_calculated, 0)) as amount_calculated,
  (eei.quantity * COALESCE(eei.rate_manual, eei.rate_calculated, 0)) as amount_effective,
  -- Rate breakdown (for calculated rate tooltip)
  json_build_object(
    'material', COALESCE(pr.materials->li.code, lm.rate),
    'labour', COALESCE(pr.labour->li.code, ll.rate),
    'equipment', COALESCE(pr.equipment->li.code, le.rate),
    'has_project_override', pr.materials ? li.code
  ) as rate_breakdown
FROM estimate_element_items eei
JOIN library_items li ON eei.library_item_id = li.id
JOIN estimate_elements ee ON eei.element_id = ee.id
JOIN estimate_structures es ON ee.structure_id = es.id
LEFT JOIN project_rates pr ON pr.project_id = es.project_id
LEFT JOIN library_catalogues_materials lm ON lm.item_id = li.id
LEFT JOIN library_catalogues_labour ll ON ll.item_id = li.id
LEFT JOIN library_catalogues_equipment le ON le.item_id = li.id
WHERE pr.effective_date <= CURRENT_DATE OR pr.effective_date IS NULL;
```

**Why This Matters:**
- Estimators don't need to remember project-specific rates
- Calculations always use the correct rates for the date
- Changes to rates don't break existing estimates
- Historical estimates show what rates were used at that time

## What Gets Built - Component by Component 🔨

### 1. The Database Storage
**What:** A place to store custom prices for each project
**How it works:** Like a filing cabinet with folders for each project
```sql
project_rates table:
- Drawer 1 (Downtown Tower): Concrete=$150, Steel=$1200
- Drawer 2 (Rural Warehouse): Concrete=$120, Steel=$1000
- Drawer 3 (School Project): Uses standard catalog prices
```

### 2. The Price Manager Service (Brain)
**What:** The smart code that handles all price operations
**What it does:**
- Saves new prices
- Finds the right price for the right date
- Copies prices between projects
- Tracks who changed what and when

### 3. The User Interface (What You See)
**What:** The screens where users manage prices

#### Main Screen - Project Rates Manager
```
Project: Downtown Tower
Effective Date: March 1, 2024

[Materials Tab] [Labor Tab] [Equipment Tab]

Materials:
┌─────────────┬──────────────────┬────────┬─────────┐
│ Item Code   │ Description      │ Rate   │ Actions │
├─────────────┼──────────────────┼────────┼─────────┤
│ CONC-C25    │ Concrete C25/30  │ $150   │ [Edit]  │
│ STEEL-REBAR │ Steel Rebar 12mm │ $1200  │ [Edit]  │
└─────────────┴──────────────────┴────────┴─────────┘

[Import Rates] [View History] [Edit Mode]
```

#### Import Dialog
```
Import Rates From Another Project

Source Project: [Dropdown: Office Building A ▼]
Categories:     ☑ Materials  ☑ Labor  ☐ Equipment

[Cancel] [Import]
```

### 4. The Integration Points
**What:** How this connects to the rest of the system
- When creating estimates → uses project prices automatically
- When viewing old estimates → shows historical prices
- When running reports → includes price variance analysis

## Step-by-Step: What Happens When You Use It 📝

### Scenario: Setting a Custom Price
```
1. You click "Edit" next to Concrete
2. Type new price: $150
3. Click "Save"

Behind the scenes:
→ UI sends: "Update CONC-C25 to $150 for Project A"
→ Service validates: Is $150 a valid number? Yes ✓
→ Database saves: project_rates.materials["CONC-C25"] = 150
→ Audit logs: "User Sarah changed CONC-C25 from $100 to $150"
→ UI updates: Shows new price immediately
```

### Scenario: Adding Library Item to Estimate (New Architecture)
```
1. You search library for "Concrete C25/30"
2. Select item (code: 03.10.20.01) from library
3. Add to element "Footings" with quantity: 10m³

Behind the scenes:
→ Fetch library item: "03.10.20.01 - Concrete C25/30"
→ Get catalog rates: Material=$100, Labour=$10, Equipment=$5
→ Check project overrides: Material=$150 (downtown premium)
→ Calculate total: 10m³ × ($150 + $10 + $5) = $1,650
→ Create link in estimate_element_items table
→ Display: Shows $1,650 with library code 03.10.20.01
```

## How to Test Everything Works 🧪

### Developer Testing Checklist
```typescript
// 1. Test Rate Storage
const testRateStorage = async () => {
  // Set a rate
  await projectRatesService.setRate('project-1', 'CONC-C25', 150);
  
  // Verify it saved
  const rate = await projectRatesService.getRate('project-1', 'CONC-C25');
  console.assert(rate === 150, "Rate should be 150");
};

// 2. Test Historical Rates
const testHistoricalRates = async () => {
  // Set rate for January
  await projectRatesService.setRate('project-1', 'STEEL', 1000, '2024-01-01');
  
  // Set rate for March
  await projectRatesService.setRate('project-1', 'STEEL', 1200, '2024-03-01');
  
  // Get rate for February (should use January rate)
  const febRate = await projectRatesService.getRateAtDate('project-1', 'STEEL', '2024-02-15');
  console.assert(febRate === 1000, "February should use January rate");
  
  // Get rate for April (should use March rate)
  const aprRate = await projectRatesService.getRateAtDate('project-1', 'STEEL', '2024-04-15');
  console.assert(aprRate === 1200, "April should use March rate");
};
```

### User Testing Script
```
1. Create New Project
   □ Go to Projects → New Project
   □ Name it "Test Tower"
   □ Save

2. Set Custom Rates
   □ Go to Project Settings → Rates
   □ Set Concrete (CONC-C25) = $175
   □ Set Steel (STEEL-REBAR) = $1300
   □ Save changes

3. Verify in Estimate
   □ Create new estimate
   □ Add item that uses concrete
   □ Verify it calculates using $175 (not catalog $100)

4. Test Import Feature
   □ Create another project "Test Tower 2"
   □ Go to Rates → Import
   □ Select "Test Tower" as source
   □ Import → Verify rates copied correctly

5. Test History
   □ Change concrete to $180
   □ View History
   □ Should see both changes ($175 and $180)
```

## Common Issues and Solutions 🔧

### Issue: "Rates not showing in estimate"
**Check:**
1. Is there a rate set for this project?
2. Is the effective date before today?
3. Is the item code spelled exactly right?

**Fix:**
```sql
-- Debug query
SELECT * FROM project_rates 
WHERE project_id = 'your-project-id'
ORDER BY effective_date DESC;
```

### Issue: "Import not working"
**Check:**
1. Does source project have rates?
2. Do you have permission to both projects?
3. Are you selecting at least one category?

### Issue: "Wrong rate being used"
**Check:**
1. What's the estimate date?
2. What rates were effective on that date?
3. Is there a more recent rate overriding?

## Success Metrics 📊

You'll know Phase 1 is successful when:
1. **Accuracy**: Estimates use correct project-specific rates 100% of the time
2. **Speed**: Setting rates for a new project takes <5 minutes (vs 1+ hour manually)
3. **History**: Can see what rates were used 6 months ago
4. **Reuse**: Can copy rates between similar projects in <30 seconds
5. **Audit**: Every rate change is logged with who/when/why

## Technical Implementation

### Step 1: Create Type Definitions

**File**: `src/features/library/types/rates.ts`

```typescript
export interface ProjectRates {
  projectId: string;
  materials: Record<string, number>;
  labour: Record<string, number>;
  equipment: Record<string, number>;
  effectiveDate: Date;
  expiryDate?: Date;
}

export interface RateOverride {
  itemId: string;
  category: 'materials' | 'labour' | 'equipment';
  rate: number;
  previousRate?: number;
}

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
  createdBy: string;
}

export interface RateImportOptions {
  sourceProjectId: string;
  targetProjectId: string;
  categories?: Array<'materials' | 'labour' | 'equipment'>;
  effectiveDate?: Date;
}
```

### Step 2: Create ProjectRatesService

**File**: `src/features/library/services/projectRatesService.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';
import { ProjectRates, RateOverride, RateHistory, RateImportOptions } from '../types/rates';

export class ProjectRatesService {
  private static instance: ProjectRatesService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): ProjectRatesService {
    if (!this.instance) {
      this.instance = new ProjectRatesService();
    }
    return this.instance;
  }

  /**
   * Get current rates for a project
   */
  async getCurrentRates(projectId: string): Promise<ProjectRates> {
    const { data, error } = await this.supabase
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .lte('effective_date', new Date().toISOString())
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Return empty rates if none exist
      return {
        projectId,
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: new Date()
      };
    }

    return {
      projectId: data.project_id,
      materials: data.materials || {},
      labour: data.labour || {},
      equipment: data.equipment || {},
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined
    };
  }

  /**
   * Set rates for a project
   */
  async setProjectRates(
    projectId: string,
    rates: Partial<ProjectRates>
  ): Promise<ProjectRates> {
    const { data, error } = await this.supabase
      .from('project_rates')
      .insert({
        project_id: projectId,
        materials: rates.materials || {},
        labour: rates.labour || {},
        equipment: rates.equipment || {},
        effective_date: rates.effectiveDate || new Date(),
        expiry_date: rates.expiryDate
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToProjectRates(data);
  }

  /**
   * Update specific rate overrides
   */
  async updateRateOverride(
    projectId: string,
    category: 'materials' | 'labour' | 'equipment',
    itemId: string,
    rate: number
  ): Promise<void> {
    const currentRates = await this.getCurrentRates(projectId);
    
    const updatedRates = {
      ...currentRates,
      [category]: {
        ...currentRates[category],
        [itemId]: rate
      }
    };

    await this.setProjectRates(projectId, updatedRates);
  }

  /**
   * Get rate history for a project
   */
  async getRateHistory(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RateHistory[]> {
    let query = this.supabase
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .order('effective_date', { ascending: false });

    if (startDate) {
      query = query.gte('effective_date', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('effective_date', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(this.mapToRateHistory);
  }

  /**
   * Bulk import rates from another project
   */
  async importRatesFromProject(
    options: RateImportOptions
  ): Promise<ProjectRates> {
    const sourceRates = await this.getCurrentRates(options.sourceProjectId);
    const categories = options.categories || ['materials', 'labour', 'equipment'];
    
    const importedRates: Partial<ProjectRates> = {
      effectiveDate: options.effectiveDate || new Date()
    };

    // Only import specified categories
    if (categories.includes('materials')) {
      importedRates.materials = sourceRates.materials;
    }
    if (categories.includes('labour')) {
      importedRates.labour = sourceRates.labour;
    }
    if (categories.includes('equipment')) {
      importedRates.equipment = sourceRates.equipment;
    }

    return await this.setProjectRates(options.targetProjectId, importedRates);
  }

  /**
   * Delete rates for a specific date
   */
  async deleteRates(projectId: string, effectiveDate: Date): Promise<void> {
    const { error } = await this.supabase
      .from('project_rates')
      .delete()
      .eq('project_id', projectId)
      .eq('effective_date', effectiveDate.toISOString());

    if (error) throw error;
  }

  /**
   * Get rate for a specific item
   */
  async getItemRate(
    projectId: string,
    category: 'materials' | 'labour' | 'equipment',
    itemId: string
  ): Promise<number | null> {
    const rates = await this.getCurrentRates(projectId);
    return rates[category][itemId] || null;
  }

  /**
   * Batch update rates
   */
  async batchUpdateRates(
    projectId: string,
    updates: RateOverride[]
  ): Promise<ProjectRates> {
    const currentRates = await this.getCurrentRates(projectId);
    const updatedRates = { ...currentRates };

    for (const update of updates) {
      updatedRates[update.category] = {
        ...updatedRates[update.category],
        [update.itemId]: update.rate
      };
    }

    return await this.setProjectRates(projectId, updatedRates);
  }

  private mapToProjectRates(data: any): ProjectRates {
    return {
      projectId: data.project_id,
      materials: data.materials || {},
      labour: data.labour || {},
      equipment: data.equipment || {},
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined
    };
  }

  private mapToRateHistory(data: any): RateHistory {
    return {
      id: data.id,
      projectId: data.project_id,
      rates: {
        materials: data.materials || {},
        labour: data.labour || {},
        equipment: data.equipment || {}
      },
      effectiveDate: new Date(data.effective_date),
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by
    };
  }
}
```

### Step 3: Update FactorCalculatorService Integration

**File**: `src/features/estimates/services/factorCalculatorService.ts`

Add the following import and update the `getProjectRates` method:

```typescript
import { ProjectRatesService } from '@/features/library/services/projectRatesService';

// Replace the existing getProjectRates method with:
private async getProjectRates(projectId: string): Promise<ProjectRates> {
  const projectRatesService = ProjectRatesService.getInstance();
  return await projectRatesService.getCurrentRates(projectId);
}
```

### Step 4: Create UI Components

#### 4.1 Project Rates Manager Component

**File**: `src/features/library/components/rates/ProjectRatesManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ProjectRatesService } from '../../services/projectRatesService';
import { ProjectRates } from '../../types/rates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/use-toast';
import { RatesList } from './RatesList';
import { RateHistoryDialog } from './RateHistoryDialog';
import { ImportRatesDialog } from './ImportRatesDialog';
import { Calendar, Upload, History } from 'lucide-react';

interface ProjectRatesManagerProps {
  projectId: string;
  onRatesUpdate?: () => void;
}

export const ProjectRatesManager: React.FC<ProjectRatesManagerProps> = ({ 
  projectId,
  onRatesUpdate 
}) => {
  const [rates, setRates] = useState<ProjectRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const projectRatesService = ProjectRatesService.getInstance();

  useEffect(() => {
    loadRates();
  }, [projectId]);

  const loadRates = async () => {
    try {
      setLoading(true);
      const currentRates = await projectRatesService.getCurrentRates(projectId);
      setRates(currentRates);
    } catch (error) {
      console.error('Failed to load rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project rates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRateUpdate = async (
    category: 'materials' | 'labour' | 'equipment',
    itemId: string,
    newRate: number
  ) => {
    try {
      await projectRatesService.updateRateOverride(
        projectId, 
        category, 
        itemId, 
        newRate
      );
      
      toast({
        title: 'Success',
        description: 'Rate updated successfully'
      });
      
      await loadRates();
      onRatesUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rate',
        variant: 'destructive'
      });
    }
  };

  const handleImport = async (sourceProjectId: string) => {
    try {
      await projectRatesService.importRatesFromProject({
        sourceProjectId,
        targetProjectId: projectId
      });
      
      toast({
        title: 'Success',
        description: 'Rates imported successfully'
      });
      
      await loadRates();
      onRatesUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import rates',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading rates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Project Rates</h3>
          {rates?.effectiveDate && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Effective from: {new Date(rates.effectiveDate).toLocaleDateString()}
            </p>
          )}
        </div>
        
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(true)}
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImport(true)}
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          
          <Button
            onClick={() => setEditMode(!editMode)}
            variant={editMode ? 'secondary' : 'default'}
            size="sm"
          >
            {editMode ? 'View Mode' : 'Edit Rates'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="materials">
            Materials ({Object.keys(rates?.materials || {}).length})
          </TabsTrigger>
          <TabsTrigger value="labour">
            Labour ({Object.keys(rates?.labour || {}).length})
          </TabsTrigger>
          <TabsTrigger value="equipment">
            Equipment ({Object.keys(rates?.equipment || {}).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <RatesList
            rates={rates?.materials || {}}
            category="materials"
            editMode={editMode}
            onUpdate={handleRateUpdate}
          />
        </TabsContent>

        <TabsContent value="labour">
          <RatesList
            rates={rates?.labour || {}}
            category="labour"
            editMode={editMode}
            onUpdate={handleRateUpdate}
          />
        </TabsContent>

        <TabsContent value="equipment">
          <RatesList
            rates={rates?.equipment || {}}
            category="equipment"
            editMode={editMode}
            onUpdate={handleRateUpdate}
          />
        </TabsContent>
      </Tabs>

      <RateHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        projectId={projectId}
      />

      <ImportRatesDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={handleImport}
        currentProjectId={projectId}
      />
    </div>
  );
};
```

#### 4.2 Rates List Component

**File**: `src/features/library/components/rates/RatesList.tsx`

```typescript
import React, { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Search, Save, X } from 'lucide-react';

interface RatesListProps {
  rates: Record<string, number>;
  category: 'materials' | 'labour' | 'equipment';
  editMode: boolean;
  onUpdate: (category: string, itemId: string, rate: number) => Promise<void>;
}

export const RatesList: React.FC<RatesListProps> = ({
  rates,
  category,
  editMode,
  onUpdate
}) => {
  const [search, setSearch] = useState('');
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());

  const filteredRates = Object.entries(rates).filter(([itemId]) =>
    itemId.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (itemId: string, value: string) => {
    setEditingRates(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = async (itemId: string) => {
    const newRate = parseFloat(editingRates[itemId]);
    if (isNaN(newRate) || newRate < 0) return;

    setSavingItems(prev => new Set(prev).add(itemId));
    try {
      await onUpdate(category, itemId, newRate);
      setEditingRates(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    } finally {
      setSavingItems(prev => {
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
    }
  };

  const handleCancel = (itemId: string) => {
    setEditingRates(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const getCategoryInfo = () => {
    switch (category) {
      case 'materials':
        return { label: 'Material', color: 'blue' };
      case 'labour':
        return { label: 'Labour', color: 'green' };
      case 'equipment':
        return { label: 'Equipment', color: 'orange' };
    }
  };

  const { label, color } = getCategoryInfo();

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={`Search ${label.toLowerCase()} codes...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredRates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {search ? `No ${label.toLowerCase()} rates found matching "${search}"` : `No ${label.toLowerCase()} rates defined`}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              {editMode && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRates.map(([itemId, rate]) => {
              const isEditing = itemId in editingRates;
              const isSaving = savingItems.has(itemId);

              return (
                <TableRow key={itemId}>
                  <TableCell className="font-medium">{itemId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-${color}-600`}>
                      {label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editingRates[itemId]}
                        onChange={(e) => handleEdit(itemId, e.target.value)}
                        className="w-24 ml-auto"
                        disabled={isSaving}
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono">
                        ${rate.toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  {editMode && (
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(itemId)}
                            disabled={isSaving}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(itemId)}
                            disabled={isSaving}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(itemId, rate.toString())}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
```

### Step 5: Create Supporting Dialogs

#### 5.1 Rate History Dialog

**File**: `src/features/library/components/rates/RateHistoryDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ProjectRatesService } from '../../services/projectRatesService';
import { RateHistory } from '../../types/rates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { format } from 'date-fns';

interface RateHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export const RateHistoryDialog: React.FC<RateHistoryDialogProps> = ({
  open,
  onOpenChange,
  projectId
}) => {
  const [history, setHistory] = useState<RateHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, projectId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const service = ProjectRatesService.getInstance();
      const data = await service.getRateHistory(projectId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load rate history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate History</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No rate history available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Labour</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Created By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(record.effectiveDate, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {record.expiryDate 
                      ? format(record.expiryDate, 'MMM dd, yyyy')
                      : 'Current'
                    }
                  </TableCell>
                  <TableCell>
                    {Object.keys(record.rates.materials).length} items
                  </TableCell>
                  <TableCell>
                    {Object.keys(record.rates.labour).length} items
                  </TableCell>
                  <TableCell>
                    {Object.keys(record.rates.equipment).length} items
                  </TableCell>
                  <TableCell>
                    {format(record.createdAt, 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

#### 5.2 Import Rates Dialog

**File**: `src/features/library/components/rates/ImportRatesDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { createClient } from '@/shared/lib/supabase/client';

interface ImportRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (sourceProjectId: string) => Promise<void>;
  currentProjectId: string;
}

export const ImportRatesDialog: React.FC<ImportRatesDialogProps> = ({
  open,
  onOpenChange,
  onImport,
  currentProjectId
}) => {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategories, setSelectedCategories] = useState({
    materials: true,
    labour: true,
    equipment: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .neq('id', currentProjectId)
      .order('name');

    setProjects(data || []);
  };

  const handleImport = async () => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      await onImport(selectedProject);
      onOpenChange(false);
      setSelectedProject('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Rates from Another Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-project">Source Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="source-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categories to Import</Label>
            <div className="space-y-2">
              {(['materials', 'labour', 'equipment'] as const).map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories[category]}
                    onCheckedChange={(checked) => 
                      setSelectedCategories(prev => ({
                        ...prev,
                        [category]: checked as boolean
                      }))
                    }
                  />
                  <Label htmlFor={category} className="capitalize">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedProject || loading}
          >
            {loading ? 'Importing...' : 'Import Rates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### Step 6: Add Service to Feature Exports

**File**: `src/features/library/services/index.ts`

Add the following export:

```typescript
export * from './catalogService';
export * from './projectRatesService'; // Add this line
```

### Step 7: Integration with Project Settings

Add the ProjectRatesManager to your project settings page:

**File**: `src/app/projects/[id]/settings/rates/page.tsx`

```typescript
import { ProjectRatesManager } from '@/features/library/components/rates/ProjectRatesManager';

export default function ProjectRatesPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Project Rate Management</h1>
      <ProjectRatesManager 
        projectId={params.id}
        onRatesUpdate={() => {
          // Optional: Refresh any dependent data
        }}
      />
    </div>
  );
}
```

## Testing Guidelines

### Unit Tests

Create test file: `src/features/library/services/__tests__/projectRatesService.test.ts`

```typescript
import { ProjectRatesService } from '../projectRatesService';
import { createClient } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('ProjectRatesService', () => {
  let service: ProjectRatesService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = ProjectRatesService.getInstance();
  });

  describe('getCurrentRates', () => {
    it('should return current rates for a project', async () => {
      const mockRates = {
        project_id: 'project-123',
        materials: { 'mat-1': 100 },
        labour: { 'lab-1': 50 },
        equipment: { 'eq-1': 200 },
        effective_date: new Date().toISOString()
      };

      mockSupabase.single.mockResolvedValue({ data: mockRates, error: null });

      const result = await service.getCurrentRates('project-123');

      expect(result).toEqual({
        projectId: 'project-123',
        materials: { 'mat-1': 100 },
        labour: { 'lab-1': 50 },
        equipment: { 'eq-1': 200 },
        effectiveDate: expect.any(Date)
      });
    });

    it('should return empty rates if none exist', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: 'Not found' });

      const result = await service.getCurrentRates('project-123');

      expect(result).toEqual({
        projectId: 'project-123',
        materials: {},
        labour: {},
        equipment: {},
        effectiveDate: expect.any(Date)
      });
    });
  });

  // Add more test cases...
});
```

### Manual Testing Checklist

1. **Rate Creation**
   - [ ] Can create new rates for a project
   - [ ] Rates are saved with correct effective date
   - [ ] Empty projects start with no rates

2. **Rate Updates**
   - [ ] Can edit individual rates in edit mode
   - [ ] Changes are persisted correctly
   - [ ] UI updates reflect saved changes

3. **Rate History**
   - [ ] History shows all rate changes
   - [ ] Dates are displayed correctly
   - [ ] Can view historical rate sets

4. **Import Functionality**
   - [ ] Can select source project
   - [ ] Import copies rates correctly
   - [ ] Can select specific categories to import

5. **Integration**
   - [ ] Factor calculations use project rates
   - [ ] Rate changes affect new calculations
   - [ ] Existing calculations are not affected

## Database Verification

Run these queries to verify the implementation:

```sql
-- Check if project_rates table exists
SELECT * FROM project_rates WHERE project_id = 'your-project-id';

-- Verify rate structure
SELECT 
  project_id,
  jsonb_object_keys(materials) as material_items,
  jsonb_object_keys(labour) as labour_items,
  jsonb_object_keys(equipment) as equipment_items
FROM project_rates
WHERE project_id = 'your-project-id';

-- Check rate history
SELECT * FROM project_rates 
WHERE project_id = 'your-project-id'
ORDER BY effective_date DESC;
```

## Deployment Checklist

1. **Pre-deployment**
   - [ ] All tests passing
   - [ ] Code review completed
   - [ ] Database migrations verified

2. **Deployment**
   - [ ] Deploy service code
   - [ ] Deploy UI components
   - [ ] Update feature exports

3. **Post-deployment**
   - [ ] Verify rates load correctly
   - [ ] Test rate updates
   - [ ] Monitor for errors

## Next Steps

After completing this phase:

1. Proceed to [Phase 2: Library Management Service](./02-LIBRARY-MANAGEMENT-SERVICE.md)
2. Update factor calculations to use project rates
3. Add rate management to project onboarding flow
4. Create user documentation for rate management

## Common Issues & Solutions

### Issue 1: Rates not loading
**Solution**: Check if project_rates table has proper RLS policies

### Issue 2: Import fails
**Solution**: Verify user has access to both source and target projects

### Issue 3: Rate updates not reflecting
**Solution**: Ensure factor calculator is using latest rates

---

*Phase 1 Complete: Project-specific pricing is now fully implemented*