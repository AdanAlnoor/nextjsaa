# Phase 6: Production Deployment

## Student-Friendly Overview 📚

**What We're Building:** The final step - getting your app live and keeping it healthy. Like moving from building a house to making it livable with utilities, security, and maintenance.

**Think of it like:**
- **Development**: Building the house
- **Testing**: Inspection and quality checks
- **Deployment**: Moving in, connecting utilities, security system
- **Monitoring**: Home security cameras and smoke detectors

**Duration**: 3 days  
**Priority**: MEDIUM  
**Prerequisites**: All features built and tested (Phases 1-5)

## What Problem Does This Solve? 🤔

### Current Deployment Nightmares
1. **Manual Deploy Hell**: Copy files, update database, pray nothing breaks
2. **3 AM Fire Drills**: Site down, nobody knows why
3. **Slow Performance**: Users complain, but where's the bottleneck?
4. **Security Scares**: "Were we hacked? Who knows!"
5. **Lost Data**: "The backup? What backup?"

### Professional Deployment Solution
1. **One-Click Deploy**: Push button, coffee break, done
2. **24/7 Monitoring**: Problems detected before users notice
3. **Performance Tracking**: Know exactly what's slow
4. **Security Fortress**: Multiple layers of protection
5. **Disaster Recovery**: Backups + tested restore procedures

## How Will We Know It Works? ✅

### Test Scenario 1: Automated Deployment
```bash
# What happens:
1. Developer merges to main branch
2. Tests run automatically (5 min)
3. Build created (2 min)
4. Deployed to staging (1 min)
5. Smoke tests verify staging (2 min)
6. One-click promote to production
7. Users see new features instantly

# How to verify:
- No manual steps required
- Deployment log shows all green
- New features visible to users
- Zero downtime during deploy
```

### Test Scenario 2: Problem Detection
```bash
# What happens:
1. Memory leak starts at 2 AM
2. Monitor detects increasing memory
3. Alert sent to on-call engineer
4. Auto-scaling adds more servers
5. Engineer fixes issue in morning
6. Users never noticed problem

# How to verify:
- Check monitoring dashboard
- Review alert history
- Verify auto-scaling worked
- No user complaints
```

### Test Scenario 3: Disaster Recovery
```bash
# What happens:
1. Database corruption detected
2. System switches to read-only
3. Restore from 1-hour-old backup
4. Verify data integrity
5. Resume normal operations
6. Total downtime: 15 minutes

# How to verify:
- Run disaster recovery drill
- Time the restore process
- Verify no data loss
- Document lessons learned

## What Gets Built - Component by Component 🔨

### 1. CI/CD Pipeline
**What:** Automated path from code to production
**Like:** Assembly line for software

```
GitHub Actions Pipeline:
━━━━━━━━━━━━━━━━━━━━━━
[Code Push] → [Build & Test] → [Deploy]

1. Code Quality Check (2 min)
   ✓ Linting
   ✓ Type checking
   ✓ Security scan

2. Test Suite (8 min)
   ✓ Unit tests: 245/245
   ✓ Integration: 49/49
   ✓ E2E tests: 12/12

3. Build Process (3 min)
   ✓ Optimize code
   ✓ Bundle assets
   ✓ Generate types

4. Deploy Staging (2 min)
   ✓ Update Vercel preview
   ✓ Run smoke tests
   ✓ Check performance

5. Production Gate
   ⏸️ Awaiting approval...
   [Approve] [Reject]
```

### 2. Monitoring Dashboard
**What:** Real-time health monitoring
**Like:** Hospital monitors for your app

```
System Health Dashboard
━━━━━━━━━━━━━━━━━━━━━
🟢 All Systems Operational

Performance:
├─ Response Time: 45ms avg
├─ Error Rate: 0.02%
├─ Uptime: 99.98%
└─ Active Users: 324

Resources:
├─ CPU: ▓▓▓░░░░░ 38%
├─ Memory: ▓▓▓▓░░░ 52%
├─ Database: ▓▓░░░░░ 28%
└─ Storage: ▓▓▓▓▓░░ 71%

Recent Alerts:
⚠️ High traffic spike (handled)
✓ Backup completed successfully
ℹ️ New deployment live

