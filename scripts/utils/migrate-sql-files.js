/**
 * SQL Files Migration Script
 * Helps organize existing SQL files into the new migration structure
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Define paths
const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, 'migrations');
const schemaDir = path.join(migrationsDir, 'schema');
const triggersDir = path.join(migrationsDir, 'triggers');
const functionsDir = path.join(migrationsDir, 'functions');
const dataDir = path.join(migrationsDir, 'data');
const sqlDir = path.join(rootDir, 'sql'); // Existing sql directory

// Create directories if they don't exist
[migrationsDir, schemaDir, triggersDir, functionsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Identify SQL files in both root directory and sql directory
 */
function findSqlFiles() {
  try {
    // Get SQL files from root directory
    const rootFiles = fs.readdirSync(rootDir)
      .filter(file => file.endsWith('.sql') && fs.statSync(path.join(rootDir, file)).isFile())
      .map(file => ({ file, isRoot: true }));
    
    // Get SQL files from sql directory (if it exists)
    let sqlFiles = [];
    if (fs.existsSync(sqlDir)) {
      sqlFiles = fs.readdirSync(sqlDir)
        .filter(file => file.endsWith('.sql') && fs.statSync(path.join(sqlDir, file)).isFile())
        .map(file => ({ file, isRoot: false }));
    }
    
    return [...rootFiles, ...sqlFiles];
  } catch (err) {
    console.error('Error listing files:', err);
    return [];
  }
}

/**
 * Better categorize a SQL file based on content analysis
 * @param {string} filePath - Path to the SQL file
 * @returns {string} The category (schema, trigger, function, data)
 */
function categorizeSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
  
  // More specific categorization rules
  if (content.includes('create trigger') || content.includes('drop trigger') || 
      content.includes('alter trigger') || filePath.includes('trigger')) {
    return 'trigger';
  } 
  else if (content.includes('create function') || content.includes('create or replace function') || 
          content.includes('drop function') || filePath.includes('function')) {
    return 'function';
  }
  else if ((content.includes('insert into') && !content.includes('create table')) || 
          content.includes('update ') || content.includes('delete from') ||
          filePath.includes('data') || filePath.includes('seed')) {
    return 'data';
  }
  else if (content.includes('create table') || content.includes('alter table') || 
          content.includes('drop table') || content.includes('add column') || 
          content.includes('drop column') || content.includes('alter column') ||
          content.includes('create index') || content.includes('create extension')) {
    return 'schema';
  }
  else {
    // Analyze filename patterns as fallback
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('trigger')) {
      return 'trigger';
    } 
    else if (fileName.includes('function')) {
      return 'function';
    }
    else if (fileName.includes('data') || fileName.includes('seed') || fileName.includes('insert')) {
      return 'data';
    }
    else {
      return 'schema'; // Default to schema
    }
  }
}

/**
 * Move an SQL file to the appropriate migrations directory
 */
function migrateSqlFile(fileInfo, category) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  
  // Determine source path based on whether file is in root or sql dir
  const sourcePath = fileInfo.isRoot 
    ? path.join(rootDir, fileInfo.file) 
    : path.join(sqlDir, fileInfo.file);
  
  // Generate new filename
  const baseName = fileInfo.file.replace('.sql', '');
  const newFileName = `${timestamp}_${baseName}.sql`;
  
  let targetDir;
  switch (category) {
    case 'schema':
      targetDir = schemaDir;
      break;
    case 'trigger':
      targetDir = triggersDir;
      break;
    case 'function':
      targetDir = functionsDir;
      break;
    case 'data':
      targetDir = dataDir;
      break;
    default:
      targetDir = schemaDir;
  }
  
  const targetPath = path.join(targetDir, newFileName);
  
  // Read and modify the file content
  const content = fs.readFileSync(sourcePath, 'utf8');
  const sourceLocation = fileInfo.isRoot ? 'root directory' : 'sql directory';
  const newContent = `-- Migrated from: ${fileInfo.file} (${sourceLocation})\n-- Created: ${new Date().toISOString()}\n\n${content}`;
  
  // Write to the new location
  fs.writeFileSync(targetPath, newContent);
  console.log(`Migrated ${fileInfo.file} -> ${path.relative(rootDir, targetPath)}`);
}

/**
 * Process an SQL file with user confirmation
 */
function processSqlFile(fileInfo) {
  const filePath = fileInfo.isRoot 
    ? path.join(rootDir, fileInfo.file) 
    : path.join(sqlDir, fileInfo.file);
    
  const suggestedCategory = categorizeSqlFile(filePath);
  
  rl.question(`File: ${fileInfo.file} (from ${fileInfo.isRoot ? 'root' : 'sql'} directory)\nSuggested category: ${suggestedCategory}\nChoose category [s]chema, [t]rigger, [f]unction, [d]ata, or [skip]: `, (answer) => {
    let category;
    
    switch (answer.toLowerCase().trim()) {
      case 's':
        category = 'schema';
        break;
      case 't':
        category = 'trigger';
        break;
      case 'f':
        category = 'function';
        break;
      case 'd':
        category = 'data';
        break;
      case 'skip':
        console.log(`Skipping ${fileInfo.file}`);
        processSqlFiles();
        return;
      default:
        // Use suggested category if no valid input
        category = suggestedCategory;
    }
    
    migrateSqlFile(fileInfo, category);
    processSqlFiles();
  });
}

// Track index of current file being processed
let currentFileIndex = 0;
const sqlFiles = findSqlFiles();

/**
 * Process SQL files one by one
 */
function processSqlFiles() {
  if (currentFileIndex >= sqlFiles.length) {
    console.log('Migration complete!');
    rl.close();
    return;
  }
  
  const fileInfo = sqlFiles[currentFileIndex];
  currentFileIndex++;
  
  processSqlFile(fileInfo);
}

// Start the migration process
console.log(`Found ${sqlFiles.length} SQL files to migrate`);
if (sqlFiles.length > 0) {
  console.log('\nThis script will help organize SQL files into the migrations directory structure:');
  console.log('- schema/: Table structure and schema changes');
  console.log('- triggers/: Database triggers');
  console.log('- functions/: Database functions');
  console.log('- data/: Data migrations and seed data');
  console.log('\nFiles will be timestamped and categorized for better versioning.\n');
  processSqlFiles();
} else {
  console.log('No SQL files found to migrate.');
  rl.close();
} 