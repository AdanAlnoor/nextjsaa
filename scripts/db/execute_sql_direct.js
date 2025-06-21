require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sqlContent) {
  try {
    console.log('Executing SQL...');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .replace(/--.*$/gm, '') // Remove comments
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute.`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Execute the SQL statement
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        return false;
      }
      
      console.log(`Statement ${i + 1} executed successfully.`);
    }
    
    console.log('All SQL statements executed successfully!');
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error.message);
    return false;
  }
}

async function main() {
  // Check if a file path was provided
  if (process.argv.length < 3) {
    console.error('Usage: node execute_sql_direct.js <path-to-sql-file>');
    process.exit(1);
  }

  const sqlFilePath = process.argv[2];
  
  // Check if the file exists
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: File '${sqlFilePath}' does not exist.`);
    process.exit(1);
  }
  
  // Check if it's a SQL file
  if (!sqlFilePath.toLowerCase().endsWith('.sql')) {
    console.warn(`Warning: File '${sqlFilePath}' does not have a .sql extension.`);
  }
  
  // Read the SQL file
  try {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`Read SQL file: ${sqlFilePath}`);
    
    // First, check if the exec_sql function exists
    const { data: funcExists, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'exec_sql')
      .maybeSingle();
    
    if (funcError) {
      console.error('Error checking for exec_sql function:', funcError);
      
      // Create the exec_sql function
      console.log('Creating exec_sql function...');
      const createFuncSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result JSONB;
        BEGIN
          EXECUTE sql;
          result := jsonb_build_object('success', true, 'message', 'SQL executed successfully');
          RETURN result;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
          );
        END;
        $$;
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createFuncSQL });
      
      if (createError) {
        console.error('Error creating exec_sql function:', createError);
        console.error('You may need to create this function manually in the Supabase SQL editor:');
        console.error(createFuncSQL);
        process.exit(1);
      }
      
      console.log('exec_sql function created successfully.');
    }
    
    // Execute the SQL
    const success = await executeSql(sqlContent);
    
    if (success) {
      console.log('SQL execution completed successfully.');
    } else {
      console.error('SQL execution failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main(); 