[View Details] [Alert Settings]
```

### 3. Security Layers
**What:** Multiple protection levels
**Like:** Bank vault security system

```
Security Configuration:
━━━━━━━━━━━━━━━━━━━━
1. Network Level
   ✓ CloudFlare DDoS protection
   ✓ Rate limiting (60 req/min)
   ✓ Geographic restrictions

2. Application Level
   ✓ CSRF tokens
   ✓ XSS protection
   ✓ SQL injection prevention
   ✓ Input sanitization

3. Data Level
   ✓ Encryption at rest
   ✓ Encryption in transit
   ✓ Row-level security
   ✓ API key rotation

4. Access Control
   ✓ Multi-factor auth
   ✓ Role-based permissions
   ✓ Session management
   ✓ Audit logging
```

### 4. Backup System
**What:** Automated data protection
**Like:** Time machine for your data

```
Backup Schedule:
━━━━━━━━━━━━━━━
Continuous:
└─ Database replication (real-time)

Hourly:
└─ Incremental database backup

Daily:
├─ Full database backup
├─ File storage backup
└─ Configuration backup

Weekly:
└─ Off-site backup transfer

Monthly:
└─ Backup restore test

Retention:
├─ Hourly: Keep 24
├─ Daily: Keep 30
├─ Weekly: Keep 12
└─ Monthly: Keep 12
```

### 5. Performance Optimization
**What:** Speed improvements and caching
**Like:** Turbo boost for your app

```
Optimization Stack:
━━━━━━━━━━━━━━━━━
1. CDN (CloudFlare)
   ├─ Static assets cached globally
   ├─ Image optimization
   └─ Compression enabled

2. Database (Supabase)
   ├─ Connection pooling
   ├─ Query optimization
   ├─ Indexed searches
   └─ Materialized views

3. Application (Vercel)
   ├─ Edge functions
   ├─ ISR caching
   ├─ API route caching
   └─ Bundle splitting

4. Client (Browser)
   ├─ Service worker
   ├─ Local storage cache
   ├─ Lazy loading
   └─ Code splitting
```

## Step-by-Step: Deployment Process 📝

### Initial Production Setup
```bash
1. Configure Environments
   - Create production Supabase project
   - Set up Vercel project
   - Configure domain names
   - Set environment variables

2. Security Hardening
   - Enable 2FA for all services
   - Set up API rate limiting
   - Configure CORS policies
   - Enable audit logging

3. Monitoring Setup
   - Install Sentry for errors
   - Configure Vercel Analytics
   - Set up uptime monitoring
   - Create alert rules

4. Backup Configuration
   - Enable Supabase backups
   - Set retention policies
   - Test restore procedure
   - Document recovery steps
```

### Daily Deployment Flow
```
Morning Deploy Checklist:
━━━━━━━━━━━━━━━━━━━━━━━
□ Review overnight alerts
□ Check system health
□ Review PR changes
□ Verify test results
□ Deploy to staging
□ Run acceptance tests
□ Get approval
□ Deploy to production
□ Monitor for 30 min
□ Update team

Automated by CI/CD ↓

Developer Experience:
1. git push origin main
2. Watch GitHub Actions
3. Preview on staging
4. Click "Deploy to Prod"
5. Done! ✓
```

## How to Test Everything Works 🧪

### Deployment Verification
```bash
# Pre-deployment checks
npm run build          # Should complete without errors
npm run test:all       # All tests must pass
npm run lighthouse     # Performance score >90

# Post-deployment checks
curl https://api.yourapp.com/health  # Should return 200 OK
npm run test:smoke                   # Critical paths work
npm run test:performance             # No regression
```

### Monitoring Verification
```typescript
// Test alert system
async function testAlerts() {
  // Trigger test alert
  await triggerAlert('test', {
    message: 'Testing alert system',
    severity: 'info'
  });
  
  // Verify received
  const alert = await checkAlertReceived();
  assert(alert.received === true);
}

// Test auto-scaling
async function testScaling() {
  // Generate load
  await generateTraffic(1000); // requests/second
  
  // Check scaling
  const instances = await getInstanceCount();
  assert(instances > 1);
}
```

### Disaster Recovery Drill
```
Monthly DR Test:
━━━━━━━━━━━━━━━
1. Announce test window
2. Switch to read-only mode
3. Backup current state
4. Simulate failure
5. Execute recovery:
   - Restore database
   - Verify data integrity
   - Switch DNS
   - Test functionality
