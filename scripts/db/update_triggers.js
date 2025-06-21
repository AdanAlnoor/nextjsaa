const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTriggers() {
  try {
    console.log('Dropping old trigger and function...');
    
    // Drop old trigger and function
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `
        DROP TRIGGER IF EXISTS update_parent_builder_cost ON public.estimate_items;
        DROP FUNCTION IF EXISTS update_parent_builder_cost() CASCADE;
      `
    });
    
    if (dropError) {
      console.error('Error dropping old trigger and function:', dropError);
      return;
    }
    
    console.log('Creating new functions and triggers...');
    
    // Create new functions and triggers
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `
        -- Create function to automatically calculate amount for level 2 items
        CREATE OR REPLACE FUNCTION calculate_amount()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.level = 2 THEN
                NEW.amount = COALESCE(NEW.quantity * NEW.rate, 0);
            END IF;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Create trigger to automatically calculate amount
        DROP TRIGGER IF EXISTS calculate_estimate_items_amount ON public.estimate_items;
        CREATE TRIGGER calculate_estimate_items_amount
            BEFORE INSERT OR UPDATE ON public.estimate_items
            FOR EACH ROW
            EXECUTE FUNCTION calculate_amount();

        -- Create function to update parent amount
        CREATE OR REPLACE FUNCTION update_parent_amount()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Update immediate parent's amount
            IF TG_OP IN ('DELETE', 'UPDATE') THEN
                UPDATE public.estimate_items
                SET amount = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM public.estimate_items
                    WHERE parent_id = OLD.parent_id
                )
                WHERE id = OLD.parent_id;
            END IF;

            IF TG_OP IN ('INSERT', 'UPDATE') THEN
                -- Update immediate parent's amount
                UPDATE public.estimate_items
                SET amount = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM public.estimate_items
                    WHERE parent_id = NEW.parent_id
                )
                WHERE id = NEW.parent_id;

                -- Update grandparent's amount if exists
                UPDATE public.estimate_items
                SET amount = (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM public.estimate_items
                    WHERE parent_id = p.id
                )
                FROM public.estimate_items p
                WHERE p.id = (
                    SELECT parent_id 
                    FROM public.estimate_items 
                    WHERE id = NEW.parent_id
                );
            END IF;

            RETURN COALESCE(NEW, OLD);
        END;
        $$ language 'plpgsql';

        -- Create trigger to automatically update parent amount
        DROP TRIGGER IF EXISTS update_parent_estimate_items_amount ON public.estimate_items;
        CREATE TRIGGER update_parent_estimate_items_amount
            AFTER INSERT OR UPDATE OR DELETE ON public.estimate_items
            FOR EACH ROW
            EXECUTE FUNCTION update_parent_amount();
      `
    });
    
    if (createError) {
      console.error('Error creating new functions and triggers:', createError);
      return;
    }
    
    console.log('Successfully updated triggers!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updateTriggers(); 