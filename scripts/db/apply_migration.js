console.log(`
======================================================================
                COST CONTROL TABLE CREATION INSTRUCTIONS
======================================================================

The "cost_control_items" table needs to be created in your Supabase database.
Follow these steps to create it manually:

1. Log in to your Supabase dashboard at: https://app.supabase.com/
2. Select your project
3. Go to "Table Editor" in the left sidebar
4. Click "New Table" button
5. Create a table with the following settings:

   Name: cost_control_items
   
   Enable Row Level Security (RLS): Yes
   
   Columns:
   - id (type: uuid, primary key, default: uuid_generate_v4())
   - project_id (type: text, foreign key to projects.id, not null)
   - parent_id (type: uuid, foreign key to cost_control_items.id, nullable)
   - name (type: text, not null)
   - bo_amount (type: decimal(10,2), default: 0, not null)
   - actual_amount (type: decimal(10,2), default: 0, not null)
   - paid_bills (type: decimal(10,2), default: 0, not null)
   - external_bills (type: decimal(10,2), default: 0, not null)
   - pending_bills (type: decimal(10,2), default: 0, not null)
   - wages (type: decimal(10,2), default: 0, not null)
   - is_parent (type: boolean, default: false, not null)
   - level (type: integer, default: 0, not null)
   - order_index (type: integer, default: 0, not null)
   - imported_from_estimate (type: boolean, default: false)
   - import_date (type: timestamp with time zone)
   - created_at (type: timestamp with time zone, default: now(), not null)
   - updated_at (type: timestamp with time zone, default: now(), not null)

6. After creating the table, go to "Authentication" > "Policies" in the sidebar
7. Find the "cost_control_items" table and add the following policies:
   - For SELECT: Allow access to authenticated users
   - For INSERT: Allow access to authenticated users
   - For UPDATE: Allow access to authenticated users
   - For DELETE: Allow access to authenticated users

Once these steps are completed, the import from estimate to cost control should work correctly.

Alternatively, you can use the Supabase SQL Editor to run the SQL file
"create_cost_control_table.sql" that was created in your project directory.
======================================================================
`); 