6. Document results
7. Update runbook

Target: <30 min recovery
```

## Common Issues and Solutions 🔧

### Issue: "Deploy failed in production"
**Solution:**
```bash
# Immediate rollback
vercel rollback

# Or using Git
git revert HEAD
git push origin main

# Investigation
- Check deploy logs
- Review error tracking
- Test on staging first
```

### Issue: "Site slow after deploy"
**Check:**
1. New unoptimized queries?
2. Missing database indexes?
3. Large bundle size increase?
4. Memory leaks in new code?

### Issue: "Users report errors"
**Response:**
1. Check Sentry for error details
2. Reproduce in staging
3. Deploy hotfix if critical
4. Post-mortem after fix

## Success Metrics 📊

Phase 6 is successful when:
1. **Deployment**: <10 min from commit to production
2. **Uptime**: 99.9% availability (43 min/month max downtime)
3. **Performance**: <100ms API response time (p95)
4. **Security**: Zero security incidents
5. **Recovery**: <30 min to restore from backup
6. **Monitoring**: Problems detected before users report

## Business Requirements

- Zero-downtime deployments
- Automated deployment pipeline
- Real-time monitoring and alerting
- Backup and disaster recovery
- Performance optimization
- Security compliance

## Technical Implementation

### Step 1: Environment Configuration

#### 1.1 Environment Variables Setup

**File**: `.env.production.example`

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_ENVIRONMENT=production

# Security
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Performance
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION=true

# Feature Flags
NEXT_PUBLIC_FEATURE_LIBRARY_V2=true
NEXT_PUBLIC_FEATURE_BULK_OPERATIONS=true
NEXT_PUBLIC_FEATURE_ADVANCED_FILTERS=true

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST=100

# Background Jobs
EDGE_FUNCTION_SECRET=your-edge-function-secret
CRON_SECRET=your-cron-secret

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.yourdomain.com
OTEL_SERVICE_NAME=library-estimate-integration
OTEL_TRACES_EXPORTER=otlp
```

#### 1.2 Production Configuration

**File**: `config/production.ts`

```typescript
export const productionConfig = {
  // Database
  database: {
    maxConnections: 100,
    connectionTimeout: 30000,
    statementTimeout: 60000,
    idleTimeout: 300000,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA_CERT,
    },
  },

  // Caching
  cache: {
    defaultTTL: 3600, // 1 hour
    maxSize: 500, // MB
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production',
    },
  },

  // Security
  security: {
    corsOrigins: [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      'https://api.yourdomain.com',
    ],
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://analytics.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      },
    },
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      max: 60, // requests per window
    },
  },

  // Performance
  performance: {
    enableCompression: true,
    enableCaching: true,
    cdnUrl: process.env.CDN_URL,
    imageOptimization: {
      quality: 85,
      formats: ['webp', 'avif'],
      sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    },
  },

  // Monitoring
  monitoring: {
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: 'production',
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
    },
    analytics: {
      googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
      enabledEvents: ['page_view', 'library_item_select', 'estimate_create'],
    },
  },
};
```

### Step 2: CI/CD Pipeline

#### 2.1 GitHub Actions Deployment Workflow

**File**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '18'
  NEXT_TELEMETRY_DISABLED: 1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.PRODUCTION_URL }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: |
            .next/
            public/
            package.json
            package-lock.json
            next.config.js

  security-scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --production
      
      - name: Run OWASP dependency check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'library-estimate-integration'
          path: '.'
          format: 'HTML'
      
      - name: Upload security reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: reports/

  deploy:
    needs: [build, security-scan]
    runs-on: ubuntu-latest
    environment:
      name: production
      url: ${{ secrets.PRODUCTION_URL }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      - name: Deploy Edge Functions
        run: |
          npx supabase functions deploy aggregate-library-popularity \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          npx supabase functions deploy capture-price-snapshots \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Run database migrations
        run: |
          npx supabase db push \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Invalidate CDN cache
        run: |
          curl -X POST https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"purge_everything":true}'
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  smoke-tests:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Wait for deployment
        run: sleep 30
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          SMOKE_TEST_URL: ${{ secrets.PRODUCTION_URL }}
      
      - name: Check health endpoints
        run: |
          curl -f ${{ secrets.PRODUCTION_URL }}/api/health
          curl -f ${{ secrets.PRODUCTION_URL }}/api/health/db
          curl -f ${{ secrets.PRODUCTION_URL }}/api/health/cache

  rollback:
    needs: smoke-tests
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Rollback deployment
        run: |
          echo "Rolling back to previous version"
          # Implement rollback logic here
      
      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: 'failure'
          text: 'Production deployment failed - rolling back'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Step 3: Monitoring and Observability

