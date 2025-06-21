/**
 * Migration Manager
 * Handles database migrations in a consistent, organized way
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { promisify } = require('util');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Migration directories
const MIGRATION_DIR = path.join(process.cwd(), 'migrations');
const SCHEMA_DIR = path.join(MIGRATION_DIR, 'schema');
const TRIGGER_DIR = path.join(MIGRATION_DIR, 'triggers');
const FUNCTION_DIR = path.join(MIGRATION_DIR, 'functions');
const DATA_DIR = path.join(MIGRATION_DIR, 'data');

// Ensure directories exist
[MIGRATION_DIR, SCHEMA_DIR, TRIGGER_DIR, FUNCTION_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Executes an SQL file against the Supabase database
 */
async function executeSqlFile(filePath) {
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Executing SQL file: ${path.basename(filePath)}`);
    
    const { data, error } = await supabase.rpc('pgexecute', { 
      query: sqlContent 
    });
    
    if (error) {
      console.error(`Error executing ${path.basename(filePath)}:`, error);
      return false;
    }
    
    console.log(`Successfully executed ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`Failed to execute ${path.basename(filePath)}:`, err);
    return false;
  }
}

/**
 * Creates a new migration file
 */
function createMigration(name, type = 'schema') {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const fileName = `${timestamp}_${name}.sql`;
  
  let targetDir;
  switch (type) {
    case 'schema':
      targetDir = SCHEMA_DIR;
      break;
    case 'trigger':
      targetDir = TRIGGER_DIR;
      break;
    case 'function':
      targetDir = FUNCTION_DIR;
      break;
    case 'data':
      targetDir = DATA_DIR;
      break;
    default:
      targetDir = SCHEMA_DIR;
  }
  
  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n`);
  
  console.log(`Created migration file: ${filePath}`);
  return filePath;
}

/**
 * Run all migrations in order
 */
async function runMigrations() {
  // Get all migration files and sort them
  const getAllFiles = (dir) => 
    fs.readdirSync(dir)
      .filter(file => file.endsWith('.sql'))
      .map(file => path.join(dir, file));
  
  const files = [
    ...getAllFiles(SCHEMA_DIR),
    ...getAllFiles(FUNCTION_DIR),
    ...getAllFiles(TRIGGER_DIR),
    ...getAllFiles(DATA_DIR)
  ].sort();
  
  console.log(`Found ${files.length} migration files to execute`);
  
  for (const file of files) {
    const success = await executeSqlFile(file);
    if (!success) {
      console.error(`Migration failed at ${file}. Stopping.`);
      return false;
    }
  }
  
  console.log('All migrations completed successfully');
  return true;
}

module.exports = {
  createMigration,
  executeSqlFile,
  runMigrations
};

// Command line interface
if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  
  (async () => {
    switch (command) {
      case 'create':
        const [name, type] = args;
        if (!name) {
          console.error('Migration name required: node migration-manager.js create <name> [type]');
          process.exit(1);
        }
        createMigration(name, type);
        break;
      
      case 'run':
        const success = await runMigrations();
        process.exit(success ? 0 : 1);
        break;
      
      case 'execute':
        const [filePath] = args;
        if (!filePath) {
          console.error('File path required: node migration-manager.js execute <filePath>');
          process.exit(1);
        }
        const result = await executeSqlFile(filePath);
        process.exit(result ? 0 : 1);
        break;
      
      default:
        console.log('Available commands:');
        console.log('  create <name> [type]  - Create a new migration file');
        console.log('  run                   - Run all migrations');
        console.log('  execute <filePath>    - Execute a single SQL file');
        break;
    }
  })();
} 