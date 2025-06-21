-- Migrated from: remove_vendor_references.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- SQL script to remove all vendor references from the database

-- Step 1: Drop the vendor compatibility view if it exists
DROP VIEW IF EXISTS public.purchase_orders_with_vendor;

-- Step 2: Make sure the purchase_orders table uses only 'supplier' and not 'vendor'
DO $$
DECLARE
  has_vendor_column BOOLEAN;
BEGIN
  -- Check if 'vendor' column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'purchase_orders' 
    AND column_name = 'vendor'
  ) INTO has_vendor_column;
  
  -- If 'vendor' column exists, rename it to 'supplier'
  IF has_vendor_column THEN
    -- Check if 'supplier' column already exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'purchase_orders' 
      AND column_name = 'supplier'
    ) THEN
      -- Both columns exist, need to merge data
      -- In this case, we'll prioritize the existing supplier data
      -- but use vendor data if supplier is null
      UPDATE public.purchase_orders
      SET supplier = vendor
      WHERE supplier IS NULL AND vendor IS NOT NULL;
      
      -- Then drop the vendor column
      ALTER TABLE public.purchase_orders DROP COLUMN vendor;
      RAISE NOTICE 'Merged vendor data into supplier and dropped vendor column';
    ELSE
      -- Only vendor exists, rename it to supplier
      ALTER TABLE public.purchase_orders RENAME COLUMN vendor TO supplier;
      RAISE NOTICE 'Renamed vendor column to supplier';
    END IF;
  ELSE
    RAISE NOTICE 'No vendor column found, no renaming needed';
  END IF;
END $$;

-- Step 3: Verify the changes
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_schema = 'public'
  AND table_name = 'purchase_orders' 
  AND column_name = 'supplier'
ORDER BY 
  column_name;

-- Step 4: Verify the purchase_orders_with_vendor view no longer exists
SELECT 
  table_name
FROM 
  information_schema.views
WHERE 
  table_schema = 'public'
  AND table_name = 'purchase_orders_with_vendor'; 