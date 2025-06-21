# Supabase SQL Automation

This document explains how to use the Supabase SQL automation script to automatically update your Supabase database schema.

## Prerequisites

1. You need to have a Supabase service role key. This is different from the anon key and has higher privileges.
2. Add the service role key to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How to Use

### Running All Migrations

To run all SQL files in the `supabase/migrations` directory:

```bash
npm run supabase:migrate
```

This will execute all SQL files in alphabetical order.

### Running a Single SQL File

To run a specific SQL file:

```bash
npm run supabase:execute-file path/to/your/file.sql
```

Example:

```bash
npm run supabase:execute-file supabase/migrations/create_tables.sql
```

### Running All SQL Files in a Directory

To run all SQL files in a specific directory:

```bash
npm run supabase:execute-dir path/to/your/directory
```

Example:

```bash
npm run supabase:execute-dir ./sql-scripts
```

## Creating New Migrations

1. Create a new SQL file in the `supabase/migrations` directory
2. Name it with a timestamp prefix for proper ordering (e.g., `20240326000000_add_new_table.sql`)
3. Write your SQL statements in the file
4. Run the migration using one of the commands above

## Important Notes

1. The script uses Supabase's `rpc` function with `execute_sql`, which must be enabled in your Supabase project.
2. SQL statements are split by semicolons, which may not work for complex SQL with functions or triggers.
3. Always backup your database before running migrations.
4. The service role key has high privileges, so keep it secure and never commit it to your repository.

## Troubleshooting

If you encounter errors:

1. Check that your SQL syntax is correct
2. Verify that your service role key has the necessary permissions
3. Make sure the `execute_sql` RPC function is available in your Supabase project
4. Check the console output for specific error messages

## Automating in CI/CD

To automate migrations in a CI/CD pipeline:

1. Store your Supabase service role key as a secret in your CI/CD environment
2. Add a step in your deployment workflow to run the migration script
3. Make sure to run migrations before deploying your application

Example GitHub Actions step:

```yaml
- name: Run Supabase Migrations
  run: npm run supabase:migrate
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
``` 