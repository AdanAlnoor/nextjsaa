-- Migrated from: supplier_migration.sql (root directory)
-- Created: 2025-04-12T12:24:31.706Z

-- SQL script to migrate from text-based supplier field to supplier_id foreign key

-- Step 1: Create temporary table to track mappings
CREATE TEMP TABLE supplier_mapping (
    supplier_name TEXT PRIMARY KEY,
    supplier_id UUID
);

-- Step 2: Find all unique supplier names in purchase_orders
INSERT INTO supplier_mapping (supplier_name)
SELECT DISTINCT supplier 
FROM public.purchase_orders 
WHERE supplier IS NOT NULL AND supplier != '';

-- Step 3: For each unique supplier name, either find an existing supplier or create a new one
DO $$
DECLARE
    mapping RECORD;
BEGIN
    FOR mapping IN SELECT * FROM supplier_mapping LOOP
        -- Try to find an existing supplier with the same name
        SELECT id INTO mapping.supplier_id
        FROM public.suppliers
        WHERE name = mapping.supplier_name
        LIMIT 1;
        
        -- If no supplier found, create a new one
        IF mapping.supplier_id IS NULL THEN
            INSERT INTO public.suppliers (name, description)
            VALUES (mapping.supplier_name, 'Migrated from purchase orders')
            RETURNING id INTO mapping.supplier_id;
            
            RAISE NOTICE 'Created new supplier: % (ID: %)', mapping.supplier_name, mapping.supplier_id;
        ELSE
            RAISE NOTICE 'Found existing supplier: % (ID: %)', mapping.supplier_name, mapping.supplier_id;
        END IF;
        
        -- Update the mapping table
        UPDATE supplier_mapping
        SET supplier_id = mapping.supplier_id
        WHERE supplier_name = mapping.supplier_name;
    END LOOP;
END $$;

-- Step 4: Update purchase_orders to use supplier_id
DO $$
BEGIN
    -- First make sure supplier_id column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'purchase_orders'
        AND column_name = 'supplier_id'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);
        RAISE NOTICE 'Added supplier_id column to purchase_orders';
    END IF;
    
    -- Update purchase_orders with the corresponding supplier_id
    UPDATE public.purchase_orders po
    SET supplier_id = sm.supplier_id
    FROM supplier_mapping sm
    WHERE po.supplier = sm.supplier_name
    AND po.supplier IS NOT NULL
    AND po.supplier != '';
    
    RAISE NOTICE 'Updated purchase_orders with supplier_id values';
END $$;

-- Step 5: Check if all purchase orders have a supplier_id
SELECT COUNT(*) AS missing_supplier_id
FROM public.purchase_orders
WHERE supplier IS NOT NULL
AND supplier != ''
AND supplier_id IS NULL;

-- Step 6: Report on the migration
SELECT 
    COUNT(DISTINCT supplier) AS unique_supplier_names,
    COUNT(DISTINCT supplier_id) AS unique_supplier_ids,
    COUNT(*) AS total_purchase_orders
FROM public.purchase_orders
WHERE supplier IS NOT NULL AND supplier != '';

-- Step 7: Now we can consider whether to rename the original column or make other schema changes
-- (This is commented out because it should be a separate step after verifying the migration)
/*
DO $$
BEGIN
    -- Option 1: Keep both columns (recommended for compatibility)
    -- Or Option 2: Rename 'supplier' column to 'supplier_name' for clarity
    ALTER TABLE public.purchase_orders RENAME COLUMN supplier TO supplier_name;
    RAISE NOTICE 'Renamed supplier column to supplier_name';
    
    -- Option 3: Drop the original column (only if you're certain it's no longer needed)
    -- ALTER TABLE public.purchase_orders DROP COLUMN supplier;
END $$;
*/ 