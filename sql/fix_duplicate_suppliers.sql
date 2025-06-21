-- SQL script to fix duplicate suppliers and ensure data integrity

-- Start a transaction to ensure all operations succeed or fail together
BEGIN;

-- Step 1: Log the current state
DO $$
DECLARE
    total_suppliers INTEGER;
    duplicate_ids INTEGER;
    uuid_as_name INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_suppliers FROM public.suppliers;
    
    -- Count suppliers where the ID appears more than once
    SELECT COUNT(*) INTO duplicate_ids 
    FROM (
        SELECT id, COUNT(*) 
        FROM public.suppliers 
        GROUP BY id 
        HAVING COUNT(*) > 1
    ) AS dupes;
    
    -- Count suppliers where the name looks like a UUID
    SELECT COUNT(*) INTO uuid_as_name 
    FROM public.suppliers 
    WHERE name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    RAISE NOTICE 'Current state: % total suppliers, % with duplicate IDs, % with UUID as name', 
        total_suppliers, duplicate_ids, uuid_as_name;
END $$;

-- Step 2: Create a temporary table to track which suppliers to keep and which to remove
CREATE TEMP TABLE supplier_cleanup (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    should_keep BOOLEAN NOT NULL,
    replacement_id UUID
);

-- Step 3: Insert all suppliers into the cleanup table, marking those to keep
INSERT INTO supplier_cleanup (id, name, should_keep, replacement_id)
SELECT 
    id, 
    name, 
    -- Keep suppliers where the name is not a UUID
    NOT (name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
    NULL
FROM public.suppliers;

-- Step 4: For suppliers with UUID as name, find their replacement
UPDATE supplier_cleanup
SET replacement_id = (
    SELECT id 
    FROM public.suppliers 
    WHERE id::text = supplier_cleanup.name
    LIMIT 1
)
WHERE should_keep = FALSE
AND EXISTS (
    SELECT 1 
    FROM public.suppliers 
    WHERE id::text = supplier_cleanup.name
);

-- Step 5: Update purchase orders to use the correct supplier_id
UPDATE public.purchase_orders
SET supplier_id = sc.replacement_id
FROM supplier_cleanup sc
WHERE public.purchase_orders.supplier_id = sc.id
AND sc.should_keep = FALSE
AND sc.replacement_id IS NOT NULL;

-- Step 6: Delete the duplicate suppliers
DELETE FROM public.suppliers
WHERE id IN (
    SELECT id 
    FROM supplier_cleanup 
    WHERE should_keep = FALSE
);

-- Step 7: Add a trigger to prevent creating suppliers with UUID as name
CREATE OR REPLACE FUNCTION prevent_uuid_as_supplier_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Cannot create supplier with UUID as name: %', NEW.name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_supplier_name ON public.suppliers;
CREATE TRIGGER check_supplier_name
BEFORE INSERT OR UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION prevent_uuid_as_supplier_name();

-- Step 8: Log the results
DO $$
DECLARE
    suppliers_deleted INTEGER;
    purchase_orders_updated INTEGER;
    remaining_suppliers INTEGER;
BEGIN
    SELECT COUNT(*) INTO suppliers_deleted 
    FROM supplier_cleanup 
    WHERE should_keep = FALSE;
    
    SELECT COUNT(*) INTO purchase_orders_updated 
    FROM supplier_cleanup sc
    JOIN public.purchase_orders po ON po.supplier_id = sc.replacement_id
    WHERE sc.should_keep = FALSE;
    
    SELECT COUNT(*) INTO remaining_suppliers 
    FROM public.suppliers;
    
    RAISE NOTICE 'Results: % suppliers deleted, % purchase orders updated, % suppliers remaining', 
        suppliers_deleted, purchase_orders_updated, remaining_suppliers;
END $$;

-- Step 9: Add a constraint to ensure supplier names are not UUIDs
ALTER TABLE public.suppliers ADD CONSTRAINT check_name_not_uuid
CHECK (name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Step 10: Verify the fix by checking for any remaining issues
DO $$
DECLARE
    uuid_as_name INTEGER;
    duplicate_ids INTEGER;
BEGIN
    -- Count suppliers where the name looks like a UUID
    SELECT COUNT(*) INTO uuid_as_name 
    FROM public.suppliers 
    WHERE name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Count suppliers where the ID appears more than once
    SELECT COUNT(*) INTO duplicate_ids 
    FROM (
        SELECT id, COUNT(*) 
        FROM public.suppliers 
        GROUP BY id 
        HAVING COUNT(*) > 1
    ) AS dupes;
    
    IF uuid_as_name > 0 OR duplicate_ids > 0 THEN
        RAISE WARNING 'There are still issues: % suppliers with UUID as name, % with duplicate IDs', 
            uuid_as_name, duplicate_ids;
    ELSE
        RAISE NOTICE 'All issues fixed successfully!';
    END IF;
END $$;

-- Commit the transaction
COMMIT; 