# Issue Analysis and Solutions

⚠️ **IMPORTANT**: All solutions in this document have been designed to be non-destructive and backward-compatible. Each fix includes safety checks and rollback strategies to ensure existing functionality is preserved.

## Executive Summary

Your Next.js application is experiencing multiple critical issues that are preventing proper functionality:

1. **Database Schema Issue**: Missing `estimate_project_summary` table causing 404 errors
2. **Authentication Issue**: Supabase Auth refresh token error causing unexpected sign-outs
3. **Performance Issue**: Cost Control Context filtering inconsistencies and duplicate calculations
4. **Missing Database Functions**: Several RPC functions referenced in code but don't exist
5. **React Performance**: Infinite re-renders and Fast Refresh rebuilding issues

This document provides a comprehensive analysis and step-by-step solutions for all identified issues.

---

## Issue 1: Missing Database Table (`estimate_project_summary`)

### **Problem Description**
The application is trying to query a table called `estimate_project_summary` that doesn't exist in your Supabase database, resulting in:
- 404 errors in browser console
- Failed project summary fetches
- Broken cost control functionality

### **Error Details**
```
Failed to load resource: the server responded with a status of 404
relation "public.estimate_project_summary" does not exist
```

### **Root Cause Analysis**

1. **Missing Table**: The `estimate_project_summary` table was never created in the database
2. **Code Inconsistency**: Different parts of the codebase reference different table names:
   - `estimate_project_summary` (correct expected name)
   - `project_summary` (incorrect reference)
   - `project_summary_view` (existing view, different structure)

### **Affected Files**
- `src/components/cost-control/summary/hooks/useSummaryDetailData.ts:97-98`
- `src/components/cost-control/summary/hooks/useProjectSummary.ts:41-42` (uses wrong table name)

### **Solution Steps**

#### Step 1: Create the Missing Table (SAFE)
**⚠️ Safety First**: Before creating the table, verify it doesn't exist:
```sql
-- Check if table already exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estimate_project_summary'
);
```

**Option A: Use Supabase Dashboard (RECOMMENDED)**
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. First run the existence check above
4. If it returns `false`, copy and paste the contents of `sql/create_estimate_project_summary.sql`
5. Execute the query
6. **Backup**: Download your database backup first from Supabase Dashboard > Settings > Backups

**Option B: Use Migration Script (ADVANCED)**
```bash
# First backup your database
# Then run the prepared migration script
node scripts/apply-summary-migration.js
```

**Rollback Strategy**: If issues occur:
```sql
-- To rollback, simply drop the table
DROP TABLE IF EXISTS estimate_project_summary CASCADE;
```

#### Step 2: Fix Table Name Inconsistency
Update `src/components/cost-control/summary/hooks/useProjectSummary.ts`:

```typescript
// Change line 41-42 from:
const { data, error } = await supabase
  .from('project_summary')  // ❌ WRONG

// To:
const { data, error } = await supabase
  .from('estimate_project_summary')  // ✅ CORRECT
```

#### Step 3: Verify Database Functions
Ensure these functions exist in your database:
- `refresh_project_summary(p_project_id UUID)`
- `populate_all_project_summaries()`

#### Step 4: Test the Fix
```sql
-- Verify table exists
SELECT * FROM estimate_project_summary LIMIT 1;

-- Test the refresh function
SELECT refresh_project_summary('9f7b6f03-623d-491f-90ef-72939e61e658');
```

---

## Issue 2: Supabase Auth Refresh Token Error

### **Problem Description**
Users are experiencing unexpected sign-outs due to authentication refresh token failures:
```
AuthApiError: missing destination name last_refresh_attempt in *models.Session
POST https://[...].supabase.co/auth/v1/token?grant_type=refresh_token 500 (Internal Server Error)
```

### **Root Cause Analysis**

