# Code Generation & Parent-Child Hierarchy Improvements

## Issues Fixed

### 1. Broken Code Generation Logic
**Problem**: When adding a new section under "02 Sitework", the system suggested "02.10" instead of "02.40" (the correct next available code after 02.10, 02.20, 02.30).

**Root Cause**: The `generateSectionCode()` method in LibraryCodeGenerator wasn't properly querying or processing existing sections.

**Solution**: 
- Added comprehensive logging to all code generation methods
- Enhanced error handling and debugging capabilities
- Fixed query logic to properly find the maximum existing section number
- Applied similar improvements to `generateAssemblyCode()` and `generateItemCode()`

### 2. Parent-Child Auto-Detection
**Problem**: When adding items from specific hierarchy levels, users had to manually select parents even when the parent context was known.

**Solution**:
- Enhanced `AddLibraryItemDialog` to automatically detect and set parent context
- Added `isParentLocked` state to prevent manual changes when context is provided
- Implemented automatic parent selection based on clicked item's hierarchy level
- Added visual indicators showing auto-selected parents

### 3. Real-Time Code Preview
**Problem**: The code preview showed generic patterns instead of actual next available codes.

**Solution**:
- Created dedicated `/api/admin/library/preview-code` endpoint
- Replaced static preview patterns with real-time code generation
- Shows exact next available codes (e.g., "02.40" for Sitework sections)
- Handles loading states and error conditions gracefully

## Files Modified

### 1. `/src/lib/services/libraryCodeGenerator.ts`
- Added comprehensive logging to all generation methods
- Enhanced error handling and debugging
- Improved query logic for finding maximum existing codes
- Console logging format: `[CodeGenerator] ...`

### 2. `/src/components/admin/library/AddLibraryItemDialog.tsx`
- Added `isParentLocked` state for context-aware behavior
- Implemented `setupParentContext()` function for auto-detection
- Enhanced parent selection UI with visual indicators
- Replaced static code preview with real-time generation
- Added hierarchy breadcrumbs showing parent context

### 3. `/src/components/admin/library/ModernLibraryBrowser.tsx`
- Enhanced `handleAddItem()` to pass complete hierarchy context
- Added logging for debugging parent context passing

### 4. `/src/app/api/admin/library/preview-code/route.ts` (NEW)
- Dedicated endpoint for real-time code preview generation
- Calls actual code generation logic without saving to database
- Returns next available codes for all hierarchy levels

## Key Features

### Auto-Detection Behavior
When clicking "Add Section" on division "02 Sitework":
- Dialog automatically selects division "02" 
- Division field is disabled and marked "(auto-selected)"
- Shows context breadcrumb: "Adding to: 02 - Sitework"
- Real-time preview shows "Next available: 02.40"

### Visual Enhancements
- Blue context badge showing parent information
- "(auto-selected)" labels on locked parent fields
- Hierarchy breadcrumbs in dialog header
- Real-time code preview with "Generating..." states

### Logging System
All operations now include comprehensive logging:
- `[CodeGenerator]` for code generation operations
- `[AddDialog]` for dialog operations
- `[Browser]` for browser operations

## Testing Instructions

1. **Navigate to Construction Library**
2. **Expand "02 Sitework" division**
3. **Click "Add Section" button on the division row**
4. **Verify**:
   - Dialog shows "Adding to: 02 - Sitework"
   - Division field is auto-selected and disabled
   - Enter a section name and see real-time preview showing "02.40"

5. **Test other levels**:
   - Add Assembly to existing sections
   - Add Items to existing assemblies
   - Verify parent context is properly inherited

## Console Debugging

Check browser console for detailed logs:
```
[CodeGenerator] Generating section code for division: 02
[CodeGenerator] Querying sections with pattern: 02.%
[CodeGenerator] Found 3 existing sections: ["02.10", "02.20", "02.30"]
[CodeGenerator] Maximum section number found: 30
[CodeGenerator] Generated section code: 02.40
```

## Code Generation Logic

The system now correctly:
1. Queries existing codes with proper patterns
2. Finds maximum existing numbers
3. Increments appropriately (by 10 for sections/assemblies, by 1 for items)
4. Returns exact next available codes
5. Handles all edge cases and errors gracefully

## Future Enhancements

- Add move/reassign functionality before deletion
- Implement bulk operations for managing child items
- Add code generation preferences (custom increments)
- Enhanced validation for custom codes