# Manual Installation Guide for Supabase CLI

This guide provides step-by-step instructions for manually installing and setting up the Supabase CLI.

## Installation Options

### Option 1: Using npm (Recommended)

If you have Node.js installed:

```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

### Option 2: Using the standalone binary

1. Visit the [Supabase CLI releases page](https://github.com/supabase/cli/releases)
2. Download the appropriate binary for your system:
   - For macOS: `supabase_<version>_darwin_<arch>.tar.gz` (where `<arch>` is `amd64` for Intel Macs or `arm64` for M1/M2 Macs)
   - For Windows: `supabase_<version>_windows_<arch>.tar.gz`
   - For Linux: `supabase_<version>_linux_<arch>.tar.gz`

3. Extract the downloaded archive:
   ```bash
   tar -xzf supabase_<version>_darwin_<arch>.tar.gz
   ```

4. Move the binary to a location in your PATH:
   ```bash
   # Create a directory for binaries if it doesn't exist
   mkdir -p ~/bin
   
   # Move the binary
   mv supabase ~/bin/
   
   # Make it executable
   chmod +x ~/bin/supabase
   
   # Add to PATH if not already there (add this to your .bashrc or .zshrc)
   export PATH="$HOME/bin:$PATH"
   ```

5. Verify installation:
   ```bash
   supabase --version
   ```

## Setting Up Your Project

### 1. Log in to Supabase

```bash
supabase login
```

This will open a browser window where you can authenticate with your Supabase account.

### 2. Initialize Supabase in Your Project

```bash
# Navigate to your project directory
cd your-project-directory

# Initialize Supabase
supabase init
```

This creates a `supabase` directory in your project with the necessary configuration files.

### 3. Link to Your Supabase Project

```bash
supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your Supabase project reference ID, which you can find in your project URL: `https://app.supabase.com/project/your-project-ref`

## Creating and Applying Migrations

### Create a New Migration

```bash
supabase migration new create_my_table
```

This creates a new timestamped migration file in the `supabase/migrations` directory.

### Apply Migrations

```bash
supabase db push
```

This applies all pending migrations to your remote Supabase database.

## Troubleshooting

### Command Not Found

If you get a "command not found" error:

1. Make sure the installation directory is in your PATH
2. Try restarting your terminal
3. Check if the binary is executable (`chmod +x path/to/supabase`)

### Authentication Issues

If you encounter authentication issues:

1. Run `supabase login` again
2. Check if your access token has expired
3. Verify you have the correct permissions for your Supabase project

### Installation Fails

If installation fails:

1. Check your Node.js version (should be 14.x or higher)
2. Try installing with administrator privileges (`sudo npm install -g supabase`)
3. Try the standalone binary method instead 