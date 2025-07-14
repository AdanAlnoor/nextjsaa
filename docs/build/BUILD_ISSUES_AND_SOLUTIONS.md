# Build Issues and Solutions Guide

## Overview

This document provides a comprehensive analysis of challenges identified in the codebase and their corresponding solutions. Issues are categorized by severity and include specific remediation steps.

## Table of Contents

1. [Critical Issues (Application Breaking)](#critical-issues-application-breaking)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Low Priority Issues](#low-priority-issues)
5. [Setup and Development Workflow](#setup-and-development-workflow)
6. [Troubleshooting Flowchart](#troubleshooting-flowchart)
7. [Preventive Measures](#preventive-measures)

---

## Critical Issues (Application Breaking)

### 1. Webpack Factory Call Error & Hydration Failures

**Error Symptoms:**
```javascript
Uncaught TypeError: Cannot read properties of undefined (reading 'call')
at options.factory (webpack.js:716:31)

Warning: An error occurred during hydration. The server HTML was replaced with client content
```

**Root Cause:**
- Supabase client creation conflicts with Next.js 14 App Router SSR
- Browser-only APIs accessed during server-side rendering
- Hydration mismatches between server and client state

**Affected Files:**
- `src/app/page.tsx:5` - Supabase client import
- `src/shared/lib/supabase/client.ts` - Client creation logic

**Solution:**

1. **Fix Supabase Client Creation:**
```typescript
// src/shared/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

let client: any = null;

export function createClient() {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called on the client side');
  }
  
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    
    client = createBrowserClient(url, key);
  }
  
  return client;
}
```

2. **Fix Page Component Hydration:**
```typescript
// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Lazy load components that use browser APIs
const AuthChecker = dynamic(() => import('./components/AuthChecker'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <div>Loading...</div>
  }
  
  return <AuthChecker />
}
```

---

### 2. Import Path Inconsistencies

**Error Symptoms:**
```
Module not found: Can't resolve '@/utils/supabase/client'
Cannot find module '@/types/supabase'
```

**Root Cause:**
- Outdated import paths in legacy files
- Missing type definition files
- Inconsistent path aliases

**Affected Files:**
- `src/services/estimateLibraryWorkflow.ts` - Uses `@/utils/supabase/client`
- Various test files - Mock non-existent paths

**Solution:**

1. **Update Import Paths:**
```bash
# Find and replace incorrect imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|@/utils/supabase|@/shared/lib/supabase|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|@/types/supabase|@/shared/types/supabase|g'
```

2. **Create Missing Type Files:**
```typescript
// src/types/supabase.ts (if needed)
export * from '@/shared/types/supabase'
```

3. **Update Jest Configuration:**
```javascript
// jest.config.js
moduleNameMapping: {
  '^@/utils/supabase/(.*)$': '<rootDir>/src/shared/lib/supabase/$1',
  '^@/types/supabase$': '<rootDir>/src/shared/types/supabase',
}
```

---

## High Priority Issues

### 3. Environment Configuration Gaps

**Issue:** Missing or incomplete environment variables causing runtime failures.

**Required Variables:**
```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# For production
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Solution:**
1. Copy `.env.example` to `.env.local`
2. Fill in all required values
3. Validate environment in startup script:

```typescript
// src/lib/env-validation.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

---

### 4. Database Migration Complexity

**Issue:** Extensive migration history with potential conflicts and dependencies.

**Identified Challenges:**
- 40+ migration files with complex interdependencies
- Manual migrations mixed with automated ones
- Potential rollback complications

**Solution:**

1. **Migration Validation Script:**
```bash
#!/bin/bash
# scripts/validate-migrations.sh
echo "Validating migration order..."
npx supabase db diff --check
npx supabase migration list
```

2. **Safe Migration Process:**
```bash
# 1. Backup current state
npx supabase db dump --data-only > backup.sql

# 2. Apply migrations in order
npx supabase migration up

# 3. Verify schema integrity
npm run db:verify
```

3. **Migration Dependencies Documentation:**
```markdown
## Critical Migration Dependencies

1. `20240320000000_create_projects_table.sql` - Foundation table
2. `20240407000000_create_role_tables.sql` - Required for auth
3. `20250711110000_library_integration_combined.sql` - Core library system
```

---

## Medium Priority Issues

### 5. TypeScript Configuration Issues

**Issue:** Type import inconsistencies and missing definitions.

**Problems:**
- Multiple type definition locations
- Inconsistent Database type imports
- Missing type exports

**Solution:**

1. **Centralize Type Definitions:**
```typescript
// src/shared/types/index.ts
export * from './supabase'
export * from './supabase-schema'
export * from './auth'
export * from './estimate'
```

2. **Update tsconfig.json paths:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/shared/*"],
      "@features/*": ["./src/features/*"],
      "@types/*": ["./src/shared/types/*"]
    }
  }
}
```

---

### 6. Testing Configuration Problems

**Issue:** Jest and Playwright setup issues preventing proper testing.

**Problems:**
- Mock paths reference non-existent files
- Test environment configuration conflicts
- E2E test setup dependencies

**Solution:**

1. **Fix Jest Mocks:**
```javascript
// src/test/__mocks__/supabase.js
export const createClient = jest.fn(() => ({
  auth: {
    getSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn()
  }
}));
```

2. **Update Test Setup:**
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { validateEnvironment } from '@/lib/env-validation'

// Mock environment for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
```

---

### 7. Build Process Complications

**Issue:** Complex build scripts and dependency conflicts.

**Problems:**
- Webpack configuration conflicts
- Module resolution issues
- Build timeout problems

**Solution:**

1. **Optimize Next.js Configuration:**
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@tanstack/react-query'
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      }
    }
    return config
  }
}
```

2. **Add Build Verification:**
```bash
#!/bin/bash
# scripts/build-check.sh
echo "Running pre-build checks..."
npm run type-check
npm run lint
npm run test:ci
npm run build
```

---

## Low Priority Issues

### 8. Performance Concerns

**Issue:** Unoptimized imports and potential memory leaks.

**Solution:**
1. Implement dynamic imports for large components
2. Add React.memo for expensive components
3. Optimize Supabase query patterns

### 9. Documentation Gaps

**Issue:** Missing setup instructions and outdated guides.

**Solution:**
1. Create comprehensive setup guide
2. Update existing documentation
3. Add troubleshooting sections

---

## Setup and Development Workflow

### Initial Setup Checklist

1. **Environment Setup:**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd nextjsaa
   
   # Install dependencies
   npm install
   
   # Setup environment
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Database Setup:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Start local Supabase
   npx supabase start
   
   # Apply migrations
   npx supabase migration up
   ```

3. **Development Server:**
   ```bash
   # Start development server
   npm run dev
   
   # In another terminal, run tests
   npm run test:watch
   ```

### Development Commands

```bash
# Core development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Generate coverage report

# Database
npm run supabase:start  # Start local Supabase
npm run supabase:push   # Push schema changes
npm run supabase:diff   # Check for differences

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks
```

---

## Troubleshooting Flowchart

```
Application Won't Start?
├── Environment Variables Set? ──NO──→ Copy .env.example to .env.local
│   └── YES
├── Dependencies Installed? ──NO──→ Run npm install
│   └── YES
├── Supabase Running? ──NO──→ Run npx supabase start
│   └── YES
├── Build Errors? ──YES──→ Check TypeScript and imports
│   └── NO
├── Runtime Errors? ──YES──→ Check browser console for specific errors
│   └── NO
└── Application should be working ✓

Specific Error Types:
├── "Cannot read properties of undefined (reading 'call')"
│   └── Solution: Fix Supabase client SSR issues
├── "Module not found"
│   └── Solution: Update import paths
├── "Hydration failed"
│   └── Solution: Fix server/client state mismatches
└── "Environment variable missing"
    └── Solution: Update .env.local file
```

---

## Preventive Measures

### 1. Code Quality Gates

```bash
# Pre-commit hooks (package.json)
"husky": {
  "hooks": {
    "pre-commit": "npm run type-check && npm run lint && npm run test"
  }
}
```

### 2. CI/CD Pipeline Checks

```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run type-check
- name: Lint
  run: npm run lint
- name: Unit Tests
  run: npm run test:ci
- name: Build
  run: npm run build
```

### 3. Environment Validation

```typescript
// Startup validation
validateEnvironment();
validateDatabase();
validateConfiguration();
```

### 4. Regular Maintenance

- Weekly dependency updates
- Monthly migration cleanup
- Quarterly architecture review
- Continuous monitoring setup

---

## Quick Fix Commands

```bash
# Fix most common issues
npm run fix:imports     # Fix import paths
npm run fix:types      # Regenerate types
npm run fix:env        # Validate environment
npm run fix:db         # Reset database

# Emergency reset
npm run reset:all      # Clean install + reset DB
```

---

## Support and Resources

- **Setup Issues:** Refer to `docs/database/MANUAL_SUPABASE_CLI_SETUP.md`
- **Deployment:** Check `docs/DEPLOYMENT_CHECKLIST.md`
- **Library Integration:** See `docs/LIBRARY_INTEGRATION_MIGRATION_GUIDE.md`

---

*Last Updated: January 2025*
*Version: 1.0*