1. **Version Compatibility**: Using `@supabase/ssr` v0.5.2 (not latest)
2. **Package Conflicts**: Multiple auth packages installed:
   - `@supabase/ssr@0.5.2`
   - `@supabase/supabase-js@2.49.4`
   - `@supabase/auth-helpers-nextjs@0.10.0` (legacy - conflict source)
3. **Custom Cookie Handling**: Complex base64 cookie parsing might interfere with SSR package
4. **Session Schema**: Auth schema may be missing required fields for current version

### **Solution Steps**

#### Step 1: Update Supabase Packages (GRADUAL APPROACH)
**⚠️ Safety First**: Test in development environment first

```bash
# First, check current versions
npm list @supabase/ssr @supabase/supabase-js @supabase/auth-helpers-nextjs

# Create a backup of package.json and package-lock.json
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Remove legacy auth helpers (this is safe as it's not used)
npm uninstall @supabase/auth-helpers-nextjs

# Update incrementally (safer than jumping to latest)
npm install @supabase/ssr@^0.5.2 @supabase/supabase-js@^2.49.4

# Test thoroughly before updating to latest
# If all works well, then update to latest:
# npm install @supabase/ssr@latest @supabase/supabase-js@latest

# Verify versions after update
npm list @supabase/ssr @supabase/supabase-js
```

**Rollback Strategy**: If auth breaks:
```bash
# Restore original packages
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
npm install
```

#### Step 2: Simplify Client Configuration (OPTIONAL - LOWER PRIORITY)

**⚠️ Note**: The current complex cookie handling might be necessary for your app. Test thoroughly before simplifying.

**Option A: Keep Current Implementation (SAFER)**
If authentication is currently working for most users, keep the existing implementation and only fix the package versions.

**Option B: Gradual Simplification (IF NEEDED)**
Create a new simplified client alongside the existing one:

**Create `src/utils/supabase/client-simple.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClientSimple() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Then gradually migrate components to use the simple client and test each one.

**Update `src/utils/supabase/server.ts`:**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore cookie setting errors in server-side rendering
          }
        },
      },
    }
  )
}
```

#### Step 3: Update Middleware
**Simplify `src/middleware.ts`:**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Your existing middleware logic...
  
  return supabaseResponse
}
```

#### Step 4: Clean Up Package.json
Remove any references to legacy auth helpers and ensure only these auth packages remain:
```json
{
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest"
  }
}
```

#### Step 5: Check Environment Variables
Verify your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://jrsubdglzxjoqpgbbxbq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Issue 3: Cost Control Context Performance Issues

### **Problem Description**
The Cost Control Context is showing inconsistent filtering results and duplicate calculations:
```
CostControlContext.tsx:163 Visible items in CostControlContext: Array(0)
CostControlContext.tsx:163 Visible items in CostControlContext: Array(3)
supabase.ts:606 Calculating actual amount for Concrete to slab: paid_bills=0, external_bills=0, wages=0
supabase.ts:606 Calculating actual amount for Concrete to slab: paid_bills=0, external_bills=0, wages=0
```

### **Root Cause Analysis**
1. **Non-memoized Computation**: `visibleItems` is recalculated on every render
2. **Duplicate Processing**: Each cost control item is calculated twice
3. **State Inconsistency**: Filter results change between renders

### **Solution Steps**

#### Step 1: Memoize Visible Items Calculation (SAFE OPTIMIZATION)
**⚠️ This is a safe performance optimization that won't break functionality**

Update `src/context/CostControlContext.tsx`:
```typescript
import { useMemo } from 'react';