#### 3.1 Application Performance Monitoring

**File**: `src/lib/monitoring/apm.ts`

```typescript
import * as Sentry from '@sentry/nextjs';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Initialize Sentry
export function initializeSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    integrations: [
      new Sentry.BrowserTracing({
        tracingOrigins: ['localhost', /^https:\/\/yourapp\.com/],
        routingInstrumentation: Sentry.nextRouterInstrumentation,
      }),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

// Custom tracer for library operations
const tracer = trace.getTracer('library-estimate-integration', '1.0.0');

export function traceLibraryOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Performance metrics collection
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Send to monitoring service
    this.sendMetric(name, value);
  }

  private sendMetric(name: string, value: number) {
    // Send to your metrics collection service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'timing_complete', {
        name,
        value: Math.round(value),
        event_category: 'Performance',
      });
    }
    
    // Also send to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${value}ms`,
      level: 'info',
      data: { metric: name, value },
    });
  }

  getAverageMetric(name: string): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
}

// Error boundary wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error }>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <Sentry.ErrorBoundary
        fallback={fallback || DefaultErrorFallback}
        showDialog
      >
        <Component {...props} />
      </Sentry.ErrorBoundary>
    );
  };
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error-boundary-fallback">
      <h2>Something went wrong</h2>
      <details style={{ whiteSpace: 'pre-wrap' }}>
        {error.toString()}
      </details>
    </div>
  );
}
```

#### 3.2 Custom Monitoring Dashboard

**File**: `src/app/api/monitoring/metrics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';
import { PerformanceMonitor } from '@/lib/monitoring/apm';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const monitor = PerformanceMonitor.getInstance();

  try {
    // Collect various metrics
    const [dbStats, cacheStats, appMetrics] = await Promise.all([
      getDatabaseStats(supabase),
      getCacheStats(),
      getApplicationMetrics(monitor),
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      database: dbStats,
      cache: cacheStats,
      application: appMetrics,
      system: getSystemMetrics(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}

async function getDatabaseStats(supabase: any) {
  const { data: connections } = await supabase.rpc('get_db_connections');
  const { data: slowQueries } = await supabase.rpc('get_slow_queries');
  
  return {
    activeConnections: connections?.active || 0,
    idleConnections: connections?.idle || 0,
    slowQueries: slowQueries?.length || 0,
    avgQueryTime: slowQueries?.reduce((sum: number, q: any) => 
      sum + q.duration, 0) / (slowQueries?.length || 1),
  };
}

async function getCacheStats() {
  // Implementation depends on your cache solution
  return {
    hitRate: 0.85,
    missRate: 0.15,
    evictions: 42,
    memoryUsage: '256MB',
  };
}

function getApplicationMetrics(monitor: PerformanceMonitor) {
  return {
    librarySearchAvg: monitor.getAverageMetric('library_search'),
    factorCalculationAvg: monitor.getAverageMetric('factor_calculation'),
    estimateCreationAvg: monitor.getAverageMetric('estimate_creation'),
    apiResponseTimeAvg: monitor.getAverageMetric('api_response_time'),
  };
}

function getSystemMetrics() {
  const usage = process.memoryUsage();
  return {
    memoryUsage: {
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    },
    uptime: process.uptime(),
    nodeVersion: process.version,
  };
}
```

### Step 4: Security Hardening

#### 4.1 Security Middleware

**File**: `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

// Rate limiting setup
const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(60, '1 m'),
});

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\n/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', cspHeader);

  // API rate limiting
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_${ip}`
    );

    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: response.headers,
      });
    }
  }

  // CSRF protection for mutations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const token = request.headers.get('X-CSRF-Token');
    const sessionToken = request.cookies.get('csrf-token')?.value;

    if (!token || !sessionToken || token !== sessionToken) {
      return new NextResponse('Invalid CSRF token', {
        status: 403,
        headers: response.headers,
      });
    }
  }

  // Request ID for tracing
  const requestId = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 16);
  
  response.headers.set('X-Request-ID', requestId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### 4.2 API Security

**File**: `src/lib/security/api-security.ts`

```typescript
import { createHmac, randomBytes } from 'crypto';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Input validation schemas
export const libraryItemSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1).max(10),
  assembly_id: z.string().uuid(),
  keywords: z.array(z.string().max(50)).max(10).optional(),
});

