# Phase 2: Library Management Service

## Student-Friendly Overview 📚

**What We're Building:** A complete system to create, edit, and manage construction items in your library - like a content management system but for construction materials and labor.

**Think of it like:** Google Docs for construction items. You can:
- Create drafts (work in progress)
- Get them reviewed and approved
- Track every change (version history)
- Restore old versions if needed
- Work on multiple items at once

**Duration**: 2 days  
**Priority**: HIGH  
**Prerequisites**: 
- Phase 0 (Architecture Migration) completed
- Library database tables exist
- No more detail_items - everything is library-based now!

## What Problem Does This Solve? 🤔

### The Current Mess
Without this system:
- **Sarah** creates "Concrete Mix A" in Excel
- **John** creates "Concrete Mix B" (same thing, different name)
- **Mike** edits Sarah's mix but doesn't tell anyone
- **Lisa** uses old version from last month
- **Boss** asks "Why do we have 5 different concrete mixes?"

### The Solution
With this system:
- One central library everyone uses
- Clear workflow: Draft → Review → Approved
- See who changed what and when
- No duplicates, no confusion
- Undo button if mistakes happen

## How Will We Know It Works? ✅

### Test Scenario 1: Creating a New Item
```typescript
// What you'll do:
1. Click "New Library Item"
2. Fill in:
   - Code: "CONC-SPECIAL-MIX"
   - Name: "Special Concrete Mix"
   - Unit: "m³"
   - Status: "Draft"
3. Save

// How to verify:
- Item appears in library with "Draft" badge
- Only you can see it (until approved)
- Can edit without affecting others
- Database shows: status = 'draft', created_by = your_id
```

### Test Scenario 2: Approval Workflow
```typescript
// What you'll do:
1. Create draft item
2. Add all required information
3. Click "Submit for Review"
4. Manager clicks "Approve"

// How to verify:
- Status changes: Draft → Confirmed
- Now visible to all users
- Cannot be deleted (only deactivated)
- History shows approval timestamp
```

### Test Scenario 3: Version Control
```typescript
// What you'll do:
1. Edit approved item (change quantity factor)
2. Save (creates Version 2)
3. Realize mistake
4. Click "History" → "Restore Version 1"

// How to verify:
- All changes saved as versions
- Can see what changed between versions
- Can restore any previous version
- Current version = Version 3 (the restore action)
```

### Test Scenario 4: Quick Add From Estimate (NEW!)
```typescript
// What you'll do:
1. In estimate, search for "Waterproof Concrete"
2. Not found! Click "Add to Library"
3. Fill quick form:
   - Name: "Waterproof Concrete Mix"
   - Division: "03 - Concrete"
   - Unit: "m³"
   - Material Rate: $180
4. Click "Add & Use"

// How to verify:
- Item created with status = 'draft'
- Auto-generated code: "03.10.20.XX"
- Immediately available in current estimate
- Appears in library with "Draft" badge
- Can be approved later by manager

## Business Requirements

### 1. Complete Lifecycle Management: Draft → Confirmed → Actual

**The Vibe:** Like Git for construction items - develop, review, deploy 🚀

**Real Example:**
```typescript
// Sarah creates a new custom concrete mix
const newItem = {
  code: "CONC-CUSTOM-01",
  name: "High-Performance Concrete Mix",
  status: "draft",  // Start here
  created_by: "sarah@construction.com"
};

// Testing phase - only Sarah's team can see it
await libraryService.createDraft(newItem);
// Item used in test estimates, factors adjusted

// After validation, promote to confirmed
await libraryService.confirmItem("CONC-CUSTOM-01");
// Now available to all estimators

// After successful project use
await libraryService.markAsActual("CONC-CUSTOM-01");
// Proven in real-world, recommended for future use
```

**Supabase RLS Magic:**
```sql
-- Row Level Security ensures draft visibility
CREATE POLICY "draft_items_visible_to_creator" ON library_items
FOR SELECT USING (
  status != 'draft' OR 
  auth.uid() = created_by OR
  auth.uid() IN (SELECT user_id FROM team_members WHERE team_id = created_by_team)
);
```

### 2. Version Control for Tracking Changes

**The Vibe:** Every edit saved like Google Docs history - never lose work 📝

**Real Example:**
```typescript
// Original pump specification
const v1 = {
  code: "PUMP-SUBMERSIBLE-01",
  factors: {
    equipment: [{ code: "PUMP-3HP", quantity: 1 }],
    labour: [{ code: "PLUMBER-L2", quantity: 2 }]
  }
};

// Client requests bigger pump
const v2 = {
  ...v1,
  factors: {
    equipment: [{ code: "PUMP-5HP", quantity: 1 }],  // Changed
    labour: [{ code: "PLUMBER-L2", quantity: 3 }]     // More hours
  },
  version_note: "Upgraded to 5HP per client spec"
};

// Oops, too expensive, revert!
await libraryService.revertToVersion("PUMP-SUBMERSIBLE-01", 1);
```

**Supabase Triggers:**
```sql
-- Auto-capture versions on update
CREATE TRIGGER capture_library_versions
BEFORE UPDATE ON library_items
FOR EACH ROW
EXECUTE FUNCTION create_version_snapshot();

