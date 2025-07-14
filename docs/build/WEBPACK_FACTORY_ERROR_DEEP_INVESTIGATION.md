# Webpack Factory Call Error - Deep Technical Investigation

## Overview

This document provides an in-depth technical analysis of the webpack factory call error and hydration failures occurring in the Next.js 14 App Router application. Through comprehensive code review, I've identified the root causes and detailed the exact error propagation chain.

## Error Symptoms

```javascript
Uncaught TypeError: Cannot read properties of undefined (reading 'call')
    at options.factory (webpack.js:716:31)
    at __webpack_require__ (webpack.js:37:33)
    at fn (webpack.js:371:21)
    at eval (page.tsx:5:79)

Warning: An error occurred during hydration. The server HTML was replaced with client content in <#document>.

Uncaught Error: There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.
```

## Critical Technical Analysis

### 1. **Root Cause: SSR Browser API Access**

**Primary Issue Location: `/src/app/(auth)/login/_components/login-form.tsx:37`**
```typescript
// CRITICAL ERROR: Direct window access during SSR
const searchParams = new URLSearchParams(window.location.search);
```

**Error Sequence:**
1. Next.js server renders the login form component
2. Server attempts to execute `window.location.search` 
3. `window` is undefined on server → webpack factory fails
4. Client hydrates with different state → hydration mismatch
5. React switches to client-side rendering → error propagates

**Additional Critical Locations:**
- `/src/app/page.tsx:17` - `setCurrentPath(window.location.pathname)`
- `/src/features/auth/components/auth-provider.tsx:108` - `window.location.origin`

### 2. **Supabase Client SSR Incompatibility**

**Issue in `/src/shared/lib/supabase/client.ts`:**
```typescript
// Lines 74-91: Problematic setTimeout in module scope
setTimeout(async () => {
  try {
    const { data } = await supabaseInstance!.auth.getSession();
    // This executes during SSR causing timing issues
  } catch (err) {
    console.error("Error checking session:", err);
  }
}, 1000);
```

**Problems:**
- Singleton pattern with module-level setTimeout
- Auth state listener setup during import (Line 63)
- Browser storage access without SSR guards

### 3. **Import Path Resolution Issues**

**Provider Import Error in `/src/app/providers.tsx:7`:**
```typescript
import { AuthProvider } from "@/auth/components/auth-provider"
//                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                           INCORRECT PATH - causes module resolution failure
```

**Correct path should be:**
```typescript
import { AuthProvider } from "@/features/auth/components/auth-provider"
```

**Impact:** This incorrect import path causes webpack to fail finding the module, leading to undefined factory calls.

### 4. **Hydration Mismatch Chain**

**Error Propagation Sequence:**

1. **Server Render Phase:**
   ```
   Layout.tsx → Providers.tsx → AuthProvider (undefined) → Page.tsx
   ```

2. **Browser API Access During SSR:**
   ```
   login-form.tsx:37 → window.location → ReferenceError → webpack failure
   ```

3. **Hydration Phase:**
   ```
   Client renders different DOM → Hydration mismatch → React error boundary
   ```

4. **ChunkErrorBoundary Detection:**
   ```
   ChunkErrorBoundary.tsx:25 → Detects webpack error → Force reload cycle
   ```

### 5. **Multiple Browser API Violations**

**Summary of SSR violations found:**

| File | Line | Issue | Impact |
|------|------|-------|---------|
| `login-form.tsx` | 37 | `window.location.search` | **CRITICAL** - Immediate failure |
| `page.tsx` | 17 | `window.location.pathname` | High - Hydration mismatch |
| `auth-provider.tsx` | 108 | `window.location.origin` | High - Auth flow broken |
| `FeedbackWidget.tsx` | 90+ | Multiple window accesses | Medium - Component failure |
| Various files | Multiple | `localStorage`/`sessionStorage` | Medium - State issues |

## Detailed Technical Solutions

### **Solution 1: Fix Critical Window Access (IMMEDIATE)**

**File: `/src/app/(auth)/login/_components/login-form.tsx`**

```typescript
// BEFORE (Causes webpack error):
const searchParams = new URLSearchParams(window.location.search);

// AFTER (SSR-safe):
import { useSearchParams } from 'next/navigation';

const LoginForm = () => {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/projects';
  
  // Rest of component...
}
```

**File: `/src/app/page.tsx`**

