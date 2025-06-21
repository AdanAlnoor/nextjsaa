# Manual Supabase CLI Setup Guide

If you're having issues with the automated setup script, follow these manual steps to set up the Supabase CLI.

## Step 1: Install the Supabase CLI

### Using npm (Works on all platforms)

```bash
npm install -g supabase
```

### Using Homebrew (macOS only)

```bash
brew install supabase/tap/supabase
```

### Verify Installation

```bash
supabase --version
```

## Step 2: Log in to Supabase

```bash
supabase login
```

This will open a browser window where you can authenticate with your Supabase account.

## Step 3: Initialize Supabase in Your Project

```bash
# Navigate to your project directory
cd your-project-directory

# Initialize Supabase
supabase init
```

This creates a `supabase` directory in your project with the necessary configuration files.

## Step 4: Link to Your Supabase Project

```bash
supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your Supabase project reference ID, which you can find in your project URL:
`https://app.supabase.com/project/your-project-ref`

## Step 5: Test Your Setup

```bash
# List your projects
supabase projects list

# Check status
supabase status
```

## Common Issues and Solutions

### Permission Denied

If you get permission errors when installing globally with npm:

```bash
npm install -g supabase --unsafe-perm=true --allow-root
```

### Command Not Found

If the `supabase` command is not found after installation, make sure your npm global bin directory is in your PATH:

```bash
# Find npm global bin directory
npm config get prefix

# Add to PATH (add this to your .bashrc, .zshrc, etc.)
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Login Issues

If you have trouble logging in:

1. Try using a different browser
2. Clear your browser cookies
3. Generate a new access token from the Supabase dashboard

## Next Steps

Once your CLI is set up, you can:

1. Create migrations: `supabase migration new my_migration`
2. Push changes: `supabase db push`
3. Start local development: `supabase start`

For more details, refer to the [Supabase CLI documentation](https://supabase.com/docs/reference/cli/introduction). 