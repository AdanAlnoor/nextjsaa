# Phase 6: Migration and Deployment

## Overview

This phase covers the migration of existing data and the deployment process for the library integration system.

## Migration Strategy

### 1. Database Migration Scripts

```sql
-- migrations/20240315000000_library_integration_setup.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create library reference tables
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id UUID REFERENCES divisions(id),
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assemblies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES sections(id),
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create factor tables
CREATE TABLE IF NOT EXISTS material_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_item_id UUID REFERENCES library_items(id),
  material_catalogue_id UUID REFERENCES materials_catalogue(id),
  quantity_per_unit DECIMAL(10,4) NOT NULL,
  wastage_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labour_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_item_id UUID REFERENCES library_items(id),
  labour_catalogue_id UUID REFERENCES labour_catalogue(id),
  hours_per_unit DECIMAL(10,4) NOT NULL,
  productivity_factor DECIMAL(5,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_item_id UUID REFERENCES library_items(id),
  equipment_catalogue_id UUID REFERENCES equipment_catalogue(id),
  hours_per_unit DECIMAL(10,4) NOT NULL,
  utilization_factor DECIMAL(5,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_divisions_code ON divisions USING btree (code);
CREATE INDEX idx_sections_code ON sections USING btree (code);
CREATE INDEX idx_assemblies_code ON assemblies USING btree (code);
CREATE INDEX idx_material_factors_item ON material_factors(library_item_id);
CREATE INDEX idx_labour_factors_item ON labour_factors(library_item_id);
CREATE INDEX idx_equipment_factors_item ON equipment_factors(library_item_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_divisions_updated_at
    BEFORE UPDATE ON divisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Similar triggers for other tables...
```

### 2. Data Migration Script

```typescript
// scripts/migrate-library-data.ts

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import fs from 'fs';

async function migrateLibraryData() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  // Read CSV data
  const divisions = await parseCsvFile('data/divisions.csv');
  const sections = await parseCsvFile('data/sections.csv');
  const assemblies = await parseCsvFile('data/assemblies.csv');
  const items = await parseCsvFile('data/library_items.csv');

  // Insert divisions
  const { data: insertedDivisions, error: divisionError } = await supabase
    .from('divisions')
    .upsert(divisions, { onConflict: 'code' });

  if (divisionError) throw divisionError;

  // Insert sections with division references
  const { data: insertedSections, error: sectionError } = await supabase
    .from('sections')
    .upsert(
      sections.map(section => ({
        ...section,
        division_id: insertedDivisions.find(
          d => d.code === section.division_code
        )?.id
      })),
      { onConflict: 'code' }
    );

  if (sectionError) throw sectionError;

  // Continue with assemblies and items...
}

async function parseCsvFile(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true }))
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', error => reject(error));
  });
}

migrateLibraryData().catch(console.error);
```

### 3. Rollback Scripts

```sql
-- migrations/20240315000000_library_integration_rollback.sql

BEGIN;

-- Drop factor tables
DROP TABLE IF EXISTS material_factors;
DROP TABLE IF EXISTS labour_factors;
DROP TABLE IF EXISTS equipment_factors;

-- Drop library reference tables
DROP TABLE IF EXISTS assemblies;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS divisions;

-- Drop triggers
DROP TRIGGER IF EXISTS update_divisions_updated_at ON divisions;
-- Drop other triggers...

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;
```

## Deployment Process

### 1. Environment Configuration

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgres://postgres:password@db:5432/postgres
```

### 2. Build Configuration

```javascript
// next.config.js

module.exports = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  images: {
    domains: ['your-project.supabase.co']
  },
  webpack: (config, { isServer }) => {
    // Add any necessary webpack configurations
    return config;
  }
};
```

### 3. Docker Configuration

```dockerfile
# Dockerfile
FROM node:16-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 4. Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy.sh

# Exit on error
set -e

# Load environment variables
source .env.production

# Run database migrations
echo "Running database migrations..."
npm run migrate

# Build application
echo "Building application..."
docker-compose build

# Deploy application
echo "Deploying application..."
docker-compose up -d

# Run data migration
echo "Running data migration..."
npm run migrate:data

# Verify deployment
echo "Verifying deployment..."
./scripts/verify-deployment.sh
```

```bash
#!/bin/bash
# scripts/verify-deployment.sh

# Check application health
curl -f http://localhost:3000/api/health

