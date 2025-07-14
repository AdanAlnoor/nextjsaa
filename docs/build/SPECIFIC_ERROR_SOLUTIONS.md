# Specific Error Solutions: Stack Trace Analysis & Fixes

## Overview

This document provides detailed solutions for the specific error stack traces you're experiencing. Each error is analyzed individually with exact code fixes and implementation steps.

---

## Error 1: Hydration Warning

### **Error Message:**
```
hook.js:608 Warning: An error occurred during hydration. The server HTML was replaced with client content in <#document>.
```

### **Root Cause Analysis:**
- **Location**: React's hydration process in the document root
- **Cause**: Server-rendered HTML doesn't match client-rendered HTML
- **Trigger**: Supabase client import on `page.tsx:5` executing during SSR

### **Exact Code Location:**
```typescript
// src/app/page.tsx:5
import { createClient } from '@/shared/lib/supabase/client'
```

### **Why This Causes Hydration Issues:**
1. Server renders page without Supabase client
2. Client renders page with Supabase client initialization
3. Different DOM states → Hydration mismatch
4. React replaces entire document content

### **Solution 1: Lazy Client Loading**

**Replace the direct import with dynamic loading:**

```typescript
// src/app/page.tsx - BEFORE (Problematic)
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client' // ← CAUSES HYDRATION ERROR
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  // Component logic...
}
```

```typescript
// src/app/page.tsx - AFTER (Fixed)
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    // Only import and create client after component mounts
    async function initializeSupabase() {
      const { createClient } = await import('@/shared/lib/supabase/client')
      setSupabase(createClient())
      setMounted(true)
    }
    
    initializeSupabase()
  }, [])
  
  // Render loading state until client is ready
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div>Loading...</div>
      </div>
    )
  }
  
  // Rest of component logic using supabase variable
}
```

---

## Error 2: Webpack Factory Call Error

### **Error Message:**
```
react-server-dom-webpack-client.browser.development.js:951 Uncaught TypeError: Cannot read properties of undefined (reading 'call')
    at options.factory (webpack.js:716:31)
    at eval (page.tsx:5:79)
```

### **Root Cause Analysis:**
- **Location**: Webpack module factory at `page.tsx:5:79`
- **Cause**: Supabase client module fails to load during SSR
- **Issue**: Module factory receives undefined instead of module definition

### **Stack Trace Breakdown:**
```
webpack.js:716:31 → options.factory (undefined.call)
↓
eval (page.tsx:5:79) → Supabase client import
↓  
__webpack_require__ → Module loading system
↓
requireModule → React Server Components
```

### **Solution 2: SSR-Safe Module Pattern**

**Create a wrapper that handles SSR gracefully:**

```typescript
// src/lib/supabase-wrapper.ts - NEW FILE
'use client'

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/shared/types/supabase'

let clientInstance: SupabaseClient<Database> | null = null

export async function getSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  // Only load in browser environment
  if (typeof window === 'undefined') {
    return null
  }
  
  // Return cached instance if available
  if (clientInstance) {
    return clientInstance
  }
  
  try {
    // Dynamic import to avoid SSR issues
    const { createClient } = await import('@/shared/lib/supabase/client')
    clientInstance = createClient()
    return clientInstance
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
    return null
  }
}
```

**Update page.tsx to use the wrapper:**

```typescript
// src/app/page.tsx - Updated with wrapper
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-wrapper'

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    async function checkAuth() {
      setMounted(true)
      
      const supabase = await getSupabaseClient()
      if (!supabase) {
        setIsAuthenticated(false)
        return
      }
      
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error checking session:', error)
          setIsAuthenticated(false)
          return
        }
        
        if (data.session) {
          setIsAuthenticated(true)
          setTimeout(() => router.push('/projects'), 2000)
        } else {
          setIsAuthenticated(false)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  // Show loading until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div>Loading page...</div>
      </div>
    )
  }
  
  // Rest of component...
}
```

---

## Error 3: React Hydration Failure

### **Error Message:**
```
react-dom.development.js:14381 Uncaught Error: There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.
```

### **Root Cause Analysis:**
- **Location**: React DOM hydration process
- **Cause**: No Suspense boundary to catch async loading errors
- **Effect**: React abandons SSR and switches to client-only rendering

### **Solution 3: Add Proper Error Boundaries**

**Create a specialized hydration error boundary:**

