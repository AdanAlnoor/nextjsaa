import { createClient } from '@/shared/lib/supabase/client';

/**
 * This script checks if purchase order migrations have been applied
 * and runs them if necessary
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/check-migrations.ts
 */
async function checkMigrations() {
  console.log('Checking purchase order migrations...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient();
    console.log('Supabase client initialized');
    
    // Check authentication
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Authentication error:', authError.message);
      return;
    }
    
    if (!authData.session) {
      console.error('No active session. Please login first.');
      return;
    }
    
    console.log('Authentication verified ✓');
    
    // Check if purchase_orders table exists
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('check_table_exists', { table_name: 'purchase_orders' });
    
    if (tablesError) {
      console.error('Error checking if table exists:', tablesError.message);
      
      // Try creating the RPC function if it doesn't exist
      console.log('Creating check_table_exists function...');
      const { error: createFnError } = await supabase.rpc('create_check_table_exists_function', {});
      
      if (createFnError) {
        console.error('Error creating function:', createFnError.message);
        console.log('Falling back to information_schema query...');
        
        // Direct query to information_schema
        const { data: schemaData, error: schemaError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'purchase_orders');
        
        if (schemaError) {
          console.error('Error querying information_schema:', schemaError.message);
          return;
        }
        
        if (!schemaData || schemaData.length === 0) {
          console.log('purchase_orders table does not exist! Running migrations...');
          await runMigrations();
        } else {
          console.log('purchase_orders table exists ✓');
        }
      } else {
        // Try again with the newly created function
        const { data: recheckData, error: recheckError } = await supabase
          .rpc('check_table_exists', { table_name: 'purchase_orders' });
        
        if (recheckError) {
          console.error('Error rechecking table:', recheckError.message);
          return;
        }
        
        if (!recheckData) {
          console.log('purchase_orders table does not exist! Running migrations...');
          await runMigrations();
        } else {
          console.log('purchase_orders table exists ✓');
        }
      }
    } else {
      if (!tablesData) {
        console.log('purchase_orders table does not exist! Running migrations...');
        await runMigrations();
      } else {
        console.log('purchase_orders table exists ✓');
      }
    }
    
    console.log('Migration check complete');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

async function runMigrations() {
  console.log('Running purchase order migrations...');
  
  try {
    const supabase = createClient();
    
    // Create purchase_orders table
    const createPOTableSQL = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        po_number TEXT NOT NULL,
        name TEXT NOT NULL,
        assigned_to TEXT NOT NULL,
        description TEXT,
        total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        paid_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
        due_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Draft',
        project_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    
    // Create purchase_order_items table
    const createPOItemsTableSQL = `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_order_id UUID NOT NULL,
        description TEXT NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        internal_note TEXT,
        name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    
    // Run SQL commands
    const { error: poTableError } = await supabase.rpc('run_sql', { sql: createPOTableSQL });
    if (poTableError) {
      console.error('Error creating purchase_orders table:', poTableError.message);
      return;
    }
    
    const { error: poItemsTableError } = await supabase.rpc('run_sql', { sql: createPOItemsTableSQL });
    if (poItemsTableError) {
      console.error('Error creating purchase_order_items table:', poItemsTableError.message);
      return;
    }
    
    console.log('Migration complete ✓');
    
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// Create RPC function to check table existence
async function createFunctions() {
  const supabase = createClient();
  
  const createCheckTableFnSQL = `
    CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      table_exists boolean;
    BEGIN
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
      ) INTO table_exists;
      
      RETURN table_exists;
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION check_table_exists TO authenticated;
  `;
  
  const createRunSqlFnSQL = `
    CREATE OR REPLACE FUNCTION run_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION run_sql TO authenticated;
  `;
  
  const createCreateFnSQL = `
    CREATE OR REPLACE FUNCTION create_check_table_exists_function()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE '
        CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        DECLARE
          table_exists boolean;
        BEGIN
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = ''public''
            AND table_name = $1
          ) INTO table_exists;
          
          RETURN table_exists;
        END;
        $func$;
        
        GRANT EXECUTE ON FUNCTION check_table_exists TO authenticated;
      ';
    END;
    $$;
    
    GRANT EXECUTE ON FUNCTION create_check_table_exists_function TO authenticated;
  `;
  
  // Create functions in Supabase
  const { error: checkFnError } = await supabase.rpc('run_sql', { sql: createCheckTableFnSQL });
  if (checkFnError) {
    console.error('Error creating check_table_exists function:', checkFnError.message);
  }
  
  const { error: runSqlFnError } = await supabase.rpc('run_sql', { sql: createRunSqlFnSQL });
  if (runSqlFnError) {
    console.error('Error creating run_sql function:', runSqlFnError.message);
  }
  
  const { error: createFnError } = await supabase.rpc('run_sql', { sql: createCreateFnSQL });
  if (createFnError) {
    console.error('Error creating create_check_table_exists_function:', createFnError.message);
  }
}

// Run the functions
checkMigrations(); 