# Check database connection
npm run db:check

# Verify data migration
npm run verify:data
```

### 5. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy Library Integration

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to production
        if: github.event_name == 'release'
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker-compose -f docker-compose.yml build
          docker-compose -f docker-compose.yml push
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Monitoring and Logging

### 1. Application Monitoring

```typescript
// lib/monitoring.ts

import { Sentry } from '@sentry/nextjs';

export function initializeMonitoring() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Postgres()
    ]
  });
}

export function trackLibraryOperation(operation: string, metadata: any) {
  Sentry.addBreadcrumb({
    category: 'library',
    message: `Library operation: ${operation}`,
    level: 'info',
    data: metadata
  });
}
```

### 2. Database Monitoring

```sql
-- monitoring/create_audit_logs.sql

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    old_data,
    new_data,
    user_id
  )
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    row_to_json(OLD),
    row_to_json(NEW),
    current_setting('app.current_user_id', true)::UUID
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_divisions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON divisions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add similar triggers for other tables...
```

### 3. Performance Monitoring

```typescript
// lib/performance.ts

import { PerformanceObserver } from 'perf_hooks';

export function initializePerformanceMonitoring() {
  const obs = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.duration > 1000) {
        console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        Sentry.captureMessage('Slow operation detected', {
          level: 'warning',
          extra: {
            operation: entry.name,
            duration: entry.duration
          }
        });
      }
    });
  });
  
  obs.observe({ entryTypes: ['measure'] });
}

export function measureLibraryOperation(name: string, operation: () => Promise<any>) {
  const start = performance.now();
  return operation().finally(() => {
    const duration = performance.now() - start;
    performance.measure(name, { duration });
  });
}
```

## Rollback Procedures

### 1. Application Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

# Exit on error
set -e

# Load environment variables
source .env.production

# Specify version to rollback to
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Please specify version to rollback to"
  exit 1
fi

# Stop current deployment
docker-compose down

# Checkout specific version
git checkout $VERSION

# Rebuild and deploy
docker-compose build
docker-compose up -d

# Verify rollback
./scripts/verify-deployment.sh
```

### 2. Database Rollback

```typescript
// scripts/rollback-database.ts

import { createClient } from '@supabase/supabase-js';

async function rollbackDatabase(targetVersion: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  try {
    // Begin transaction
    const { error: txError } = await supabase.rpc('begin_transaction');
    if (txError) throw txError;

    // Get current version
    const { data: currentVersion } = await supabase
      .from('schema_migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Apply rollback migrations
    while (currentVersion > targetVersion) {
      const { error } = await supabase
        .rpc('run_migration_down', { version: currentVersion });
      if (error) throw error;
    }

    // Commit transaction
    const { error: commitError } = await supabase.rpc('commit_transaction');
    if (commitError) throw commitError;

  } catch (error) {
    // Rollback transaction on error
    await supabase.rpc('rollback_transaction');
    throw error;
  }
}
```

## Backup Procedures

### 1. Database Backup

```bash
#!/bin/bash
# scripts/backup-database.sh

# Exit on error
set -e

# Load environment variables
source .env.production

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > "$BACKUP_DIR/database.sql"

# Backup specific tables
pg_dump $DATABASE_URL -t divisions -t sections -t assemblies > "$BACKUP_DIR/library_tables.sql"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" $BACKUP_DIR

# Upload to storage
aws s3 cp "$BACKUP_DIR.tar.gz" "s3://your-bucket/backups/"

# Cleanup
rm -rf $BACKUP_DIR
rm "$BACKUP_DIR.tar.gz"
```

### 2. Application State Backup

```typescript
// scripts/backup-app-state.ts

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';

async function backupAppState() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  // Backup library data
  const { data: libraryData, error: libraryError } = await supabase
    .from('library_items')
    .select(`
      *,
      material_factors (*),
      labour_factors (*),
      equipment_factors (*)
    `);

  if (libraryError) throw libraryError;

  // Backup user preferences
  const { data: preferencesData, error: preferencesError } = await supabase
    .from('user_preferences')
    .select('*');

  if (preferencesError) throw preferencesError;

  // Write backup files
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(
    `backups/library_${timestamp}.json`,
    JSON.stringify(libraryData, null, 2)
  );
  await fs.writeFile(
    `backups/preferences_${timestamp}.json`,
    JSON.stringify(preferencesData, null, 2)
  );
}
``` 