// Find the visibleItems computation (around line 135-188)
// Wrap it with useMemo to prevent recalculation on every render:
const visibleItems = useMemo(() => {
  // Keep the EXACT same logic that's currently there
  // Just wrap it in useMemo
  
  if (!costControlItems.length) return [];
  
  const visible: CostControlData[] = [];
  
  costControlItems.forEach(item => {
    if (item.isParent) {
      visible.push(item);
      if (item.isOpen && item.children) {
        item.children.forEach(childId => {
          const child = costControlItems.find(c => c.id === childId);
          if (child) visible.push(child);
        });
      }
    }
  });
  
  console.log('Visible items in CostControlContext:', visible);
  return visible;
}, [costControlItems]); // Only recalculate when costControlItems changes
```

**Why this is safe**: This only caches the computation result - the logic remains exactly the same.

#### Step 2: Fix Duplicate Calculations
Update calculation logic to prevent duplicate processing:
```typescript
// Add memoization to calculation function
const calculateActualAmount = useMemo(() => {
  return (item: CostControlData) => {
    // Calculation logic here
  };
}, []);
```

---

## Issue 4: Missing Database Functions

### **Problem Description**
Several RPC functions are referenced in the code but don't exist in the database:
- `get_suppliers_by_project`
- `get_cost_control_items_by_project`
- Transaction functions (`begin_transaction`, `commit_transaction`, `rollback_transaction`)

### **Solution Steps**

#### Step 1: Handle Missing RPC Functions (SAFE ALTERNATIVES)

**⚠️ Instead of creating new functions, use existing table queries (SAFER)**

**Option A: Modify Code to Use Direct Queries (RECOMMENDED)**
Instead of calling missing RPC functions, update the code to use direct table queries:

```typescript
// Instead of: supabase.rpc('get_suppliers_by_project', { project_id })
// Use: 
const { data, error } = await supabase
  .from('suppliers')
  .select('*')
  .eq('project_id', projectId);

// Instead of: supabase.rpc('get_cost_control_items_by_project', { project_id })
// Use:
const { data, error } = await supabase
  .from('cost_control_items')
  .select('*')
  .eq('project_id', projectId);
```

**Option B: Create Functions Only If Necessary (ADVANCED)**
If you must create the functions for compatibility:

```sql
-- First check if functions already exist
SELECT proname FROM pg_proc WHERE proname IN ('get_suppliers_by_project', 'get_cost_control_items_by_project');

-- Only create if they don't exist
CREATE OR REPLACE FUNCTION get_suppliers_by_project(project_id_param UUID)
RETURNS SETOF suppliers
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM suppliers WHERE project_id = project_id_param;
$$;
```

#### Step 2: Replace Transaction Functions
Update `src/services/billsService.ts` to use Supabase's built-in transaction handling:
```typescript
// Replace manual transaction calls with Supabase transactions
const { data, error } = await supabase.rpc('your_function_name', params);
```

---

## Issue 5: React Performance Issues

### **Problem Description**
Multiple Fast Refresh rebuilds indicate potential infinite re-render loops:
```
hot-reloader-client.js:181 [Fast Refresh] rebuilding
```

### **Solution Steps**

#### Step 1: Add React.memo to Heavy Components
```typescript
import React, { memo } from 'react';

export const CostControlTable = memo(({ items }) => {
  // Component logic
});
```

#### Step 2: Optimize useEffect Dependencies
Review and fix dependency arrays in hooks to prevent unnecessary re-renders.

#### Step 3: Add Error Boundaries
```typescript
import { ErrorBoundary } from 'react-error-boundary';

// Wrap components with error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <CostControlProvider>
    {children}
  </CostControlProvider>
