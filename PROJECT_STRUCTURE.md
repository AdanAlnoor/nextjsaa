# Project Structure Guide

This document outlines the organization of the project to help maintain a clean and understandable codebase.

## Directory Structure

```
nextjsaa/
│
├── src/                    # Main application source code
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Library code and utilities
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
│
├── migrations/             # Database migrations (versioned)
│   ├── schema/             # Table and schema changes
│   ├── functions/          # Database functions
│   ├── triggers/           # Database triggers
│   └── data/               # Data migrations/seed data
│
├── sql/                    # SQL files (legacy/reference only)
│
├── scripts/                # Utility scripts
│   ├── setup/              # Setup and initialization scripts
│   ├── db/                 # Database-related scripts
│   └── utils/              # Utility scripts
│
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── database/           # Database documentation
│   └── guides/             # General guides and instructions
│
├── config/                 # Configuration files
│
├── public/                 # Static assets
│
└── .next/                  # Next.js build output (gitignored)
```

## File Organization

### SQL Files
- **New migrations**: Add to `migrations/` directory using the migration manager:
  ```
  node scripts/utils/migration-manager.js create <migration_name> [type]
  ```
- **Categorization**:
  - `schema/`: Database schema, tables, columns, constraints
  - `functions/`: Database functions and stored procedures
  - `triggers/`: Database triggers and events
  - `data/`: Data seeding, modifications, and migrations

### Documentation Files (.md)
- All documentation files should be in the `docs/` directory
- Categorized by topic:
  - `api/`: API documentation and usage
  - `database/`: Database schemas and management 
  - `guides/`: General guides and instructions

### Configuration Files (.json)
- Configuration files reside in the `config/` directory
- Exception: Package management files stay in the root (`package.json`, etc.)

## Organization Tools

Two utility scripts help maintain this structure:

1. **SQL Migration Script**:
   ```
   node scripts/utils/migrate-sql-files.js
   ```
   Organizes SQL files into the appropriate migrations directory with timestamps.

2. **File Organization Script**:
   ```
   node scripts/utils/organize-files.js
   ```
   Moves Markdown and JSON files to their appropriate directories.

## Recommended Practices

### Database Changes

1. All database changes should be managed through the migration system:
   ```
   node scripts/utils/migration-manager.js create <migration_name> [type]
   ```

2. Run migrations:
   ```
   node scripts/utils/migration-manager.js run
   ```

### Code Organization

1. Components:
   - Place reusable UI components in `src/components/`
   - Group related components in subdirectories
   - Use index.ts files to re-export components

2. API Routes:
   - Organize by feature in `src/app/api/`

3. Styling:
   - Use Tailwind for styling
   - Place custom styles in appropriate component files

### Authentication

- Auth is managed via Supabase
- Auth middleware in `src/middleware.ts` handles route protection

## Common Issues and Solutions

### Cookie Parsing

If you encounter cookie parsing issues, check:
1. Middleware cookie handling in `src/middleware.ts`
2. Ensure custom cookie parser is working properly

### Database Connection

1. Verify environment variables are correctly set
2. Check Supabase client initialization
3. Use the test connection script: `node test-supabase-connection.js`

### Migration Management

1. Use the migration manager for all database changes
2. Keep migration files small and focused
3. Test migrations in a development environment first 