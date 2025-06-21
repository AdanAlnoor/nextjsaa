# Automating Supabase SQL Updates with Supabase CLI

This guide explains how to use the Supabase CLI to automatically update your Supabase database schema.

## Prerequisites

1. Install the Supabase CLI:

   ```bash
   # Using npm
   npm install -g supabase
   
   # Using Homebrew (macOS)
   brew install supabase/tap/supabase
   ```

2. Log in to your Supabase account:

   ```bash
   supabase login
   ```

## Setting Up Your Project

If you haven't already linked your project to Supabase:

```bash
# Initialize Supabase in your project
supabase init

# Link to your existing Supabase project
supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your Supabase project reference ID (found in your project URL).

## Managing Migrations

### Creating a New Migration

```bash
supabase migration new create_my_table
```

This creates a new timestamped migration file in the `supabase/migrations` directory.

### Applying Migrations

To apply all pending migrations to your remote Supabase database:

```bash
supabase db push
```

### Generating Migration from Local Changes

If you've made changes to your local database and want to create a migration file:

```bash
supabase db diff -f my_changes
```

This generates a migration file based on the differences between your local and remote databases.

## Adding to Your Project Scripts

Add these commands to your `package.json` for easier access:

```json
"scripts": {
  "supabase:start": "supabase start",
  "supabase:stop": "supabase stop",
  "supabase:new-migration": "supabase migration new",
  "supabase:push": "supabase db push",
  "supabase:diff": "supabase db diff"
}
```

## Workflow for Database Changes

1. Create a new migration:
   ```bash
   npm run supabase:new-migration create_users_table
   ```

2. Edit the generated migration file in `supabase/migrations/[timestamp]_create_users_table.sql`

3. Push the changes to your Supabase project:
   ```bash
   npm run supabase:push
   ```

## CI/CD Integration

For GitHub Actions:

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

## Best Practices

1. **Version Control**: Always commit your migration files to version control.
2. **One Change Per Migration**: Keep migrations focused on a single logical change.
3. **Test Migrations**: Test migrations in a development environment before applying to production.
4. **Idempotent Migrations**: Use `CREATE TABLE IF NOT EXISTS` and similar patterns to make migrations rerunnable.
5. **Backup**: Always backup your database before running migrations in production.

## Troubleshooting

- **Authentication Issues**: Run `supabase login` to refresh your authentication.
- **Connection Problems**: Verify your project reference ID with `supabase projects list`.
- **Migration Failures**: Check the error message and fix the SQL syntax in your migration file.

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/introduction)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/managing-migrations) 