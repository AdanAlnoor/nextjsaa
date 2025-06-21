# Quick Guide: Automatically Update Supabase SQL Editor with CLI

This is a quick guide to automatically update your Supabase database using the official Supabase CLI.

## Setup (One-time)

1. **Install the Supabase CLI**:
   ```bash
   # Run our setup script
   ./setup-supabase-cli.sh
   
   # Or install manually
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in your Supabase project URL)

## Workflow for Database Changes

### Option 1: Create and Apply Migrations Manually

1. **Create a new migration**:
   ```bash
   npm run supabase:new-migration add_my_table
   ```
   This creates a file in `supabase/migrations/[timestamp]_add_my_table.sql`

2. **Edit the migration file** with your SQL code

3. **Apply the migration**:
   ```bash
   npm run supabase:push
   ```

### Option 2: Generate Migrations from Local Changes

1. **Start local Supabase**:
   ```bash
   npm run supabase:start
   ```

2. **Make changes** to your local database using the Supabase Studio

3. **Generate a migration** from your changes:
   ```bash
   npm run supabase:diff -f my_changes
   ```

4. **Apply the migration**:
   ```bash
   npm run supabase:push
   ```

5. **Stop local Supabase** when done:
   ```bash
   npm run supabase:stop
   ```

## Automating in CI/CD

Add this to your GitHub Actions workflow:

```yaml
name: Deploy Migrations

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Deploy Migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

## Benefits of Using Supabase CLI

1. **Official Tool**: Maintained by Supabase team
2. **Version Control**: Track all database changes in your repository
3. **Local Development**: Test changes locally before deploying
4. **CI/CD Integration**: Automate deployments
5. **Rollbacks**: Easier to manage database versions
6. **Team Collaboration**: Everyone uses the same schema

## Common Commands

```bash
# List all projects
supabase projects list

# Get current project status
supabase status

# Reset local database
supabase db reset

# Pull remote schema to local
supabase db pull

# Generate types from your database schema
supabase gen types typescript > types.ts
``` 