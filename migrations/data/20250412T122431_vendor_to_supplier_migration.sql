-- Migrated from: vendor_to_supplier_migration.sql (root directory)
-- Created: 2025-04-12T12:24:31.707Z

-- SQL script to rename vendor column to supplier in purchase_orders table

-- Step 1: Check if the purchase_orders table has a 'vendor' column or a 'supplier' column
DO $$
DECLARE
  has_vendor_column BOOLEAN;
  has_supplier_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' 
    AND column_name = 'vendor'
  ) INTO has_vendor_column;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' 
    AND column_name = 'supplier'
  ) INTO has_supplier_column;
  
  -- Step 2: Rename the vendor column to supplier if it exists
  IF has_vendor_column AND NOT has_supplier_column THEN
    -- Check if the table has any rows
    DECLARE
      row_count INTEGER;
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM public.purchase_orders' INTO row_count;
      RAISE NOTICE 'Found % rows in purchase_orders table', row_count;
      
      -- Rename the column
      ALTER TABLE public.purchase_orders RENAME COLUMN vendor TO supplier;
      RAISE NOTICE 'Renamed vendor column to supplier';
    END;
  ELSIF has_supplier_column AND NOT has_vendor_column THEN
    RAISE NOTICE 'The table already has a supplier column and no vendor column';
  ELSIF has_supplier_column AND has_vendor_column THEN
    RAISE NOTICE 'The table has both supplier and vendor columns. Manual intervention required.';
  ELSE
    RAISE NOTICE 'Neither supplier nor vendor column found in purchase_orders table.';
  END IF;
  
  -- Step 3: Create a view for backward compatibility if needed
  IF has_supplier_column AND NOT has_vendor_column THEN
    -- Create a view that maps supplier to vendor for backward compatibility
    DROP VIEW IF EXISTS public.purchase_orders_with_vendor;
    CREATE OR REPLACE VIEW public.purchase_orders_with_vendor AS
    SELECT 
      id,
      name,
      po_number,
      supplier AS vendor,
      description,
      approval_deadline,
      delivery_deadline,
      total,
      status,
      project_id,
      created_by,
      created_at,
      updated_at,
      approval_date,
      approval_notes,
      rejection_reason,
      rejection_date,
      parent_id,
      is_parent,
      level,
      order_index
    FROM public.purchase_orders;
    
    -- Grant access to the view
    GRANT SELECT ON public.purchase_orders_with_vendor TO authenticated;
    GRANT SELECT ON public.purchase_orders_with_vendor TO service_role;
    
    RAISE NOTICE 'Created purchase_orders_with_vendor view for backward compatibility';
  END IF;
END $$;

-- Step 4: Verify the changes
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'purchase_orders' 
  AND column_name IN ('supplier', 'vendor')
ORDER BY 
  column_name;

-- Step 5: Test the new column with a sample insert
INSERT INTO public.purchase_orders (
  name, 
  po_number, 
  supplier, 
  description, 
  total, 
  status
) VALUES (
  'Test Purchase Order',
  'TEST-PO-001',
  'Test Supplier',
  'This is a test purchase order after vendor to supplier migration',
  1000.00,
  'Draft'
);

-- Step 6: Verify we can query both the table and the view
-- Query from the table
SELECT id, name, po_number, supplier, status
FROM public.purchase_orders
ORDER BY created_at DESC
LIMIT 5;

-- Query from the view
SELECT id, name, po_number, vendor, status
FROM public.purchase_orders_with_vendor
ORDER BY created_at DESC
LIMIT 5;
