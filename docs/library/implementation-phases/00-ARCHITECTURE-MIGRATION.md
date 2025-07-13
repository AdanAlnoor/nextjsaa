# Phase 0: Architecture Migration - Library-Only Items

## Student-Friendly Overview 📚

**What We're Building:** A simpler, cleaner system where ALL estimate items come from the library. No more confusion about where items live!

**Think of it like:**
- **Before**: Like having recipes scattered in notebooks, on sticky notes, AND in a cookbook
- **After**: Everything in ONE cookbook - if you need a new recipe, add it to the cookbook first

**The Big Change:**
```
OLD WAY:                          NEW WAY:
Project                           Project
└── Structures                    └── Structures (just folders)
    └── Elements                      └── Elements (just folders)
        └── Detail Items                   └── Library Items (linked)
            (manual entry)                     (from catalog)
```

**Duration**: 3-4 days  
**Priority**: CRITICAL (must be done first!)  
**Prerequisites**: Backup of current database

## What Problem Does This Solve? 🤔

### Current Chaos
1. **Duplicate Items**: Same concrete mix defined 5 different ways
2. **Inconsistent Pricing**: Manual items have different rates each time
3. **No Standards**: Everyone creates items differently
4. **Lost Knowledge**: Custom items aren't reusable
5. **Messy Data**: Mix of manual and library items

### The Solution
1. **Single Source**: ALL items live in the library
2. **Consistent Pricing**: Standard rates with project overrides
3. **Enforced Standards**: Items follow library structure
4. **Knowledge Sharing**: Every item is reusable
5. **Clean Data**: One way to create items

## How Will We Know It Works? ✅

### Test Scenario 1: Creating an Estimate
```typescript
// What you'll do:
1. Create Structure: "Foundation Works"
2. Create Element: "Footings"
3. Click "Add Items"
4. Search library for "concrete"
5. Select "03.10.20.01 - Concrete C25/30"
6. Enter quantity: 150 m³
7. Item appears with library code

// How to verify:
- No "Add Custom Item" button exists
- Only library search available
- Library code displayed (03.10.20.01)
- Rates come from project settings + library
```

### Test Scenario 2: Item Not in Library
```typescript
// What you'll do:
1. Search for "Special Waterproof Concrete"
2. Not found - click "Add to Library"
3. Fill quick-add form:
   - Name: "Special Waterproof Concrete"
   - Division: "03 - Concrete"
   - Section: "10 - Concrete Forming"
   - Assembly: "20 - Concrete"
   - Unit: "m³"
4. Item created as DRAFT in library
5. Now available to add to estimate

// How to verify:
- Seamless flow from "not found" to "created"
- Item has status = "draft"
- Auto-generated code (03.10.20.XX)
- Immediately usable in estimate
```

### Test Scenario 3: Migration Success
```typescript
// What happens:
1. Run migration script
2. Old detail items → library items
3. Check estimate totals unchanged
4. All items have library codes
5. No data lost

// How to verify:
- Count items before/after matches
- Total costs remain same
- All items traceable to library
- Rollback script ready if needed
```

## What Gets Built - Component by Component 🔨

### 1. Database Changes

**Remove Old Structure:**
```sql
-- What we're removing
estimate_detail_items table ❌
- Too flexible, causes chaos
- Mix of manual/library items
- No standards enforcement
```

**Add New Structure:**
```sql
-- Junction table linking estimates to library
CREATE TABLE estimate_element_items (
    id UUID PRIMARY KEY,
    element_id UUID,          -- Which element
    library_item_id UUID,     -- Which library item
    quantity DECIMAL,         -- How much (user-entered)
    rate_manual DECIMAL,      -- Manual rate (user can override)
    rate_calculated DECIMAL,  -- Calculated rate (from factors + adjustments)
    rate_override DECIMAL,    -- Project-specific rate override
    order_index INTEGER       -- Display order
);
```

**Visual Difference:**
```
BEFORE (3 tables):
structures → elements → detail_items (messy)

AFTER (2 tables + junction):
structures → elements ← → library_items (clean)
```

### 2. Service Layer Updates

**EstimateService Changes:**
```typescript
// REMOVE these methods
❌ createDetailItem()
❌ updateDetailItem()
❌ deleteDetailItem()
❌ bulkCreateDetailItems()

// ADD these methods
✅ addLibraryItemToElement()
✅ removeLibraryItemFromElement()
✅ updateElementItemQuantity()
✅ updateElementItemRate()      // For manual rate entry
✅ quickAddToLibrary()
```