```typescript
// src/components/HydrationErrorBoundary.tsx - NEW FILE
'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): State {
    // Check if this is a hydration-related error
    const isHydrationError = 
      error.message?.includes('hydration') ||
      error.message?.includes('server HTML') ||
      error.stack?.includes('hydration')
    
    if (isHydrationError) {
      console.warn('Hydration error caught by boundary:', error)
      return { hasError: true, error }
    }
    
    // Re-throw non-hydration errors
    throw error
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Hydration error details:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading Application</h2>
            <p className="text-gray-600">Initializing client-side rendering...</p>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

**Update the root layout to use the boundary:**

```typescript
// src/app/layout.tsx - Add error boundary
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Providers } from "./providers";
import { HydrationErrorBoundary } from "@/components/HydrationErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <HydrationErrorBoundary>
          <Providers>
            <Suspense fallback={<div>Loading Root...</div>}>
              {children}
            </Suspense>
          </Providers>
        </HydrationErrorBoundary>
      </body>
    </html>
  );
}
```

---

## Error 4: Repeated Factory Call Errors

### **Error Message:**
```
react-dom.development.js:22308 Uncaught TypeError: Cannot read properties of undefined (reading 'call')
    at options.factory (webpack.js:716:31)
    [Same stack trace repeats]
```

### **Root Cause Analysis:**
- **Location**: Same webpack factory call repeating
- **Cause**: Error recovery loop - React keeps trying to load the same failing module
- **Effect**: Infinite error cycle

### **Solution 4: Module Loading Stability**

**Fix the Supabase client to prevent module loading failures:**

```typescript
// src/shared/lib/supabase/client.ts - COMPLETE REWRITE
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/shared/types/supabase";

// Singleton instance - but only created in browser
let supabaseInstance: SupabaseClient<Database> | null = null;
let isInitializing = false;

export function createClient(): SupabaseClient<Database> {
  // CRITICAL: Throw meaningful error for SSR
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be created in browser environment. Use dynamic import or useEffect.');
  }
  
  // Return existing instance
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    throw new Error('Supabase client is already initializing. Please wait.');
  }
  
  isInitializing = true;
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing required Supabase environment variables");
    }
    
    // Create client with minimal configuration to avoid SSR issues
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false // Disable URL detection during initialization
      }
    });
    
    // Set up auth listener only after successful creation
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, "Session exists:", !!session);
    });
    
    isInitializing = false;
    return supabaseInstance;
    
  } catch (error) {
    isInitializing = false;
    console.error("Error creating Supabase client:", error);
    throw error;
  }
}

// Export a safe version that can be called during SSR
export function createClientSafe(): SupabaseClient<Database> | null {
  try {
    return createClient();
  } catch (error) {
    if (typeof window === 'undefined') {
      // Expected during SSR
      return null;
    }
    // Re-throw actual errors
    throw error;
  }
}
```

---

## Implementation Order & Testing

### **Phase 1: Immediate Fixes (Deploy First)**

1. **Fix page.tsx import (Critical)**
   ```bash
   # Test the page loads without webpack errors
   npm run dev
   # Visit http://localhost:3000
   # Check browser console for factory call errors
   ```

2. **Add Hydration Error Boundary**
   ```bash
   # Test error boundary catches hydration issues
   # Should see graceful fallback instead of crashes
   ```

### **Phase 2: Infrastructure Updates**

3. **Update Supabase client for SSR safety**
   ```bash
   # Test server-side rendering
   npm run build
   npm run start
   # Check for SSR errors in terminal
   ```

4. **Add wrapper pattern for safe loading**
   ```bash
   # Test authentication flow works
   # Verify no module loading errors
   ```

### **Phase 3: Verification**

```bash
# Complete test sequence
npm run build          # Should complete without errors
npm run start          # Should start without SSR errors
npm run type-check     # Should pass type checking

# Browser testing
# 1. Visit http://localhost:3000
# 2. Open DevTools → Console
# 3. Should see no hydration warnings
# 4. Should see no webpack factory errors
# 5. Authentication flow should work
```

---

## Error Prevention

### **ESLint Rules to Prevent Future Issues**

```json
// .eslintrc.js - Add these rules
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/supabase/client"],
            "message": "Import Supabase client dynamically or use getSupabaseClient wrapper to avoid SSR issues"
          }
        ]
      }
    ]
  }
}
```

### **TypeScript Strict Checks**

```typescript
// src/types/ssr-safe.ts
export type SSRSafeComponent<T = {}> = (props: T) => JSX.Element | null;

// Utility type to enforce SSR-safe patterns
export type ClientOnlyHook<T> = () => T | null;
```

---

## Rollback Plan

If any issues occur during implementation:

1. **Revert page.tsx to original state**
2. **Remove HydrationErrorBoundary temporarily**
3. **Use original Supabase client import**
4. **Deploy minimal fix first, then iterate**

---

## Success Criteria

✅ **No hydration warnings in browser console**  
✅ **No webpack factory call errors**  
✅ **Page loads successfully on first visit**  
✅ **Authentication flow works without errors**  
✅ **SSR and client rendering produce same result**  

---

**Created:** January 2025  
**Priority:** Critical - Application Breaking  
**Estimated Fix Time:** 1-2 hours for all solutions