-- Migrated from: create_suppliers_table.sql (root directory)
-- Created: 2025-04-12T12:24:31.700Z

-- SQL script to create and set up suppliers table

-- Step 1: Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add RLS policies for suppliers table
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read suppliers
CREATE POLICY "Allow all users to view suppliers"
  ON public.suppliers
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert suppliers
CREATE POLICY "Allow all users to insert suppliers"
  ON public.suppliers
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update suppliers
CREATE POLICY "Allow all users to update suppliers"
  ON public.suppliers
  FOR UPDATE
  USING (true);

-- Allow authenticated users to delete suppliers
CREATE POLICY "Allow all users to delete suppliers"
  ON public.suppliers
  FOR DELETE
  USING (true);

-- Step 3: Grant permissions to authenticated users and service role
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- Step 5: Insert sample data if the table is empty
DO $$
DECLARE
  supplier_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO supplier_count FROM public.suppliers;
  
  IF supplier_count = 0 THEN
    INSERT INTO public.suppliers (name, description) VALUES 
      ('5 Star Co', 'Building materials supplier'),
      ('RGH Steel', 'Steel and metal products provider'),
      ('Beautiful', 'Interior design and decoration supplies'),
      ('ABC Suppliers', 'General construction materials'),
      ('XYZ Construction', 'Heavy equipment and machinery');
      
    RAISE NOTICE 'Inserted sample suppliers';
  ELSE
    RAISE NOTICE 'Suppliers already exist, no sample data inserted';
  END IF;
END $$;

-- Step 6: Add foreign key constraint to purchase_orders if needed
DO $$
BEGIN
  -- Check if the supplier column is a foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'purchase_orders'
      AND kcu.column_name = 'supplier'
  ) THEN
    -- Before we proceed, check if the supplier column contains values
    DECLARE
      supplier_text_count INTEGER;
    BEGIN
      -- Count how many purchase orders have text in supplier field
      SELECT COUNT(*) INTO supplier_text_count 
      FROM public.purchase_orders
      WHERE supplier IS NOT NULL;
      
      IF supplier_text_count > 0 THEN
        -- We need to migrate existing data
        RAISE NOTICE 'Found % purchase orders with supplier names that need to be migrated', supplier_text_count;
        RAISE NOTICE 'Please run the supplier_migration.sql script to migrate existing data before modifying the column type';
      ELSE
        -- If no data exists, we can safely modify the column to be a UUID
        -- First, check the data type
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'purchase_orders'
            AND column_name = 'supplier'
            AND data_type = 'character varying'
        ) THEN
          -- Add a new supplier_id column
          ALTER TABLE public.purchase_orders ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);
          RAISE NOTICE 'Added supplier_id column to purchase_orders';
        END IF;
      END IF;
    END;
  END IF;
END $$;

-- Step 7: Verify the suppliers table
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_schema = 'public'
  AND table_name = 'suppliers'
ORDER BY 
  ordinal_position;

-- Display count of suppliers
SELECT COUNT(*) AS supplier_count FROM public.suppliers; 