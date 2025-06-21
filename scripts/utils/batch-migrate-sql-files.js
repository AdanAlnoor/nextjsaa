/**
 * Batch SQL Files Migration Script
 * Automates organizing SQL files into migration structure without requiring user input
 */
const fs = require('fs');
const path = require('path');

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
 * Categorize a SQL file based on content analysis
 * @param {string} filePath - Path to the SQL file
 * @returns {string} The category (schema, trigger, function, data)
 */
function categorizeSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  
  // Check for trigger operations
  if (
    content.includes('create trigger') || 
    content.includes('drop trigger') || 
    content.includes('alter trigger') || 
    fileName.includes('trigger')
  ) {
    return 'trigger';
  }
  
  // Check for function operations
  if (
    content.includes('create function') || 
    content.includes('create or replace function') || 
    content.includes('drop function') || 
    fileName.includes('function')
  ) {
    return 'function';
  }
  
  // Check for data operations
  if (
    (content.includes('insert into') && !content.includes('create table')) || 
    content.includes('update ') || 
    content.includes('delete from') ||
    fileName.includes('data') || 
    fileName.includes('seed')
  ) {
    return 'data';
  }
  
  // Check for schema operations
  if (
    content.includes('create table') || 
    content.includes('alter table') || 
    content.includes('drop table') || 
    content.includes('add column') || 
    content.includes('drop column') || 
    content.includes('alter column') ||
    content.includes('create index') || 
    content.includes('create extension')
  ) {
    return 'schema';
  }
  
  // Default to schema if no specific pattern is matched
  return 'schema';
}

/**
 * Move an SQL file to the appropriate migrations directory
 */
function migrateSqlFile(fileInfo) {
  try {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    
    // Determine source path based on whether file is in root or sql dir
    const sourcePath = fileInfo.isRoot 
      ? path.join(rootDir, fileInfo.file) 
      : path.join(sqlDir, fileInfo.file);
    
    // Categorize the file
    const category = categorizeSqlFile(sourcePath);
    
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
    console.log(`Migrated ${fileInfo.file} -> ${path.relative(rootDir, targetPath)} (${category})`);
    return true;
  } catch (err) {
    console.error(`Error migrating ${fileInfo.file}:`, err);
    return false;
  }
}

/**
 * Process all SQL files in batch
 */
function processSqlFiles() {
  const sqlFiles = findSqlFiles();
  console.log(`Found ${sqlFiles.length} SQL files to migrate\n`);
  
  if (sqlFiles.length === 0) {
    console.log('No SQL files found to migrate.');
    return;
  }
  
  console.log('Migrating files to these categories:');
  console.log('- schema/: Table structure and schema changes');
  console.log('- triggers/: Database triggers');
  console.log('- functions/: Database functions');
  console.log('- data/: Data migrations and seed data\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const fileInfo of sqlFiles) {
    const success = migrateSqlFile(fileInfo);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\nMigration summary:`);
  console.log(`- ${successCount} files successfully migrated`);
  if (failCount > 0) {
    console.log(`- ${failCount} files failed to migrate`);
  }
}

// Run the batch migration
processSqlFiles(); 