export const factorSchema = z.object({
  item_id: z.string().min(1).max(20),
  quantity: z.number().positive().max(10000),
});

export const estimateItemSchema = z.object({
  libraryItemId: z.string().uuid(),
  quantity: z.number().positive().max(1000000),
  location: z.string().max(200).optional(),
});

// Sanitize user input
export function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// Generate secure tokens
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

// Create HMAC signature for webhooks
export function createWebhookSignature(
  payload: string,
  secret: string
): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createWebhookSignature(payload, secret);
  return signature === expectedSignature;
}

// SQL injection prevention
export function escapeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error('Invalid SQL identifier');
  }
  return `"${identifier}"`;
}

// API key validation
export async function validateApiKey(
  apiKey: string,
  requiredScopes: string[] = []
): Promise<boolean> {
  // Hash the API key for comparison
  const hashedKey = createHmac('sha256', process.env.API_KEY_SECRET!)
    .update(apiKey)
    .digest('hex');

  // Check against stored keys in database
  const { data: keyData } = await supabase
    .from('api_keys')
    .select('scopes, expires_at')
    .eq('key_hash', hashedKey)
    .single();

  if (!keyData) return false;

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return false;
  }

  // Check required scopes
  const keyScopes = keyData.scopes || [];
  return requiredScopes.every(scope => keyScopes.includes(scope));
}

// Audit logging
export async function auditLog(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, any>
) {
  const { error } = await supabase.from('audit_logs').insert({
    action,
    user_id: userId,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
    ip_address: getClientIp(),
    user_agent: getUserAgent(),
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to create audit log:', error);
  }
}
```

### Step 5: Database Optimization

#### 5.1 Performance Indexes

**File**: `supabase/migrations/20240315_performance_indexes.sql`

```sql
-- Performance indexes for library operations

-- Library items search optimization
CREATE INDEX IF NOT EXISTS idx_library_items_search 
ON library_items USING gin(
  to_tsvector('english', coalesce(code, '') || ' ' || coalesce(name, '') || ' ' || coalesce(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_library_items_status_active 
ON library_items(status, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_library_items_assembly 
ON library_items(assembly_id) 
INCLUDE (code, name, unit);

-- Factor queries optimization
CREATE INDEX IF NOT EXISTS idx_materials_library_item 
ON materials(library_item_id) 
INCLUDE (item_id, quantity);

CREATE INDEX IF NOT EXISTS idx_labour_library_item 
ON labour(library_item_id) 
INCLUDE (item_id, quantity);

CREATE INDEX IF NOT EXISTS idx_equipment_library_item 
ON equipment(library_item_id) 
INCLUDE (item_id, quantity);

-- Estimate calculations optimization
CREATE INDEX IF NOT EXISTS idx_estimate_items_project 
ON estimate_items(project_id, element_id) 
INCLUDE (library_item_id, quantity);

-- Project rates lookup
CREATE INDEX IF NOT EXISTS idx_project_rates_effective 
ON project_rates(project_id, effective_date DESC) 
WHERE expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP;

-- Popularity tracking
CREATE INDEX IF NOT EXISTS idx_library_usage_date 
ON estimate_library_usage(created_at DESC, library_item_id);

-- Audit trail
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource_type, resource_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(user_id, timestamp DESC);

-- Materialized view for popular items
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_library_items AS
SELECT 
  li.id,
  li.code,
  li.name,
  li.unit,
  li.assembly_id,
  COUNT(DISTINCT elu.estimate_id) as usage_count,
  COUNT(DISTINCT elu.project_id) as project_count,
  MAX(elu.created_at) as last_used_at
FROM library_items li
LEFT JOIN estimate_library_usage elu ON li.id = elu.library_item_id
WHERE li.is_active = true
  AND li.status = 'confirmed'
GROUP BY li.id, li.code, li.name, li.unit, li.assembly_id;

CREATE UNIQUE INDEX idx_mv_popular_items_id ON mv_popular_library_items(id);
CREATE INDEX idx_mv_popular_items_usage ON mv_popular_library_items(usage_count DESC);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_popular_items_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_library_items;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh via pg_cron (if available)
-- SELECT cron.schedule('refresh-popular-items', '0 */6 * * *', 'SELECT refresh_popular_items_mv();');
```

#### 5.2 Database Connection Pooling

**File**: `src/lib/database/connection-pool.ts`

```typescript
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { performance } from 'perf_hooks';

// Connection pool configuration
const poolConfig = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  statement_timeout: 60000, // 60 seconds statement timeout
  query_timeout: 60000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DATABASE_CA_CERT,
  } : undefined,
};

// Create connection pool
const pool = new Pool(poolConfig);

// Monitor pool events
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', (client) => {
  client.query('SET statement_timeout = 60000'); // 60 seconds
});

// Query with automatic retries and monitoring
export async function query<T>(
  text: string,
  params?: any[],
  retries = 3
): Promise<T[]> {
  const start = performance.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      const duration = performance.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn('Slow query detected:', {
          query: text.substring(0, 100),
          duration,
          rows: result.rowCount,
        });
      }
      
      return result.rows;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('syntax error') ||
         error.message.includes('permission denied'))
      ) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      if (attempt < retries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
      }
    }
  }
  
  throw lastError || new Error('Query failed after retries');
}