**New Workflow Service:**
```typescript
class EstimateLibraryWorkflow {
  // Seamless item addition
  async addItemToElement(elementId, searchTerm) {
    // Search library first
    const items = await searchLibrary(searchTerm);
    
    if (items.length === 0) {
      // Not found - guide to quick add
      return { 
        found: false, 
        action: 'SHOW_QUICK_ADD',
        prefillData: { name: searchTerm }
      };
    }
    
    // Found - let user select
    return { 
      found: true, 
      items,
      action: 'SHOW_SELECTION' 
    };
  }

  // Calculate rates when adding items
  async calculateAndAddItem(elementId, libraryItemId, quantity) {
    // Get library item with factors
    const libraryItem = await getLibraryItemWithFactors(libraryItemId);
    
    // Calculate rate from factors
    const calculated = await calculateItemRate(libraryItem, projectId);
    
    // Create element item with calculated rate
    await createElementItem({
      element_id: elementId,
      library_item_id: libraryItemId,
      quantity: quantity,
      rate_manual: null,        // User can override later
      rate_calculated: calculated.total,  // M + L + E + adjustments
      rate_override: null       // No project override initially
    });
  }

  // Update manual rate
  async updateManualRate(elementItemId, manualRate) {
    await updateElementItem(elementItemId, {
      rate_manual: manualRate   // User's manual override
    });
  }
}
```

### 3. UI Components

**Remove These Components:**
```typescript
❌ DetailItemForm
❌ ManualItemEntry  
❌ CustomItemModal
❌ DetailItemEditor
```

**Add These Components:**
```typescript
✅ LibraryItemSelector   // Search and select from library
✅ QuickAddToLibrary     // Fast draft item creation
✅ ElementItemsList      // Display linked library items
✅ LibrarySearchPanel    // Enhanced search with filters
```

**New UI Flow:**
```
Element View: Footings
┌────────────────┬─────────────────────┬──────┬──────┬─────────┬────────────┬─────────┐
│ Code           │ Description         │ Qty  │ Unit │ Manual  │ Calculated │ Amount  │
│                │                     │      │      │ Rate    │ Rate       │         │
├────────────────┼─────────────────────┼──────┼──────┼─────────┼────────────┼─────────┤
│ 03.10.20.01    │ Concrete C25/30     │ 150  │ m³   │ [____]  │ $125.50   │ $18,825 │
│ 03.20.10.05    │ Rebar 16mm          │  12  │ ton  │ $1,200  │ $1,150.00 │ $14,400 │
│ 03.10.30.02    │ Formwork            │ 450  │ m²   │ [____]  │ $45.00    │ $20,250 │
└────────────────┴─────────────────────┴──────┴──────┴─────────┴────────────┴─────────┘
                                                                        Total: $53,475

[+ Add Library Items]

Note: 
- Manual Rate: User can override by typing a value
- Calculated Rate: Automatically computed from library factors + project rates + adjustments
- Amount: Uses manual rate if provided, otherwise calculated rate
```

### 4. Migration Scripts

**Phase 1: Analyze Current Data**
```sql
-- Count items to migrate
SELECT 
    COUNT(*) as total_items,
    COUNT(library_item_id) as linked_items,
    COUNT(*) - COUNT(library_item_id) as orphaned_items
FROM estimate_detail_items;

-- Identify duplicate manual items
SELECT name, unit, COUNT(*) as duplicates
FROM estimate_detail_items
WHERE library_item_id IS NULL
GROUP BY name, unit
HAVING COUNT(*) > 1;
```

**Phase 2: Create Library Items for Orphans**
```typescript
async function migrateOrphanedItems() {
  // Get all manual items
  const orphans = await getOrphanedDetailItems();
  
  // Group by unique name/unit
  const uniqueItems = groupByNameAndUnit(orphans);
  
  // Create draft library items
  for (const item of uniqueItems) {
    const libraryItem = await createDraftLibraryItem({
      name: item.name,
      unit: item.unit,
      status: 'draft',
      migrated: true,
      original_ids: item.source_ids
    });
    
    // Map all instances to new library item
    await mapOrphansToLibraryItem(item.source_ids, libraryItem.id);
  }
}
```

**Phase 3: Migrate to Junction Table**
```sql
-- Create new links
INSERT INTO estimate_element_items (
    element_id,
    library_item_id,
    quantity,
    rate_manual,
    rate_calculated,
    rate_override,
    order_index
)
SELECT 
    element_id,
    COALESCE(library_item_id, migrated_library_id),
    quantity,
    rate_manual,        -- Preserve existing manual rates
    rate_calculated,    -- Preserve existing calculated rates
    NULL,               -- No project override initially
    order_index
FROM estimate_detail_items;
```

