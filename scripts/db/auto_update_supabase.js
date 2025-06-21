require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and service role key are required.');
  console.error('Make sure they are defined in .env.local');
  console.error('For security reasons, you should use the service role key, not the anon key.');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute a SQL query using Supabase's rpc function
 * @param {string} sql - The SQL query to execute
 * @returns {Promise<Object>} - The result of the query
 */
async function executeSql(sql) {
  try {
    // Using the rpc function to execute SQL
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error executing SQL:', error.message);
    return { data: null, error };
  }
}

/**
 * Read and execute a SQL file
 * @param {string} filePath - Path to the SQL file
 * @returns {Promise<boolean>} - Whether the execution was successful
 */
async function executeSqlFile(filePath) {
  try {
    console.log(`Executing SQL file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL file by semicolons to execute each statement separately
    // This is a simple approach and might not work for all SQL files
    // especially those with functions, triggers, etc.
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing statement: ${statement.substring(0, 50)}...`);
      const { error } = await executeSql(statement);
      
      if (error) {
        console.error(`Error executing statement: ${error.message}`);
        return false;
      }
    }
    
    console.log(`Successfully executed SQL file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error reading or executing SQL file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Execute all SQL files in a directory
 * @param {string} dirPath - Path to the directory containing SQL files
 * @returns {Promise<void>}
 */
async function executeSqlDirectory(dirPath) {
  try {
    console.log(`Executing SQL files in directory: ${dirPath}`);
    
    // Get all SQL files in the directory
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure files are executed in order
    
    if (files.length === 0) {
      console.log('No SQL files found in the directory.');
      return;
    }
    
    console.log(`Found ${files.length} SQL files.`);
    
    // Execute each file
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const success = await executeSqlFile(filePath);
      
      if (!success) {
        console.error(`Failed to execute ${file}. Stopping execution.`);
        break;
      }
    }
    
    console.log('Finished executing SQL files.');
  } catch (error) {
    console.error('Error executing SQL directory:', error.message);
  }
}

/**
 * Main function to run the script
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node auto_update_supabase.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  execute-file <file-path>    Execute a single SQL file');
    console.log('  execute-dir <dir-path>      Execute all SQL files in a directory');
    console.log('  execute-migrations          Execute all migration files in supabase/migrations');
    console.log('');
    console.log('Examples:');
    console.log('  node auto_update_supabase.js execute-file create_table.sql');
    console.log('  node auto_update_supabase.js execute-dir ./sql-scripts');
    console.log('  node auto_update_supabase.js execute-migrations');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'execute-file':
      if (args.length < 2) {
        console.error('Error: File path is required for execute-file command.');
        return;
      }
      await executeSqlFile(args[1]);
      break;
      
    case 'execute-dir':
      if (args.length < 2) {
        console.error('Error: Directory path is required for execute-dir command.');
        return;
      }
      await executeSqlDirectory(args[1]);
      break;
      
    case 'execute-migrations':
      await executeSqlDirectory('./supabase/migrations');
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      break;
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 