// Transaction helper
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  connections: {
    total: number;
    idle: number;
    waiting: number;
  };
  latency: number;
}> {
  const start = performance.now();
  
  try {
    await pool.query('SELECT 1');
    const latency = performance.now() - start;
    
    return {
      healthy: true,
      connections: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      connections: {
        total: 0,
        idle: 0,
        waiting: 0,
      },
      latency: -1,
    };
  }
}

// Graceful shutdown
export async function closeDatabasePool() {
  await pool.end();
}

// Kysely instance for type-safe queries
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});
```

### Step 6: Backup and Disaster Recovery

#### 6.1 Automated Backup Script

**File**: `scripts/backup-production.sh`

```bash
#!/bin/bash

# Production backup script
set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
S3_BUCKET="your-backup-bucket"
DATABASE_URL="$DATABASE_URL"
RETENTION_DAYS=30
SLACK_WEBHOOK="$SLACK_WEBHOOK_URL"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Function to send Slack notification
notify_slack() {
    local message="$1"
    local color="$2"
    
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d @- <<EOF
{
    "attachments": [{
        "color": "$color",
        "text": "$message",
        "footer": "Backup System",
        "ts": $(date +%s)
    }]
}
EOF
}

# Start backup
echo "Starting backup at $(date)"
notify_slack "Starting production backup" "warning"

# Create database backup
if pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --exclude-table-data='audit_logs' \
    --exclude-table-data='background_job_logs' | \
    gzip -9 > "$BACKUP_PATH"; then
    
    echo "Database backup completed successfully"
    
    # Get backup size
    BACKUP_SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
    
    # Upload to S3
    if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/database/${BACKUP_FILE}" \
        --storage-class STANDARD_IA; then
        
        echo "Backup uploaded to S3 successfully"
        
        # Create metadata file
        cat > "${BACKUP_PATH}.metadata" <<EOF
{
    "timestamp": "$TIMESTAMP",
    "size": "$BACKUP_SIZE",
    "database_version": "$(psql "$DATABASE_URL" -t -c 'SELECT version()')",
    "schema_version": "$(psql "$DATABASE_URL" -t -c 'SELECT MAX(version) FROM schema_migrations')",
    "retention_days": $RETENTION_DAYS
}
EOF
        
        # Upload metadata
        aws s3 cp "${BACKUP_PATH}.metadata" "s3://${S3_BUCKET}/database/${BACKUP_FILE}.metadata"
        
        # Clean up old backups locally
        find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
        
        # Clean up old S3 backups
        aws s3 ls "s3://${S3_BUCKET}/database/" | \
            awk '{print $4}' | \
            grep "^backup_" | \
            sort -r | \
            tail -n +$((RETENTION_DAYS + 1)) | \
            xargs -I {} aws s3 rm "s3://${S3_BUCKET}/database/{}"
        
        notify_slack "Production backup completed successfully. Size: $BACKUP_SIZE" "good"
    else
        notify_slack "Failed to upload backup to S3" "danger"
        exit 1
    fi
