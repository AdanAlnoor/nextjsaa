/**
 * Cleanup Original Files Script
 * Removes original files from the root directory after they've been organized
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rootDir = process.cwd();

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Files to keep in the root directory
const FILES_TO_KEEP = [
  'package.json',
  'package-lock.json',
  'next.config.mjs', 
  'postcss.config.js',
  'tailwind.config.js',
  '.env.local',
  '.env.example',
  'tsconfig.json',
  'README.md',
  'PROJECT_STRUCTURE.md',
  '.eslintrc.json',
  '.gitignore',
  '.git',
  '.next',
  'node_modules'
];

// Directories that should be kept
const DIRS_TO_KEEP = [
  'src',
  'public',
  'config',
  'docs',
  'migrations',
  'scripts',
  'components',
  'supabase',
  '.vscode'
];

/**
 * Find files that can be deleted from the root directory
 */
function findFilesToDelete() {
  try {
    const entries = fs.readdirSync(rootDir);
    const filesToDelete = [];
    
    for (const entry of entries) {
      // Skip files/directories that should be kept
      if (FILES_TO_KEEP.includes(entry) || DIRS_TO_KEEP.includes(entry)) {
        continue;
      }
      
      const entryPath = path.join(rootDir, entry);
      const stats = fs.statSync(entryPath);
      
      if (stats.isFile()) {
        filesToDelete.push(entry);
      }
    }
    
    return filesToDelete;
  } catch (err) {
    console.error(`${colors.red}Error finding files to delete:${colors.reset}`, err);
    return [];
  }
}

/**
 * Delete the specified files
 */
function deleteFiles(files) {
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    try {
      fs.unlinkSync(path.join(rootDir, file));
      console.log(`${colors.green}Deleted:${colors.reset} ${file}`);
      successCount++;
    } catch (err) {
      console.error(`${colors.red}Failed to delete ${file}:${colors.reset}`, err);
      errorCount++;
    }
  }
  
  console.log(`\n${colors.blue}Cleanup Summary:${colors.reset}`);
  console.log(`- ${successCount} files successfully deleted`);
  if (errorCount > 0) {
    console.log(`- ${errorCount} files could not be deleted`);
  }
}

/**
 * Main cleanup function
 */
function cleanupOriginals() {
  console.log(`\n${colors.blue}=============================================${colors.reset}`);
  console.log(`${colors.blue}    CLEANUP ORIGINAL FILES${colors.reset}`);
  console.log(`${colors.blue}=============================================${colors.reset}\n`);
  
  const filesToDelete = findFilesToDelete();
  
  if (filesToDelete.length === 0) {
    console.log(`${colors.yellow}No files found to delete in the root directory.${colors.reset}`);
    rl.close();
    return;
  }
  
  console.log(`${colors.yellow}The following files will be deleted from the root directory:${colors.reset}`);
  filesToDelete.forEach(file => console.log(`- ${file}`));
  
  rl.question(`\n${colors.red}Are you sure you want to delete these files? This cannot be undone! (yes/no):${colors.reset} `, (answer) => {
    if (answer.toLowerCase() === 'yes') {
      deleteFiles(filesToDelete);
    } else {
      console.log(`${colors.yellow}Cleanup canceled.${colors.reset}`);
    }
    rl.close();
  });
}

// Run the cleanup
cleanupOriginals(); 