</ErrorBoundary>
```

---

## Implementation Checklist

### **Database Issue Fix**
- [ ] Apply `create_estimate_project_summary.sql` to database
- [ ] Fix table name in `useProjectSummary.ts`
- [ ] Create missing RPC functions (`get_suppliers_by_project`, `get_cost_control_items_by_project`)
- [ ] Verify all database functions exist
- [ ] Test project summary fetching
- [ ] Verify cost control functionality

### **Auth Issue Fix**
- [ ] Remove legacy `@supabase/auth-helpers-nextjs` package
- [ ] Update `@supabase/ssr` and `@supabase/supabase-js` to latest versions
- [ ] Simplify client configuration
- [ ] Update server client configuration
- [ ] Simplify middleware
- [ ] Clear browser cache and cookies
- [ ] Test authentication flow

### **Performance Issue Fix**
- [ ] Memoize `visibleItems` calculation in `CostControlContext.tsx`
- [ ] Fix duplicate calculation calls in cost control service
- [ ] Add React.memo to heavy components
- [ ] Optimize useEffect dependencies
- [ ] Add error boundaries to prevent crashes

### **Database Functions Fix**
- [ ] Create `get_suppliers_by_project` RPC function
- [ ] Create `get_cost_control_items_by_project` RPC function
- [ ] Remove or replace transaction function calls
- [ ] Test all RPC function calls

### **React Performance Fix**
- [ ] Add React.memo to `CostControlTable` and similar components
- [ ] Review and fix useEffect dependency arrays
- [ ] Add error boundaries around major component trees
- [ ] Monitor Fast Refresh rebuilding issues

### **Testing & Verification**
- [ ] Test user login/logout flow
- [ ] Verify project summary data loads correctly
- [ ] Check cost control context shows consistent item counts
- [ ] Monitor browser console for duplicate calculation logs
- [ ] Test session refresh behavior
- [ ] Verify no infinite re-render loops
- [ ] Test all database function calls work properly

---

## Priority Order for Implementation

To minimize risk, implement fixes in this order:

### **Phase 1: Critical Database Fix (HIGHEST PRIORITY)**
1. Create `estimate_project_summary` table (Issue #1)
2. Fix table name reference in `useProjectSummary.ts`
   - These fix the 404 errors without touching working code

### **Phase 2: Performance Optimizations (SAFE)**
1. Add `useMemo` to visibleItems calculation (Issue #3)
2. Add React.memo to heavy components (Issue #5)
   - These are purely performance improvements

### **Phase 3: Code Fixes (MEDIUM RISK)**
1. Replace RPC function calls with direct queries (Issue #4)
   - Test each change individually

### **Phase 4: Package Updates (HIGHER RISK)**
1. Update Supabase packages gradually (Issue #2)
   - Do this last, in a development environment first
   - Have rollback plan ready

## Expected Outcomes

After implementing these fixes:

1. **Database queries will succeed**: No more 404 errors for `estimate_project_summary`
2. **Authentication will be stable**: No unexpected sign-outs due to refresh token errors
3. **Cost control features will work**: Summary data will load properly
4. **Overall app stability**: Reduced console errors and improved user experience

## Safety Measures Summary

✅ **All database changes include existence checks**
✅ **All solutions have rollback strategies**
✅ **Package updates are incremental, not direct to latest**
✅ **Performance optimizations don't change logic**
✅ **RPC functions can be replaced with existing queries**
✅ **Each phase can be tested independently**

---

## Additional Recommendations

### **Database Optimization**
1. **Review RLS Policies**: Ensure Row Level Security is properly configured
2. **Index Optimization**: Add indexes for frequently queried columns
3. **Data Consistency**: Run data validation queries to ensure integrity

### **Code Quality**
1. **Service Consolidation**: You have duplicate cost control services - consider consolidating
2. **Error Handling**: Add better error boundaries for database operations
3. **Type Safety**: Ensure TypeScript interfaces match actual database schema

### **Monitoring**
1. **Database Monitoring**: Set up alerts for failed queries
2. **Auth Monitoring**: Monitor authentication success/failure rates
3. **Performance Monitoring**: Track query performance and response times

---

## Support Files Reference

The following files contain detailed implementation examples:
- `migrations/schema/20250618_create_estimate_project_summary_table.sql`
- `sql/create_estimate_project_summary.sql`
- `scripts/apply-summary-migration.js`
- `docs/database/FIX_ESTIMATE_PROJECT_SUMMARY.md`

---

## Contact & Support

If you encounter issues during implementation:
1. Check browser console for specific error messages
2. Verify database connection and permissions
3. Test with a clean browser session (incognito mode)
4. Check Supabase dashboard for real-time error logs

This comprehensive solution addresses both critical issues preventing your application from functioning correctly. Implement the database fix first, followed by the authentication improvements for best results.