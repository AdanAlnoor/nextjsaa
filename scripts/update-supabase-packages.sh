#!/bin/bash

# Script to safely update Supabase packages
# This follows the gradual approach recommended in the issue analysis

echo "🔄 Starting Supabase package update process..."

# Step 1: Backup current package files
echo "📦 Creating backups..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup
echo "✅ Backups created"

# Step 2: Check current versions
echo -e "\n📋 Current package versions:"
npm list @supabase/ssr @supabase/supabase-js @supabase/auth-helpers-nextjs

# Step 3: Remove legacy auth helpers
echo -e "\n🗑️  Removing legacy @supabase/auth-helpers-nextjs..."
npm uninstall @supabase/auth-helpers-nextjs
echo "✅ Legacy package removed"

# Step 4: Update to specific versions first (safer)
echo -e "\n📈 Updating to stable versions..."
npm install @supabase/ssr@^0.5.2 @supabase/supabase-js@^2.49.4

# Step 5: Show updated versions
echo -e "\n📋 Updated package versions:"
npm list @supabase/ssr @supabase/supabase-js

echo -e "\n✨ Package update complete!"
echo "🧪 Please test authentication thoroughly before updating to latest versions"
echo "💡 If auth breaks, restore with: cp package.json.backup package.json && cp package-lock.json.backup package-lock.json && npm install"