-- Version storage
CREATE TABLE library_item_versions (
  id UUID DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES library_items(id),
  version_number INT,
  snapshot JSONB,  -- Complete item state
  changed_by UUID,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Bulk Operations for Efficiency

**The Vibe:** Why click 100 times when you can click once? 💪

**Real Example:**
```typescript
// Price increase from steel supplier affects 50+ items
const bulkPriceUpdate = await libraryService.bulkUpdate({
  filter: {
    assembly_id: "STEEL-STRUCTURES",
    status: "confirmed"
  },
  updates: {
    // Increase all steel material factors by 15%
    updateFactors: (item) => ({
      materials: item.materials.map(m => ({
        ...m,
        rate: m.code.includes('STEEL') ? m.rate * 1.15 : m.rate
      }))
    })
  }
});
// Result: 52 items updated in 2 seconds

// Bulk status change after review meeting
const approvedItems = [
  "CONC-MIX-01", "CONC-MIX-02", "STEEL-BEAM-01", 
  "STEEL-BEAM-02", "REBAR-12MM", "REBAR-16MM"
];
await libraryService.bulkConfirm(approvedItems, "Approved in meeting 2024-05-15");
```

**Supabase Batch Operations:**
```sql
-- Efficient bulk updates with single query
UPDATE library_items
SET 
  status = 'confirmed',
  confirmed_at = NOW(),
  confirmed_by = auth.uid()
WHERE 
  code = ANY($1::text[])  -- Array of codes
  AND status = 'draft';
```

### 4. Item Cloning for Rapid Creation

**The Vibe:** Ctrl+C, Ctrl+V for construction items 📋

**Real Example:**
```typescript
// Have "Standard Office Partition"? Need "Fire-Rated Office Partition"
const fireRatedPartition = await libraryService.cloneItem({
  sourceCode: "PART-OFFICE-STD",
  newCode: "PART-OFFICE-FR",
  modifications: {
    name: "Fire-Rated Office Partition",
    specifications: {
      ...sourceItem.specifications,
      fire_rating: "2-hour",
      material_upgrade: "Type-X Gypsum"
    },
    // Adjust factors for fire-rated materials
    materials: [
      { code: "GYPSUM-TYPE-X", quantity: 2.4 },  // Instead of standard
      { code: "STEEL-STUD-FR", quantity: 3.2 }   // Fire-rated studs
    ]
  }
});

// Clone entire assembly group for new project type
await libraryService.cloneAssembly({
  sourceAssembly: "RESIDENTIAL-STANDARD",
  targetAssembly: "RESIDENTIAL-LUXURY",
  priceMultiplier: 1.5  // Luxury finishes = 50% more
});
```

### 5. Soft Delete with Recovery Options

**The Vibe:** Recycle bin for your library - nothing lost forever 🗑️

**Real Example:**
```typescript
// Accidentally delete important item
await libraryService.softDelete("WINDOW-TRIPLE-GLAZE");
// Item hidden but not gone

// Client: "Actually, we need that triple glazing quote!"
await libraryService.restore("WINDOW-TRIPLE-GLAZE");
// Back in business

// View deleted items (admin only)
const recycleBin = await libraryService.getDeletedItems({
  deleted_after: "2024-01-01",
  deleted_by: "john@construction.com"
});

// Permanent deletion after 90 days (automated)
```

**Supabase Implementation:**
```sql
-- Soft delete with metadata
UPDATE library_items
SET 
  deleted_at = NOW(),
  deleted_by = auth.uid(),
  is_active = false
WHERE code = $1;

-- Auto-cleanup old deletions
CREATE FUNCTION cleanup_old_deletions() RETURNS void AS $$
BEGIN
  DELETE FROM library_items
  WHERE deleted_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

### 6. Validation Before Status Transitions

**The Vibe:** Quality gates - can't ship broken items 🚦

**Real Example:**
```typescript
// Try to confirm incomplete item
try {
  await libraryService.confirmItem("ELEC-OUTLET-01");
} catch (error) {
  console.log(error.validationErrors);
  // Output:
  // {
  //   missing_factors: ["No labour factors defined"],
  //   missing_specs: ["Voltage specification required"],
  //   missing_unit: ["Unit of measurement not set"]
  // }
}

// Validation rules
const validationRules = {
  draft_to_confirmed: {
    required: ['name', 'code', 'unit', 'assembly_id'],
    factors: 'At least one factor type required',
    code_format: /^[A-Z0-9-]+$/,
    custom: async (item) => {
      // Check code uniqueness
      const existing = await checkCodeExists(item.code);
      if (existing) throw new Error('Code already exists');
    }
  },
  confirmed_to_actual: {
    usage_count: 'Must be used in at least 1 estimate',
    age: 'Must be confirmed for at least 7 days',
    feedback: 'Must have positive feedback score'
  }
};
```

**Supabase Functions:**
```sql
-- Validation before status change
CREATE FUNCTION validate_item_promotion(item_id UUID, new_status TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  item_record RECORD;
BEGIN
  SELECT * INTO item_record FROM library_items WHERE id = item_id;
  
  -- Validation logic
  IF new_status = 'confirmed' THEN
    IF item_record.unit IS NULL THEN
      RAISE EXCEPTION 'Unit is required for confirmed items';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM library_item_factors WHERE item_id = item_id
    ) THEN
      RAISE EXCEPTION 'At least one factor required';
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 7. Quick Add From Estimates (NEW - Post Phase 0!)

**The Vibe:** Can't find it? Add it on the fly and keep working! 🚀

**Real Example:**
```typescript
// In estimate, user searches for "Fire-Rated Concrete"
const searchResults = await libraryService.searchItems("Fire-Rated Concrete");
// Returns: [] (not found)

// Show quick-add prompt
const quickAddItem = {
  name: "Fire-Rated Concrete 2hr",
  division_id: selectedDivision, // "03 - Concrete"
  section_id: selectedSection,   // "10 - Concrete Forming"
  assembly_id: selectedAssembly, // "20 - Concrete"
  unit: "m³",
  status: "draft",
  quick_add_context: {
    project_id: currentProject.id,
    element_id: currentElement.id,
    requested_by: currentUser.id
  }
};

// Create and immediately use
const newItem = await libraryService.quickAddFromEstimate(quickAddItem);
await estimateService.addLibraryItemToElement(
  currentElement.id,
  newItem.id,
  quantity
);

// Manager gets notification
await notifyManager({
  message: "New draft item needs review",
  item: newItem,
  context: "Added during Downtown Tower estimate"
});
```

**Supabase Quick Add Function:**
```sql
CREATE FUNCTION quick_add_library_item(
  item_data JSONB,
  element_id UUID
) RETURNS UUID AS $$
DECLARE
  new_item_id UUID;
BEGIN
  -- Create draft item with auto-generated code
  INSERT INTO library_items (
    name, division_id, section_id, assembly_id,
    unit, status, created_by, quick_add_metadata
  ) VALUES (
    item_data->>'name',
    (item_data->>'division_id')::UUID,
    (item_data->>'section_id')::UUID,
    (item_data->>'assembly_id')::UUID,
    item_data->>'unit',
    'draft',
    auth.uid(),
    item_data->'quick_add_context'
  ) RETURNING id INTO new_item_id;
  
  -- Auto-link to element
  INSERT INTO estimate_element_items (
    element_id, library_item_id, quantity
  ) VALUES (
    element_id, new_item_id, 1
  );
  
  RETURN new_item_id;
END;
$$ LANGUAGE plpgsql;
```

**Why This Matters:**
- No more "oops, wrong item in production"
- Clear workflow everyone understands
- Undo button for everything
- Work smarter with bulk operations
- Nothing lost, everything tracked
- Seamless estimate creation without interruptions

## What Gets Built - Component by Component 🔨

### 1. The Library Item Manager (Main Service)
**What:** The brain that manages all library operations
**Like:** A smart filing system that knows the rules

```typescript
LibraryManagementService handles:
- Creating items (with validation)
- Updating items (with version tracking)
- Status changes (with permission checks)
- Bulk operations (update 50 items at once)
- Soft delete (hide but keep for history)
```

### 2. The Status Workflow Engine
**What:** Enforces the rules for item lifecycle
**Like:** A quality control checkpoint

```
Draft Status:
- Can edit freely
- Only creator sees it
- No validation required

Confirmed Status:
- Must have all required fields
- Visible to all users
- Changes create versions

Actual Status:
- Used in real projects
- Cannot be deleted
- Highest trust level
```

### 3. The Version Control System
**What:** Tracks every change to every item
**Like:** Time machine for your data

```
Version Timeline for "CONC-C25":
├── v1: Created by Sarah (Jan 1)
├── v2: Mike added labor factor (Jan 15)
├── v3: Lisa updated quantity (Feb 1)
└── v4: John fixed typo in name (Feb 10)
        ↑ Current Version
```

### 4. The User Interface Components

#### Main Library Grid
```
Library Items                                    [+ New Item]

Search: [_____________] Status: [All ▼] Assembly: [All ▼]

┌────────────┬─────────────────┬────────┬─────────┬──────────┐
│ Code       │ Name            │ Unit   │ Status  │ Actions  │
├────────────┼─────────────────┼────────┼─────────┼──────────┤
│ CONC-C25   │ Concrete C25/30 │ m³     │ ✓ Conf. │ [≡][✎][🗑]│
│ STL-BEAM-1 │ Steel Beam IPE  │ ton    │ 📝 Draft│ [≡][✎][🗑]│
│ LAB-MASON  │ Mason Labor     │ hour   │ ⭐ Actual│ [≡][✎]   │
└────────────┴─────────────────┴────────┴─────────┴──────────┘

[Bulk Actions ▼] [Export] [Import]
```

#### Item Editor Modal
```
Edit Library Item - CONC-C25
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Basic Information:
  Code*:     [CONC-C25____]
  Name*:     [Concrete C25/30 Standard Mix_____]
  Unit*:     [m³ ▼]
  Assembly*: [Concrete Works ▼]
  
Status:      ● Draft  ○ Confirmed  ○ Actual
  
Factors:
  Materials: [+ Add Material Factor]
  Labor:     [+ Add Labor Factor]
  Equipment: [+ Add Equipment Factor]

[Cancel] [Save as Draft] [Save & Submit for Review]
```

## Step-by-Step: What Happens When You Use It 📝

### Creating a New Item Flow
```
1. User clicks "New Item"
   → System generates temporary ID
   → Opens blank form
   
2. User fills required fields
   → Real-time validation
   → Auto-save every 30 seconds
   
3. User clicks "Save as Draft"
   → Validates required fields
   → Saves with status='draft'
   → Only visible to creator
   
4. User clicks "Submit for Review"
   → Extra validation rules
   → Changes status to 'pending_review'
   → Notifies reviewers
   
5. Reviewer approves
   → Status='confirmed'
   → Visible to all users
   → Locked from deletion
```

### Bulk Update Flow
```
1. Select multiple items (checkbox)
2. Choose "Bulk Actions" → "Update Assembly"
3. Select new assembly
4. Click "Apply"

Behind the scenes:
→ Validate user has permission
→ Start database transaction
→ Update each item
→ Create version for each
→ Log bulk operation
→ Commit transaction
→ Show success: "52 items updated"
```

## How to Test Everything Works 🧪

### Developer Testing Code
```typescript
// Test 1: Lifecycle Flow
async function testLifecycle() {
  // Create draft
  const draft = await libraryService.createDraft({
    code: "TEST-ITEM-001",
    name: "Test Concrete",
    unit: "m³"
  });
  assert(draft.status === 'draft');
  
  // Try to confirm without required fields
  try {
    await libraryService.confirmItem(draft.id);
    assert(false, "Should have failed");
  } catch (error) {
    assert(error.message.includes("assembly_id required"));
  }
  
  // Add required fields and confirm
  await libraryService.update(draft.id, { assembly_id: "123" });
  const confirmed = await libraryService.confirmItem(draft.id);
  assert(confirmed.status === 'confirmed');
}

// Test 2: Version Control
async function testVersions() {
  const item = await libraryService.getItem("CONC-C25");
  
  // Make change
  await libraryService.update(item.id, { name: "Updated Name" });
  
  // Check versions
  const versions = await libraryService.getVersionHistory(item.id);
  assert(versions.length >= 2);
  assert(versions[0].name !== versions[1].name);
  
  // Restore old version
  await libraryService.restoreVersion(item.id, versions[0].id);
  const restored = await libraryService.getItem(item.id);
  assert(restored.name === versions[0].name);
}
```

### User Testing Checklist
```
□ Draft Items Testing
  1. Create new draft item
  2. Verify only you can see it
  3. Edit multiple times
  4. Delete draft (should work)

□ Approval Workflow Testing  
  1. Submit draft for review
  2. Have manager approve
  3. Verify all users can now see it
  4. Try to delete (should fail)

□ Version History Testing
  1. Edit confirmed item 3 times
  2. View history
  3. Compare versions
  4. Restore old version
  5. Verify current data matches restored version

□ Bulk Operations Testing
  1. Select 5+ items
  2. Bulk update assembly
  3. Verify all items updated
  4. Check version created for each

□ Search & Filter Testing
  1. Search by code
  2. Filter by status
  3. Filter by assembly
  4. Combine search + filters
```

## Common Issues and Solutions 🔧

### Issue: "Cannot see my draft items"
**Solution:**
```sql
-- Check if logged in as correct user
SELECT * FROM library_items 
WHERE status = 'draft' 
AND created_by = 'your-user-id';
```

### Issue: "Cannot approve item"
**Possible causes:**
1. Missing required fields
2. Don't have approval permission
3. Item not in 'draft' status

### Issue: "Lost changes after edit"
**Check:**
1. Did save complete? (check network)
2. Was there a validation error?
3. Did someone else edit simultaneously?

## Success Metrics 📊

Phase 2 is successful when:
1. **Organization**: Zero duplicate items in library
2. **Workflow**: 100% of items follow Draft→Confirmed process
3. **History**: Can trace any item's changes for past 6 months
4. **Efficiency**: Bulk updates take <1 minute for 100 items
5. **Recovery**: Can restore any accidentally changed item
6. **Adoption**: 90% of team using central library (not spreadsheets)

## Technical Implementation

### Step 1: Create Type Definitions

**File**: `src/features/library/types/library.ts`

```typescript
// Add to existing types or create new file

export type LibraryItemStatus = 'draft' | 'confirmed' | 'actual';

export interface LibraryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  assembly_id: string;
  status: LibraryItemStatus;
  version: number;
  is_active: boolean;
  keywords?: string[];
  specifications?: Record<string, any>;
  confirmed_at?: string;
  actual_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  assembly?: {
    id: string;
    code: string;
    name: string;
    section?: {
      id: string;
      code: string;
      name: string;
      division?: {
        id: string;
        code: string;
        name: string;
      };
    };
  };
}

export interface LibraryItemDraft {
  code: string;
  name: string;
  description?: string;
  unit: string;
  assembly_id: string;
  keywords?: string[];
  specifications?: Record<string, any>;
}

export interface BulkOperation {
  successful: number;
  failed: number;
  errors: string[];
}

export interface LibraryItemVersion {
  id: string;
  library_item_id: string;
  version_number: number;
  data: any;
  created_at: string;
  created_by?: string;
}

export interface LibraryItemFilter {
  query?: string;
  status?: LibraryItemStatus;
  divisionId?: string;
  sectionId?: string;
  assemblyId?: string;
  isActive?: boolean;
  hasFactors?: boolean;
}
```

### Step 2: Create LibraryManagementService

**File**: `src/features/library/services/libraryManagementService.ts`

```typescript
import { createClient } from '@/shared/lib/supabase/client';
import { 
  LibraryItem, 
  LibraryItemStatus, 
  LibraryItemDraft,
  BulkOperation,
  LibraryItemVersion,
  LibraryItemFilter
} from '../types/library';

export class LibraryManagementService {
  private static instance: LibraryManagementService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): LibraryManagementService {
    if (!this.instance) {
      this.instance = new LibraryManagementService();
    }
    return this.instance;
  }

  /**
   * Create a new library item (starts as draft)
   */
  async createLibraryItem(draft: LibraryItemDraft): Promise<LibraryItem> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase
      .from('library_items')
      .insert({
        ...draft,
        status: 'draft',
        version: 1,
        is_active: false,
        created_by: user.id
      })
      .select(this.getItemSelectQuery())
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update library item
   */
  async updateLibraryItem(
    itemId: string,
    updates: Partial<LibraryItem>
  ): Promise<LibraryItem> {
    // Create version history before update
    await this.createVersionSnapshot(itemId);

    const { data, error } = await this.supabase
      .from('library_items')
      .update({
        ...updates,
        version: this.supabase.sql`version + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select(this.getItemSelectQuery())
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete library item (soft delete)
   */
  async deleteLibraryItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('library_items')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) throw error;
  }

  /**
   * Restore deleted item
   */
  async restoreLibraryItem(itemId: string): Promise<LibraryItem> {
    const { data, error } = await this.supabase
      .from('library_items')
      .update({ 
        is_active: true,
        deleted_at: null
      })
      .eq('id', itemId)
      .select(this.getItemSelectQuery())
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Lifecycle management: Draft → Confirmed → Actual
   */
  async confirmLibraryItem(itemId: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);
    
    if (item.status !== 'draft') {
      throw new Error('Only draft items can be confirmed');
    }

    // Validate item has all required factors
    const validation = await this.validateLibraryItem(itemId);
    if (!validation.isValid) {
      throw new Error(`Item validation failed: ${validation.errors.join(', ')}`);
    }

    return await this.updateLibraryItem(itemId, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      is_active: true
    });
  }

  /**
   * Mark item as actual (in use)
   */
  async markAsActual(itemId: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);
    
    if (item.status !== 'confirmed') {
      throw new Error('Only confirmed items can be marked as actual');
    }

    return await this.updateLibraryItem(itemId, {
      status: 'actual',
      actual_at: new Date().toISOString()
    });
  }

  /**
   * Revert to draft status
   */
  async revertToDraft(itemId: string): Promise<LibraryItem> {
    return await this.updateLibraryItem(itemId, {
      status: 'draft',
      is_active: false,
      confirmed_at: null,
      actual_at: null
    });
  }

  /**
   * Bulk operations
   */
  async bulkUpdateStatus(
    itemIds: string[],
    status: LibraryItemStatus
  ): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      try {
        if (status === 'confirmed') {
          await this.confirmLibraryItem(itemId);
        } else if (status === 'actual') {
          await this.markAsActual(itemId);
        } else if (status === 'draft') {
          await this.revertToDraft(itemId);
        }
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Bulk delete
   */
  async bulkDelete(itemIds: string[]): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      try {
        await this.deleteLibraryItem(itemId);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Clone library item
   */
  async cloneLibraryItem(
    sourceItemId: string,
    newCode: string,
    newName: string
  ): Promise<LibraryItem> {
    const source = await this.getLibraryItem(sourceItemId);
    
    // Create new item
    const newItem = await this.createLibraryItem({
      code: newCode,
      name: newName,
      description: source.description,
      unit: source.unit,
      assembly_id: source.assembly_id,
      keywords: source.keywords,
      specifications: source.specifications
    });

    // Clone factors
    await this.cloneFactors(sourceItemId, newItem.id);

    return newItem;
  }

  /**
   * Batch clone items
   */
  async batchCloneItems(
    cloneRequests: Array<{
      sourceId: string;
      newCode: string;
      newName: string;
    }>
  ): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const request of cloneRequests) {
      try {
        await this.cloneLibraryItem(
          request.sourceId,
          request.newCode,
          request.newName
        );
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Clone ${request.sourceId} → ${request.newCode}: ${error.message}`
        );
      }
    }

    return results;
  }

  /**
   * Version control
   */
  async createVersionSnapshot(itemId: string): Promise<void> {
    const item = await this.getLibraryItem(itemId);
    
    const { error } = await this.supabase
      .from('library_item_versions')
      .insert({
        library_item_id: itemId,
        version_number: item.version || 1,
        data: item,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Failed to create version snapshot:', error);
  }

  /**
   * Get version history
   */
  async getVersionHistory(itemId: string): Promise<LibraryItemVersion[]> {
    const { data, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('library_item_id', itemId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Restore from version
   */
  async restoreFromVersion(itemId: string, versionId: string): Promise<LibraryItem> {
    const { data: version, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    const restoredData = version.data;
    delete restoredData.id; // Remove ID to avoid conflicts
    delete restoredData.created_at;
    delete restoredData.updated_at;

    return await this.updateLibraryItem(itemId, restoredData);
  }

  /**
   * Compare versions
   */
  async compareVersions(
    itemId: string,
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: LibraryItemVersion;
    version2: LibraryItemVersion;
    differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    const differences = this.findDifferences(version1.data, version2.data);

    return { version1, version2, differences };
  }

  /**
   * Search library items
   */
  async searchLibraryItems(
    params: LibraryItemFilter & {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ items: LibraryItem[]; total: number }> {
    let query = this.supabase
      .from('library_items')
      .select(this.getItemSelectQuery(), { count: 'exact' });

    // Apply filters
    if (params.query) {
      query = query.or(`code.ilike.%${params.query}%,name.ilike.%${params.query}%`);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.assemblyId) {
      query = query.eq('assembly_id', params.assemblyId);
    }
    if (params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }
    if (params.divisionId || params.sectionId) {
      // Need to join through assembly relationships
      query = query.filter('assembly.section.division.id', 'eq', params.divisionId);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0
    };
  }

  /**
   * Get usage statistics
   */
  async getItemStatistics(itemId: string): Promise<{
    usageCount: number;
    lastUsedAt?: Date;
    projectsUsedIn: number;
    averageQuantity: number;
  }> {
    const { data, error } = await this.supabase
      .rpc('get_library_item_statistics', { p_item_id: itemId });

    if (error) throw error;
    return data;
  }

  /**
   * Private helper methods
   */
  private getItemSelectQuery(): string {
    return `
      *,
      assembly:assemblies(
        *,
        section:sections(
          *,
          division:divisions(*)
        )
      )
    `;
  }

  private async getLibraryItem(itemId: string): Promise<LibraryItem> {
    const { data, error } = await this.supabase
      .from('library_items')
      .select(this.getItemSelectQuery())
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getVersion(versionId: string): Promise<LibraryItemVersion> {
    const { data, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data;
  }

  private async validateLibraryItem(itemId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check basic fields
    const item = await this.getLibraryItem(itemId);
    if (!item.code || item.code.trim() === '') {
      errors.push('Item code is required');
    }
    if (!item.name || item.name.trim() === '') {
      errors.push('Item name is required');
    }
    if (!item.unit || item.unit.trim() === '') {
      errors.push('Item unit is required');
    }

    // Check if item has at least one factor
    const [materialFactors, labourFactors, equipmentFactors] = await Promise.all([
      this.supabase
        .from('material_factors')
        .select('id')
        .eq('library_item_id', itemId)
        .limit(1),
      this.supabase
        .from('labor_factors')
        .select('id')
        .eq('library_item_id', itemId)
        .limit(1),
      this.supabase
        .from('equipment_factors')
        .select('id')
        .eq('library_item_id', itemId)
        .limit(1)
    ]);

    const hasFactors = 
      (materialFactors.data && materialFactors.data.length > 0) ||
      (labourFactors.data && labourFactors.data.length > 0) ||
      (equipmentFactors.data && equipmentFactors.data.length > 0);

    if (!hasFactors) {
      errors.push('Item must have at least one factor (material, labour, or equipment)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async cloneFactors(sourceItemId: string, targetItemId: string): Promise<void> {
    // Clone material factors
    const { data: materialFactors } = await this.supabase
      .from('material_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (materialFactors && materialFactors.length > 0) {
      const clonedMaterials = materialFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        created_at: undefined,
        updated_at: undefined
      }));

      await this.supabase.from('material_factors').insert(clonedMaterials);
    }

    // Similar for labour and equipment factors...
    // (Same pattern as above for labor_factors and equipment_factors)
  }

  private findDifferences(obj1: any, obj2: any): Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }> {
    const differences = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        differences.push({
          field: key,
          oldValue: obj1[key],
          newValue: obj2[key]
        });
      }
    }

    return differences;
  }
}
```

### Step 3: Create UI Components

#### 3.1 Library Item Manager Component

**File**: `src/features/library/components/management/LibraryItemManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { LibraryItem, LibraryItemStatus } from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Copy, 
  Trash, 
  CheckCircle, 
  RotateCcw,
  History,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { toast } from '@/shared/components/ui/use-toast';
import { CreateItemDialog } from './CreateItemDialog';
import { CloneItemDialog } from './CloneItemDialog';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { BulkActionBar } from './BulkActionBar';
import { FilterPanel } from './FilterPanel';

export const LibraryItemManager: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LibraryItemStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    loadItems();
  }, [searchQuery, statusFilter, currentPage]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await libraryService.searchLibraryItems({ 
        query: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: pageSize,
        offset: currentPage * pageSize
      });
      setItems(result.items);
      setTotalCount(result.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load library items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: LibraryItemStatus) => {
    try {
      if (newStatus === 'confirmed') {
        await libraryService.confirmLibraryItem(itemId);
      } else if (newStatus === 'actual') {
        await libraryService.markAsActual(itemId);
      } else if (newStatus === 'draft') {
        await libraryService.revertToDraft(itemId);
      }
      
      toast({
        title: 'Success',
        description: `Item status updated to ${newStatus}`
      });
      
      await loadItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await libraryService.deleteLibraryItem(itemId);
      toast({
        title: 'Success',
        description: 'Item deleted successfully'
      });
      await loadItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive'
      });
    }
  };

  const handleRestore = async (itemId: string) => {
    try {
      await libraryService.restoreLibraryItem(itemId);
      toast({
        title: 'Success',
        description: 'Item restored successfully'
      });
      await loadItems();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore item',
        variant: 'destructive'
      });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const getStatusBadgeVariant = (status: LibraryItemStatus) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'confirmed': return 'default';
      case 'actual': return 'success';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Library Items Management</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Item
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          onFilterChange={(filters) => {
            setStatusFilter(filters.status || 'all');
            // Handle other filters
          }}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedItems.size > 0 && (
        <BulkActionBar
          selectedCount={selectedItems.size}
          onBulkAction={async (action) => {
            const itemIds = Array.from(selectedItems);
            let result;
            
            switch (action) {
              case 'confirm':
                result = await libraryService.bulkUpdateStatus(itemIds, 'confirmed');
                break;
              case 'delete':
                result = await libraryService.bulkDelete(itemIds);
                break;
              // Handle other actions
            }

            if (result) {
              toast({
                title: 'Bulk Operation Complete',
                description: `${result.successful} successful, ${result.failed} failed`
              });
              if (result.errors.length > 0) {
                console.error('Bulk operation errors:', result.errors);
              }
            }

            setSelectedItems(new Set());
            await loadItems();
          }}
          onClearSelection={() => setSelectedItems(new Set())}
        />
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedItems.size === items.length && items.length > 0}
                  onChange={toggleAllSelection}
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Assembly</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className={item.deleted_at ? 'opacity-50' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      disabled={!!item.deleted_at}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    {item.assembly?.code} - {item.assembly?.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>v{item.version}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Status Actions */}
                        {item.status === 'draft' && !item.deleted_at && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(item.id, 'confirmed')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm
                          </DropdownMenuItem>
                        )}
                        {item.status === 'confirmed' && !item.deleted_at && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(item.id, 'actual')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Actual
                          </DropdownMenuItem>
                        )}
                        {(item.status === 'confirmed' || item.status === 'actual') && !item.deleted_at && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(item.id, 'draft')}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Revert to Draft
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Other Actions */}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedItemForAction(item.id);
                            setShowCloneDialog(true);
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Clone
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedItemForAction(item.id);
                            setShowVersionHistory(true);
                          }}
                        >
                          <History className="mr-2 h-4 w-4" />
                          Version History
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {item.deleted_at ? (
                          <DropdownMenuItem 
                            onClick={() => handleRestore(item.id)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} items
          </p>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={(currentPage + 1) * pageSize >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          loadItems();
          setShowCreateDialog(false);
        }}
      />

      {selectedItemForAction && (
        <>
          <CloneItemDialog
            open={showCloneDialog}
            onOpenChange={setShowCloneDialog}
            sourceItemId={selectedItemForAction}
            onSuccess={() => {
              loadItems();
              setShowCloneDialog(false);
              setSelectedItemForAction(null);
            }}
          />

          <VersionHistoryDialog
            open={showVersionHistory}
            onOpenChange={setShowVersionHistory}
            itemId={selectedItemForAction}
            onRestore={() => loadItems()}
          />
        </>
      )}
    </div>
  );
};
```

#### 3.2 Create Item Dialog

**File**: `src/features/library/components/management/CreateItemDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { LibraryItemDraft } from '../../types/library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { createClient } from '@/shared/lib/supabase/client';
import { toast } from '@/shared/components/ui/use-toast';

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateItemDialog: React.FC<CreateItemDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [formData, setFormData] = useState<LibraryItemDraft>({
    code: '',
    name: '',
    description: '',
    unit: '',
    assembly_id: ''
  });
  const [assemblies, setAssemblies] = useState<Array<{
    id: string;
    code: string;
    name: string;
    full_path: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    if (open) {
      loadAssemblies();
    }
  }, [open]);

  const loadAssemblies = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('assemblies')
      .select(`
        id,
        code,
        name,
        section:sections(
          code,
          name,
          division:divisions(code, name)
        )
      `)
      .order('code');

    const formatted = data?.map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      full_path: `${a.section?.division?.code} > ${a.section?.code} > ${a.code}`
    })) || [];

    setAssemblies(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.unit || !formData.assembly_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await libraryService.createLibraryItem(formData);
      toast({
        title: 'Success',
        description: 'Library item created successfully'
      });
      onSuccess();
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        unit: '',
        assembly_id: ''
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create item',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Library Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Item Code*</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., 03.10.10.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit*</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., M3, M2, EA"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Item Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Concrete Grade 25"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assembly">Assembly*</Label>
            <Select
              value={formData.assembly_id}
              onValueChange={(value) => setFormData({ ...formData, assembly_id: value })}
            >
              <SelectTrigger id="assembly">
                <SelectValue placeholder="Select an assembly" />
              </SelectTrigger>
              <SelectContent>
                {assemblies.map(assembly => (
                  <SelectItem key={assembly.id} value={assembly.id}>
                    <div>
                      <div className="font-medium">{assembly.code} - {assembly.name}</div>
                      <div className="text-sm text-muted-foreground">{assembly.full_path}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

### Step 4: Create Supporting Components

#### 4.1 Clone Item Dialog

**File**: `src/features/library/components/management/CloneItemDialog.tsx`

```typescript
import React, { useState } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/use-toast';

interface CloneItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItemId: string;
  onSuccess: () => void;
}

export const CloneItemDialog: React.FC<CloneItemDialogProps> = ({
  open,
  onOpenChange,
  sourceItemId,
  onSuccess
}) => {
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const libraryService = LibraryManagementService.getInstance();

  const handleClone = async () => {
    if (!newCode || !newName) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both code and name for the cloned item',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await libraryService.cloneLibraryItem(sourceItemId, newCode, newName);
      toast({
        title: 'Success',
        description: 'Item cloned successfully'
      });
      onSuccess();
      setNewCode('');
      setNewName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clone item',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Library Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-code">New Item Code</Label>
            <Input
              id="new-code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Enter unique code for cloned item"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-name">New Item Name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name for cloned item"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            This will create a new draft item with all factors copied from the original.
          </p>
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
            onClick={handleClone}
            disabled={loading || !newCode || !newName}
          >
            {loading ? 'Cloning...' : 'Clone Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

#### 4.2 Version History Dialog

**File**: `src/features/library/components/management/VersionHistoryDialog.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { LibraryItemVersion } from '../../types/library';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { format } from 'date-fns';
import { RotateCcw, Eye } from 'lucide-react';
import { toast } from '@/shared/components/ui/use-toast';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  onRestore?: () => void;
}

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  open,
  onOpenChange,
  itemId,
  onRestore
}) => {
  const [versions, setVersions] = useState<LibraryItemVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<LibraryItemVersion | null>(null);

  const libraryService = LibraryManagementService.getInstance();

  useEffect(() => {
    if (open && itemId) {
      loadVersions();
    }
  }, [open, itemId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await libraryService.getVersionHistory(itemId);
      setVersions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version?')) return;

    try {
      await libraryService.restoreFromVersion(itemId, versionId);
      toast({
        title: 'Success',
        description: 'Version restored successfully'
      });
      onRestore?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore version',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading version history...</div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No version history available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modified Fields</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version, index) => {
                const versionData = version.data;
                const isLatest = index === 0;

                return (
                  <TableRow key={version.id}>
                    <TableCell>
                      v{version.version_number}
                      {isLatest && (
                        <Badge variant="outline" className="ml-2">
                          Current
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge>{versionData.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {/* Show changed fields compared to previous version */}
                      <div className="text-sm">
                        {versionData.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedVersion(version)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!isLatest && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRestore(version.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Version Details Modal */}
        {selectedVersion && (
          <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Version {selectedVersion.version_number} Details</DialogTitle>
              </DialogHeader>
              <pre className="text-sm overflow-auto max-h-96 bg-muted p-4 rounded">
                {JSON.stringify(selectedVersion.data, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

#### 4.3 Quick Add Dialog (NEW - For Estimate Integration!)

**File**: `src/features/library/components/management/QuickAddFromEstimateDialog.tsx`

```typescript
import React, { useState } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { toast } from '@/shared/components/ui/use-toast';

interface QuickAddFromEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchTerm: string;
  elementId: string;
  onSuccess: (itemId: string) => void;
  divisions: Array<{ id: string; name: string; code: string }>;
}

export const QuickAddFromEstimateDialog: React.FC<QuickAddFromEstimateDialogProps> = ({
  open,
  onOpenChange,
  searchTerm,
  elementId,
  onSuccess,
  divisions
}) => {
  const [formData, setFormData] = useState({
    name: searchTerm,
    division_id: '',
    section_id: '',
    assembly_id: '',
    unit: '',
    material_rate: '',
    labour_rate: '',
    equipment_rate: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Quick validation
      if (!formData.name || !formData.unit || !formData.division_id) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      // Create draft item with quick-add context
      const newItem = await LibraryManagementService.getInstance().quickAddFromEstimate({
        ...formData,
        status: 'draft',
        quick_add_context: {
          element_id: elementId,
          search_term: searchTerm,
          created_from: 'estimate'
        }
      });

      toast({
        title: 'Item Created',
        description: `${newItem.name} added to library and ready to use`,
      });

      onSuccess(newItem.id);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create library item',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Library</DialogTitle>
          <DialogDescription>
            "{searchTerm}" not found. Create it as a draft item to use immediately.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will create a DRAFT item. A manager can review and approve it later.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name*</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Fire-Rated Concrete 2hr"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="division">Division*</Label>
              <Select
                value={formData.division_id}
                onValueChange={(value) => setFormData({ ...formData, division_id: value })}
              >
                <SelectTrigger id="division">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.code} - {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit">Unit*</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="m³, kg, etc"
              />
            </div>

            <div>
              <Label htmlFor="material_rate">Material Rate</Label>
              <Input
                id="material_rate"
                type="number"
                value={formData.material_rate}
                onChange={(e) => setFormData({ ...formData, material_rate: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Plus className="w-4 h-4 mr-1" />
            Add & Use
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### Step 5: Create Database Migration

**File**: `supabase/migrations/20250713_add_library_versioning.sql`

```sql
-- Create library item versions table
CREATE TABLE IF NOT EXISTS library_item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(library_item_id, version_number)
);

-- Add versioning columns to library_items
ALTER TABLE library_items 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX idx_library_item_versions_item_id ON library_item_versions(library_item_id);
CREATE INDEX idx_library_items_status ON library_items(status);
CREATE INDEX idx_library_items_deleted_at ON library_items(deleted_at);

-- Create function to increment version
CREATE OR REPLACE FUNCTION increment_library_item_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for version increment
CREATE TRIGGER library_items_version_increment
  BEFORE UPDATE ON library_items
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION increment_library_item_version();

-- RLS policies
ALTER TABLE library_item_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view library item versions"
  ON library_item_versions FOR SELECT
  USING (true);

CREATE POLICY "Admin users can manage library item versions"
  ON library_item_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Function to get item statistics (NEW - uses junction table)
CREATE OR REPLACE FUNCTION get_library_item_statistics(p_item_id UUID)
RETURNS TABLE (
  usage_count BIGINT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  projects_used_in BIGINT,
  average_quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as usage_count,
    MAX(eei.created_at) as last_used_at,
    COUNT(DISTINCT es.project_id)::BIGINT as projects_used_in,
    AVG(eei.quantity)::NUMERIC as average_quantity
  FROM estimate_element_items eei
  JOIN estimate_elements ee ON eei.element_id = ee.id
  JOIN estimate_structures es ON ee.structure_id = es.id
  WHERE eei.library_item_id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- Add quick-add metadata column
ALTER TABLE library_items 
ADD COLUMN IF NOT EXISTS quick_add_metadata JSONB;
```

### Step 6: Update Service Exports

**File**: `src/features/library/services/index.ts`

```typescript
export * from './catalogService';
export * from './projectRatesService';
export * from './libraryManagementService'; // Add this line
```

### Step 7: Integration Example

Add library management to your admin section:

**File**: `src/app/admin/library/items/page.tsx`

```typescript
import { LibraryItemManager } from '@/features/library/components/management/LibraryItemManager';

export default function LibraryItemsManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <LibraryItemManager />
    </div>
  );
}
```

## Testing Guidelines

### Unit Tests

Create test file: `src/features/library/services/__tests__/libraryManagementService.test.ts`

```typescript
import { LibraryManagementService } from '../libraryManagementService';
import { createClient } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');

describe('LibraryManagementService', () => {
  let service: LibraryManagementService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'test-user-id' } } 
        })
      }
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    service = LibraryManagementService.getInstance();
  });

  describe('createLibraryItem', () => {
    it('should create a new library item as draft', async () => {
      const draft = {
        code: 'TEST001',
        name: 'Test Item',
        description: 'Test Description',
        unit: 'EA',
        assembly_id: 'assembly-123'
      };

      const expectedItem = {
        ...draft,
        id: 'item-123',
        status: 'draft',
        version: 1,
        is_active: false
      };

      mockSupabase.single.mockResolvedValue({ data: expectedItem, error: null });

      const result = await service.createLibraryItem(draft);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...draft,
          status: 'draft',
          version: 1,
          is_active: false
        })
      );
      expect(result).toEqual(expectedItem);
    });
  });

  // Add more test cases...
});
```

### Manual Testing Checklist

1. **Item Creation**
   - [ ] Can create new draft items
   - [ ] Required fields are validated
   - [ ] Assembly selection works correctly

2. **Lifecycle Management**
   - [ ] Draft items can be confirmed (with factors)
   - [ ] Confirmed items can be marked as actual
   - [ ] Items can be reverted to draft
   - [ ] Validation prevents invalid transitions

3. **Version Control**
   - [ ] Versions are created on updates
   - [ ] Version history displays correctly
   - [ ] Can restore from previous versions

4. **Bulk Operations**
   - [ ] Bulk status updates work
   - [ ] Bulk delete (soft) works
   - [ ] Error handling for partial failures

5. **Search and Filter**
   - [ ] Text search works for code and name
   - [ ] Status filter works
   - [ ] Pagination handles large datasets

## Deployment Checklist

1. **Pre-deployment**
   - [ ] Run database migration for versioning
   - [ ] All tests passing
   - [ ] Code review completed

2. **Deployment**
   - [ ] Deploy service code
   - [ ] Deploy UI components
   - [ ] Update feature exports
   - [ ] Verify RLS policies

3. **Post-deployment**
   - [ ] Test item creation flow
   - [ ] Verify lifecycle transitions
   - [ ] Check version history
   - [ ] Monitor for errors

## Next Steps

After completing this phase:

1. Proceed to [Phase 3: Background Jobs & Edge Functions](./03-BACKGROUND-JOBS.md)
2. Train users on lifecycle management
3. Import existing library items
4. Set up automated backups for versions

## Common Issues & Solutions

### Issue 1: Validation fails on confirm
**Solution**: Ensure item has at least one factor (material, labor, or equipment)

### Issue 2: Version history not saving
**Solution**: Check if library_item_versions table exists and has proper permissions

### Issue 3: Bulk operations timeout
**Solution**: Process in smaller batches or implement background job processing

---

*Phase 2 Complete: Library management with full lifecycle control is now implemented*