else
    notify_slack "Database backup failed" "danger"
    exit 1
fi

# Test backup restoration (on a test database)
if [ "$TEST_RESTORE" = "true" ]; then
    echo "Testing backup restoration..."
    
    TEST_DB="backup_test_${TIMESTAMP}"
    createdb "$TEST_DB"
    
    if gunzip -c "$BACKUP_PATH" | psql "postgresql://localhost/$TEST_DB"; then
        echo "Backup restoration test passed"
        dropdb "$TEST_DB"
    else
        notify_slack "Backup restoration test failed!" "danger"
        dropdb "$TEST_DB" || true
        exit 1
    fi
fi

echo "Backup process completed at $(date)"
```

#### 6.2 Disaster Recovery Runbook

**File**: `docs/DISASTER_RECOVERY_RUNBOOK.md`

```markdown
# Disaster Recovery Runbook

## Overview
This runbook provides step-by-step procedures for recovering from various disaster scenarios.

## Scenarios and Procedures

### 1. Database Failure

#### Detection
- Monitoring alerts for database connectivity
- Application errors related to database operations
- Health check endpoint returns database errors

#### Recovery Steps

1. **Assess the situation**
   ```bash
   # Check database status
   psql $DATABASE_URL -c "SELECT 1"
   
   # Check Supabase dashboard
   open https://app.supabase.com/project/$PROJECT_REF
   ```

2. **Failover to read replica (if available)**
   ```bash
   # Update environment variable
   export DATABASE_URL=$READ_REPLICA_URL
   
   # Deploy with new configuration
   vercel env pull
   vercel --prod
   ```

3. **Restore from backup**
   ```bash
   # Get latest backup
   aws s3 ls s3://your-backup-bucket/database/ | sort | tail -1
   
   # Download backup
   aws s3 cp s3://your-backup-bucket/database/backup_TIMESTAMP.sql.gz .
   
   # Create new database
   createdb recovery_db
   
   # Restore backup
   gunzip -c backup_TIMESTAMP.sql.gz | psql recovery_db
   
   # Verify data integrity
   psql recovery_db -c "SELECT COUNT(*) FROM library_items"
   ```

4. **Update application configuration**
   ```bash
   # Update Vercel environment variables
   vercel env rm DATABASE_URL production
   vercel env add DATABASE_URL production < new_database_url.txt
   
   # Redeploy
   vercel --prod --force
   ```

### 2. Application Deployment Failure

#### Detection
- Deployment pipeline fails
- Smoke tests fail after deployment
- User reports of application errors

#### Recovery Steps

1. **Immediate rollback**
   ```bash
   # List recent deployments
   vercel ls
   
   # Rollback to previous version
   vercel rollback <deployment-url>
   ```

2. **Investigate failure**
   ```bash
   # Check deployment logs
   vercel logs <deployment-url>
   
   # Check error tracking
   open https://sentry.io/organizations/your-org/issues/
   ```

3. **Fix and redeploy**
   ```bash
   # Fix the issue in code
   # Run tests locally
   npm run test
   
   # Deploy to preview first
   vercel
   
   # Test preview deployment
   npm run test:e2e -- --baseUrl=<preview-url>
   
   # Deploy to production
   vercel --prod
   ```

### 3. Data Corruption

#### Detection
- Inconsistent data in reports
- User complaints about incorrect calculations
- Data validation errors

#### Recovery Steps

1. **Identify corrupted data**
   ```sql
   -- Check for orphaned records
   SELECT * FROM estimate_items ei
   LEFT JOIN library_items li ON ei.library_item_id = li.id
   WHERE li.id IS NULL;
   
   -- Check for invalid calculations
   SELECT * FROM estimate_calculations
   WHERE total_cost < 0
   OR (material_cost + labour_cost + equipment_cost) != total_cost;
   ```

2. **Restore specific tables**
   ```bash
   # Extract specific table from backup
   gunzip -c backup_TIMESTAMP.sql.gz | \
     sed -n '/COPY library_items/,/\\\./p' > library_items_restore.sql
   
   # Restore table data
   psql $DATABASE_URL < library_items_restore.sql
   ```

