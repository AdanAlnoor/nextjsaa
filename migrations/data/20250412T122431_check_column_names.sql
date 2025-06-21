-- Migrated from: check_column_names.sql (root directory)
-- Created: 2025-04-12T12:24:31.699Z

-- Check if the purchase_orders table has a 'vendor' column or a 'supplier' column
SELECT 
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'vendor'
  ) AS has_vendor_column,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) AS has_supplier_column;

-- If there's a vendor column but no supplier column, we need to rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'vendor'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) THEN
    EXECUTE 'ALTER TABLE public.purchase_orders RENAME COLUMN vendor TO supplier';
    RAISE NOTICE 'Renamed vendor column to supplier';
  END IF;
END $$;

-- If there's a supplier column but no vendor column, we need to create a view for backward compatibility
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'vendor'
  ) THEN
    -- Drop the view if it already exists
    EXECUTE 'DROP VIEW IF EXISTS public.purchase_orders_with_vendor';
    
    -- Create a view that maps supplier to vendor
    EXECUTE 'CREATE OR REPLACE VIEW public.purchase_orders_with_vendor AS 
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
        rejection_date
      FROM public.purchase_orders';
    
    -- Grant permissions on the view
    EXECUTE 'GRANT SELECT ON public.purchase_orders_with_vendor TO authenticated';
    EXECUTE 'GRANT SELECT ON public.purchase_orders_with_vendor TO service_role';
    
    RAISE NOTICE 'Created purchase_orders_with_vendor view for backward compatibility';
  END IF;
END $$;

-- Check all columns in the purchase_orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- Check if there are any purchase orders in the database
SELECT COUNT(*) FROM public.purchase_orders;

-- Insert a test purchase order if none exist
DO $$
DECLARE
  po_count integer;
  supplier_column_exists boolean;
BEGIN
  SELECT COUNT(*) INTO po_count FROM public.purchase_orders;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'supplier'
  ) INTO supplier_column_exists;
  
  IF po_count = 0 AND supplier_column_exists THEN
    INSERT INTO public.purchase_orders (
      name, 
      po_number, 
      supplier, 
      description, 
      total, 
      status, 
      created_at, 
      updated_at
    ) VALUES (
      'Test Purchase Order', 
      'TEST-PO-001', 
      'Test Supplier', 
      'This is a test purchase order created by SQL script', 
      1000.00, 
      'Draft', 
      NOW(), 
      NOW()
    );
    
    RAISE NOTICE 'Created a test purchase order with supplier column';
  ELSIF po_count = 0 THEN
    RAISE NOTICE 'Cannot create test purchase order: supplier column does not exist';
  ELSE
    RAISE NOTICE 'Purchase orders already exist, no test order created';
  END IF;
END $$; 