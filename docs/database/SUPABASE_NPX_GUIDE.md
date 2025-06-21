# Using Supabase CLI with npx (No Installation Required)

This guide explains how to use the Supabase CLI with npx, which doesn't require global installation and avoids permission issues.

## Quick Setup

Run the setup script to configure everything:

```bash
npm run supabase:setup
```

This will:
1. Check if npx can run Supabase CLI
2. Log you in to Supabase
3. Initialize Supabase in your project
4. Link your project to your Supabase instance
5. Update your package.json scripts to use npx

## Running SQL Files

To run a SQL file directly:

```bash
npm run supabase:run-sql path/to/your/file.sql
```

This will:
1. Create a temporary migration file
2. Push it to your Supabase project
3. Optionally keep or remove the migration file

## Managing Migrations

### Creating a New Migration

```bash
npm run supabase:new-migration my_migration_name
```

This creates a new timestamped migration file in the `supabase/migrations` directory.

### Applying Migrations

```bash
npm run supabase:push
```

This applies all pending migrations to your Supabase database.

### Generating Migration from Local Changes

```bash
npm run supabase:diff -f my_changes
```

This generates a migration file based on the differences between your local and remote databases.

## Local Development

Start a local Supabase instance:

```bash
npm run supabase:start
```

Stop the local Supabase instance:

```bash
npm run supabase:stop
```

## Troubleshooting

### Login Issues

If you have trouble logging in:

```bash
npx supabase login
```

This will open a browser window where you can authenticate with your Supabase account.

### Project Linking Issues

If you need to link your project again:

```bash
npx supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your Supabase project reference ID.

### Checking Status

To check the status of your Supabase setup:

```bash
npx supabase status
```

## Benefits of Using npx

1. **No Global Installation**: Avoids permission issues with global npm installations
2. **Always Latest Version**: Always uses the latest version of the Supabase CLI
3. **No PATH Issues**: Doesn't require adding anything to your PATH
4. **Works Everywhere**: Works on all operating systems without special setup

## Additional Commands

```bash
# List all projects
npx supabase projects list

# Reset local database
npx supabase db reset

# Pull remote schema to local
npx supabase db pull

# Generate types from your database schema
npx supabase gen types typescript > types.ts
``` 