3. **Run data reconciliation**
   ```bash
   # Run reconciliation script
   npm run scripts:reconcile-data
   
   # Verify data integrity
   npm run scripts:verify-data-integrity
   ```

### 4. Security Breach

#### Detection
- Unusual activity in audit logs
- Alerts from security monitoring
- Reports of unauthorized access

#### Recovery Steps

1. **Immediate containment**
   ```bash
   # Revoke all API keys
   psql $DATABASE_URL -c "UPDATE api_keys SET revoked_at = NOW()"
   
   # Force logout all users
   psql $DATABASE_URL -c "DELETE FROM auth.sessions"
   
   # Enable maintenance mode
   vercel env add MAINTENANCE_MODE true production
   vercel --prod --force
   ```

2. **Investigate breach**
   ```sql
   -- Check recent audit logs
   SELECT * FROM audit_logs
   WHERE timestamp > NOW() - INTERVAL '24 hours'
   ORDER BY timestamp DESC;
   
   -- Check for data exfiltration
   SELECT user_id, COUNT(*), array_agg(DISTINCT action)
   FROM audit_logs
   WHERE timestamp > NOW() - INTERVAL '7 days'
   GROUP BY user_id
   HAVING COUNT(*) > 1000;
   ```

3. **Secure and restore**
   ```bash
   # Rotate all secrets
   ./scripts/rotate-secrets.sh
   
   # Update security policies
   psql $DATABASE_URL < security-policies-update.sql
   
   # Re-enable application
   vercel env rm MAINTENANCE_MODE production
   vercel --prod --force
   ```

## Communication Plan

### Internal Communication
1. Notify incident commander immediately
2. Create incident channel in Slack: `#incident-YYYYMMDD`
3. Update status page every 30 minutes

### External Communication
1. Post initial acknowledgment within 15 minutes
2. Provide updates every hour
3. Post resolution summary within 24 hours

## Post-Incident

1. **Document incident**
   - Timeline of events
   - Actions taken
   - Root cause analysis
   - Lessons learned

2. **Update runbook**
   - Add new scenarios discovered
   - Improve existing procedures
   - Update contact information

3. **Implement improvements**
   - Fix root causes
   - Improve monitoring
   - Update automation

## Contact Information

- **On-call Engineer**: See PagerDuty
- **Database Admin**: db-admin@company.com
- **Security Team**: security@company.com
- **VP Engineering**: vp-eng@company.com

## Tools and Resources

- Monitoring: https://monitoring.company.com
- Status Page: https://status.company.com
- Runbook Updates: https://github.com/company/runbooks
- Incident Templates: https://wiki.company.com/incidents
```

### Step 7: Performance Optimization

#### 7.1 CDN and Caching Configuration

**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Security headers are handled by middleware
  
  // Optimize bundle size
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'date-fns',
      'zod',
    ],
  },
  
  // Cache control headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*).js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*).css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects for old URLs
  async redirects() {
    return [
      {
        source: '/library',
        destination: '/admin/library',
        permanent: true,
      },
    ];
  },
  
  // Bundle analyzer (only in development)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }
    
    return config;
  },
};

module.exports = nextConfig;
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing in CI/CD pipeline
- [ ] Security scan completed with no critical issues
- [ ] Performance benchmarks meet requirements
- [ ] Database migrations reviewed and tested
- [ ] Environment variables configured in production
- [ ] Backup job scheduled and tested
- [ ] Monitoring alerts configured
- [ ] Rollback procedure documented and tested

### Deployment
- [ ] Deploy during low-traffic window
- [ ] Monitor deployment progress
- [ ] Run smoke tests immediately after deployment
- [ ] Check all health endpoints
- [ ] Verify monitoring data is flowing
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error rates for 24 hours
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Document any issues encountered
- [ ] Update runbooks if needed
- [ ] Schedule post-mortem if issues occurred

## Next Steps

1. Complete deployment checklist
2. Schedule deployment window with team
3. Conduct deployment dry run
4. Train team on monitoring and incident response
5. Create user documentation for new features
6. Plan for continuous improvement based on metrics

---

*Phase 6 Complete: Production deployment infrastructure ensures reliable, secure, and performant operations*