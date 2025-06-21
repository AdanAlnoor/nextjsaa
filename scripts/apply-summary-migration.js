const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../migrations/schema/20250618_create_estimate_project_summary_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration to create estimate_project_summary table...');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      
      // For debugging, show first 100 chars of the statement
      console.log(`Statement preview: ${statement.substring(0, 100)}...`);
      
      const { error } = await supabase.rpc('execute_sql', { 
        sql_query: statement 
      });

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        // Continue with other statements even if one fails
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\nMigration completed!');
    
    // Test the summary table
    console.log('\nTesting estimate_project_summary table...');
    const { data, error: testError } = await supabase
      .from('estimate_project_summary')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('Error testing summary table:', testError);
    } else {
      console.log('Summary table is accessible');
      console.log('Sample data:', data);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration();