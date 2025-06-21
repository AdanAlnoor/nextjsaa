/**
 * Batch JS File Organization Script
 * Automatically organizes JavaScript files without requiring user input
 */
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const scriptsDbDir = path.join(rootDir, 'scripts', 'db');

// Ensure db scripts directory exists
if (!fs.existsSync(scriptsDbDir)) {
  fs.mkdirSync(scriptsDbDir, { recursive: true });
}

// Files to exclude from moving (keep in root)
const EXCLUDED_FILES = [
  'next.config.mjs',
  'postcss.config.js',
  'tailwind.config.js',
];

// DB-related keywords to identify database JavaScript files
const DB_KEYWORDS = [
  'sql', 'database', 'supabase', 'postgres', 'migration', 
  'table', 'query', 'schema', 'function', 'trigger',
  'select', 'insert', 'update', 'delete', 'alter'
];

/**
 * Check if a JavaScript file is related to database operations
 */
function isDatabaseRelatedJs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    
    // Check filename for database-related terms
    if (DB_KEYWORDS.some(keyword => fileName.includes(keyword))) {
      return true;
    }
    
    // Check content for database-related operations
    if (content.includes('supabase') || 
        content.includes('sql') ||
        content.includes('postgres') ||
        content.includes('database') ||
        content.includes('query') ||
        content.includes('execute(') ||
        content.includes('.from(') ||
        content.includes('select') ||
        content.includes('insert into') ||
        content.includes('update ') ||
        content.includes('delete from')) {
      return true;
    }
    
    return false;
  } catch (err) {
    console.error(`Error analyzing ${filePath}:`, err);
    return false;
  }
}

/**
 * Organize JavaScript files related to database operations
 */
function organizeJsFiles() {
  try {
    const files = fs.readdirSync(rootDir);
    let movedCount = 0;
    
    for (const file of files) {
      // Only process JavaScript files in the root
      if (!file.endsWith('.js') || 
          EXCLUDED_FILES.includes(file) ||
          fs.statSync(path.join(rootDir, file)).isDirectory()) {
        continue;
      }
      
      const filePath = path.join(rootDir, file);
      
      // Check if file is database-related
      if (isDatabaseRelatedJs(filePath)) {
        const targetPath = path.join(scriptsDbDir, file);
        
        try {
          // Copy file to scripts/db directory
          fs.copyFileSync(filePath, targetPath);
          console.log(`Moved ${file} to scripts/db/`);
          movedCount++;
        } catch (err) {
          console.error(`Error moving ${file}:`, err);
        }
      }
    }
    
    console.log(`\nOrganization complete: ${movedCount} JavaScript files moved to scripts/db/`);
    console.log('\nFiles were copied to new locations. Once you verify everything works correctly,');
    console.log('you can delete the original files from the root directory.');
    
  } catch (err) {
    console.error('Error organizing JavaScript files:', err);
  }
}

// Run the organization
organizeJsFiles(); 