**Phase 4: Validate & Clean Up**
```sql
-- Verify migration
CREATE VIEW migration_validation AS
SELECT 
    'before' as stage,
    COUNT(*) as item_count,
    SUM(quantity * COALESCE(rate_manual, rate_calculated)) as total_value
FROM estimate_detail_items
UNION ALL
SELECT 
    'after' as stage,
    COUNT(*) as item_count,
    SUM(ei.quantity * COALESCE(ei.rate_override, li.base_rate)) as total_value
FROM estimate_element_items ei
JOIN library_items li ON ei.library_item_id = li.id;

-- If validation passes, drop old table
DROP TABLE estimate_detail_items CASCADE;
```

**Phase 5: Create Display View**
```sql
-- Create view for displaying estimate items with all required columns
CREATE VIEW estimate_items_display AS
SELECT 
    eei.id,
    eei.element_id,
    ee.name as element_name,
    es.name as structure_name,
    -- Library hierarchy display (4 levels)
    CONCAT(li.code, ' - ', li.name) as description,
    -- User inputs
    eei.quantity,
    li.unit,
    -- Rate columns
    eei.rate_manual,          -- User can manually enter
    eei.rate_calculated,      -- System calculated from factors
    -- Amount columns
    (eei.quantity * COALESCE(eei.rate_manual, 0)) as amount_manual,
    (eei.quantity * COALESCE(eei.rate_calculated, 0)) as amount_calculated,
    -- Use manual if provided, otherwise calculated
    COALESCE(eei.rate_manual, eei.rate_calculated) as rate_effective,
    (eei.quantity * COALESCE(eei.rate_manual, eei.rate_calculated, 0)) as amount_effective,
    -- Metadata
    eei.order_index,
    li.status as library_status,
    li.division_id,
    li.section_id,
    li.assembly_id
FROM estimate_element_items eei
JOIN library_items li ON eei.library_item_id = li.id
JOIN estimate_elements ee ON eei.element_id = ee.id
JOIN estimate_structures es ON ee.structure_id = es.id
ORDER BY es.order_index, ee.order_index, eei.order_index;
```

## Implementation Steps

### Day 1: Database Migration
- [ ] Backup current database
- [ ] Create junction table
- [ ] Create migration views
- [ ] Test migration scripts
- [ ] Run on test database

### Day 2: Service Layer
- [ ] Update EstimateService
- [ ] Create WorkflowService
- [ ] Update calculation logic
- [ ] Remove old services
- [ ] Test all endpoints

### Day 3: UI Components
- [ ] Create LibraryItemSelector
- [ ] Create QuickAddToLibrary
- [ ] Update estimate views
- [ ] Remove old components
- [ ] Test user workflows

### Day 4: Migration & Testing
- [ ] Run production migration
- [ ] Validate all data
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Documentation update

## Rollback Plan

If something goes wrong:

```sql
-- Quick rollback
BEGIN;
-- Restore from backup
CREATE TABLE estimate_detail_items AS 
SELECT * FROM estimate_detail_items_backup;

-- Drop new structures
DROP TABLE estimate_element_items;

-- Restore old foreign keys
ALTER TABLE estimate_detail_items
ADD CONSTRAINT fk_element 
FOREIGN KEY (element_id) 
REFERENCES estimate_elements(id);
COMMIT;
```

## Success Metrics

1. **Data Integrity**
   - Zero items lost in migration
   - All calculations match pre-migration

2. **Performance**
   - Element loading < 200ms
   - Library search < 100ms

3. **User Experience**
   - 90% of items found in library
   - Quick-add takes < 30 seconds

4. **Code Quality**
   - 50% less code than before
   - Zero manual item creation paths

## Common Issues & Solutions

### Issue 1: "I can't find my custom item!"
**Solution**: It's now a draft in the library. Search library with status=draft.

### Issue 2: "Adding items is slower!"
**Solution**: Use bulk select in library. Select multiple items at once.

### Issue 3: "My old estimates look different!"
**Solution**: Migration preserves all data. Check if viewing library codes now.

## Next Steps

After completing Phase 0:
1. **Phase 1** becomes simpler - no detail_items complexity
2. **Phase 2** focuses purely on library management
3. **Phase 4** builds on clean architecture
4. All phases benefit from simplified data model

## For Developers

### Key Changes:
```typescript
// Old way - DON'T DO THIS
const item = await createDetailItem({
  name: "Custom Concrete",
  quantity: 100,
  rate: 125
});

// New way - DO THIS
const libraryItem = await findOrCreateLibraryItem("Custom Concrete");
await linkToElement(elementId, libraryItem.id, 100);
```

### Testing Focus:
1. Migration script accuracy
2. No data loss
3. Performance not degraded
4. User workflows smooth
5. Rollback procedures work