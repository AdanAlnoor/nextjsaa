/**
 * Batch File Organization Script
 * Automatically organizes files by type without requiring user input
 */
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Define destination directories
const DOCS_DIR = path.join(rootDir, 'docs');
const CONFIG_DIR = path.join(rootDir, 'config');
const MD_GUIDES_DIR = path.join(DOCS_DIR, 'guides');
const MD_API_DIR = path.join(DOCS_DIR, 'api');
const MD_DATABASE_DIR = path.join(DOCS_DIR, 'database');

// Ensure directories exist
[DOCS_DIR, CONFIG_DIR, MD_GUIDES_DIR, MD_API_DIR, MD_DATABASE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Files to exclude from moving (keep in root)
const EXCLUDED_FILES = [
  'package.json',
  'package-lock.json',
  'next.config.mjs',
  'tailwind.config.js',
  'postcss.config.js',
  '.env.local',
  '.env.example',
  'tsconfig.json',
  'README.md',
  'PROJECT_STRUCTURE.md',
  '.eslintrc.json',
  '.gitignore'
];

/**
 * Categorize markdown files automatically
 */
function categorizeMarkdownFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    
    if (content.includes('api') || content.includes('endpoint') || content.includes('route')) {
      return 'api';
    } else if (content.includes('database') || content.includes('sql') || content.includes('schema') || 
              content.includes('table') || content.includes('migration') || content.includes('supabase')) {
      return 'database';
    } else {
      return 'guides'; // Default category
    }
  } catch (err) {
    console.error(`Error analyzing ${filePath}:`, err);
    return 'guides'; // Default to guides on error
  }
}

/**
 * Move files by extension in batch mode
 */
function moveFilesByType() {
  try {
    const files = fs.readdirSync(rootDir);
    
    // Count of moved files by type
    const movedCounts = {
      md: 0,
      json: 0
    };
    
    for (const file of files) {
      // Skip directories and excluded files
      if (fs.statSync(path.join(rootDir, file)).isDirectory() || 
          EXCLUDED_FILES.includes(file)) {
        continue;
      }
      
      const ext = path.extname(file).toLowerCase();
      
      if (ext === '.md') {
        // Categorize and move markdown files
        const category = categorizeMarkdownFile(path.join(rootDir, file));
        let targetDir;
        
        switch (category) {
          case 'api':
            targetDir = MD_API_DIR;
            break;
          case 'database':
            targetDir = MD_DATABASE_DIR;
            break;
          default:
            targetDir = MD_GUIDES_DIR;
        }
        
        try {
          fs.copyFileSync(path.join(rootDir, file), path.join(targetDir, file));
          console.log(`Moved ${file} to ${path.relative(rootDir, targetDir)} (${category})`);
          movedCounts.md++;
        } catch (err) {
          console.error(`Error moving ${file}:`, err);
        }
      } 
      else if (ext === '.json' && !file.startsWith('.')) {
        // Move JSON files to config directory
        try {
          fs.copyFileSync(path.join(rootDir, file), path.join(CONFIG_DIR, file));
          console.log(`Moved ${file} to ${path.relative(rootDir, CONFIG_DIR)}`);
          movedCounts.json++;
        } catch (err) {
          console.error(`Error moving ${file}:`, err);
        }
      }
    }
    
    console.log(`\nOrganization complete:`);
    console.log(`- ${movedCounts.md} markdown files organized into docs subdirectories`);
    console.log(`- ${movedCounts.json} JSON files moved to config directory`);
    
    console.log('\nFiles were copied to new locations. Once you verify everything works correctly,');
    console.log('you can delete the original files from the root directory.');
    
  } catch (err) {
    console.error('Error organizing files:', err);
  }
}

// Run the organization
moveFilesByType(); 