```typescript
// BEFORE (Causes hydration mismatch):
useEffect(() => {
  setCurrentPath(window.location.pathname)
}, [])

// AFTER (SSR-safe):
import { usePathname } from 'next/navigation';

export default function HomePage() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div>Loading...</div>;
  }
  
  // Use pathname directly, no window access needed
}
```

### **Solution 2: Fix Import Path Resolution**

**File: `/src/app/providers.tsx`**

```typescript
// BEFORE (Incorrect path):
import { AuthProvider } from "@/auth/components/auth-provider"

// AFTER (Correct path):
import { AuthProvider } from "@/features/auth/components/auth-provider"
```

### **Solution 3: Fix Supabase Client SSR Issues**

**File: `/src/shared/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

let supabaseInstance: SupabaseClient<Database> | null = null;

export function createClient() {
  // Critical: Only create client in browser environment
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called on the client side');
  }
  
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  // Move auth state listener to AuthProvider instead of module scope
  return supabaseInstance;
}
```

### **Solution 4: Fix AuthProvider SSR Compatibility**

**File: `/src/features/auth/components/auth-provider.tsx`**

```typescript
export function AuthProvider({ children }: AuthProviderProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Don't create Supabase client or access browser APIs until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        session: null,
        user: null,
        loading: true,
        isAuthenticated: false,
        signIn: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        signOut: async () => {},
        refreshSession: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    );
  }
  
  // Rest of component logic only after mounting...
}
```

### **Solution 5: Add Comprehensive SSR Guards**

**Pattern for all components with browser APIs:**

```typescript
'use client'

import { useEffect, useState } from 'react';

export function ComponentWithBrowserAPI() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Early return for SSR
  if (!mounted) {
    return <div>Loading...</div>;
  }
  
  // Safe to use window, localStorage, etc. after this point
  const currentURL = window.location.href;
  
  return (
    <div suppressHydrationWarning>
      {/* Component content */}
    </div>
  );
}
```

## Implementation Priority

### **Phase 1: Critical Fixes (Deploy Immediately)**
1. Fix `login-form.tsx` window.location access
2. Fix `providers.tsx` import path
3. Add SSR guard to `page.tsx`

### **Phase 2: Infrastructure Fixes**
1. Refactor Supabase client for SSR compatibility
2. Update AuthProvider with proper mounting checks
3. Add SSR guards to all browser API usage

### **Phase 3: Validation**
1. Test SSR rendering
2. Verify hydration success
3. Confirm webpack errors resolved

## Verification Steps

```bash
# 1. Check for SSR errors
npm run build
npm run start

# 2. Test hydration in browser
# Open DevTools → Console
# Look for hydration warnings/errors

# 3. Verify import resolution
npm run type-check

# 4. Test auth flow
# Navigate to /login
# Check for webpack errors in console
```

## Error Prevention

### **Linting Rules**
```json
// .eslintrc.js
{
  "rules": {
    "no-restricted-globals": [
      "error",
      {
        "name": "window",
        "message": "Use typeof window !== 'undefined' check or useEffect hook"
      },
      {
        "name": "document",
        "message": "Use typeof document !== 'undefined' check or useEffect hook"
      }
    ]
  }
}
```

### **TypeScript Check**
```typescript
// types/ssr-utils.ts
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function safeWindow<T>(callback: () => T, fallback: T): T {
  return isBrowser() ? callback() : fallback;
}
```

## Monitoring

Add error tracking to detect similar issues:

```typescript
// utils/error-monitoring.ts
export function trackSSRViolation(component: string, api: string) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.error(`SSR Violation in ${component}: Accessing ${api} during SSR`);
  }
}
```

## Conclusion

The webpack factory call error is caused by a cascade of SSR violations, primarily:

1. **Direct browser API access during SSR** (window.location)
2. **Incorrect import paths** causing module resolution failures  
3. **Supabase client initialization during SSR**
4. **Missing SSR guards** throughout the application

The fixes must be implemented in the specified order to prevent the error cascade and ensure stable hydration. All browser API access must be guarded with proper SSR checks or moved to client-side useEffect hooks.

---

**Technical Analysis Completed:** January 2025  
**Severity:** Critical - Application Breaking  
**Estimated Fix Time:** 2-4 hours for critical fixes  
**Risk Level:** Low (straightforward SSR compatibility fixes)