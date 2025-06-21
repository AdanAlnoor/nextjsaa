-- Migrated from: fix_purchase_order_display.sql (root directory)
-- Created: 2025-04-12T12:24:31.704Z

-- SQL script to fix purchase order display issues
-- Run this script in your Supabase SQL Editor

-- 1. Create a backup table for purchase orders (just in case)
CREATE TABLE IF NOT EXISTS purchase_orders_backup AS
SELECT * FROM purchase_orders;

-- 2. Add appropriate indexes to improve query performance
DO $$
BEGIN
    -- Check if index exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'purchase_orders' AND indexname = 'idx_purchase_orders_project_id'
    ) THEN
        CREATE INDEX idx_purchase_orders_project_id ON purchase_orders(project_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'purchase_orders' AND indexname = 'idx_purchase_orders_po_number'
    ) THEN
        CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
    END IF;
END
$$;

-- 3. Fix purchase orders with NULL project_id but valid PO numbers
-- This finds purchase orders with po_number matching PR-XXX-PO-YYY pattern and sets the appropriate project_id
WITH project_po_matches AS (
    SELECT 
        po.id AS po_id,
        po.po_number,
        p.id AS project_id,
        p.project_code
    FROM 
        purchase_orders po
    JOIN 
        projects p ON 
        (po.po_number LIKE CONCAT(p.project_code, '-PO-%') OR 
         po.po_number LIKE CONCAT('PR-', p.project_code, '-PO-%'))
    WHERE 
        po.project_id IS NULL OR po.project_id != p.id
)
UPDATE purchase_orders po
SET 
    project_id = ppm.project_id,
    updated_at = NOW()
FROM 
    project_po_matches ppm
WHERE 
    po.id = ppm.po_id;

-- 4. Set up a trigger to automatically set project_id for future purchase orders
CREATE OR REPLACE FUNCTION set_purchase_order_project_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract project code from po_number
    IF NEW.po_number ~ '^PR-[0-9A-Za-z]+-PO-' THEN
        -- Format is PR-XXX-PO-YYY, extract XXX
        NEW.project_id = (
            SELECT id FROM projects
            WHERE project_code = SUBSTRING(NEW.po_number FROM '^PR-([0-9A-Za-z]+)-PO-')
            LIMIT 1
        );
    ELSIF NEW.po_number ~ '^[A-Z]+-PO-' THEN
        -- Format is ABCD-PO-XXX, extract ABCD
        NEW.project_id = (
            SELECT id FROM projects
            WHERE project_code = SUBSTRING(NEW.po_number FROM '^([A-Z]+)-PO-')
            LIMIT 1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to prevent duplicates
DROP TRIGGER IF EXISTS set_purchase_order_project_id_trigger ON purchase_orders;

-- Create the trigger
CREATE TRIGGER set_purchase_order_project_id_trigger
BEFORE INSERT OR UPDATE OF po_number ON purchase_orders
FOR EACH ROW
WHEN (NEW.project_id IS NULL)
EXECUTE FUNCTION set_purchase_order_project_id();

-- 5. Clean up any potential duplicate purchase orders
-- This is a safer approach than deleting - it identifies duplicates based on po_number
WITH duplicate_pos AS (
    SELECT 
        po_number,
        COUNT(*) as count,
        MIN(id) as keep_id,
        array_agg(id) as all_ids
    FROM 
        purchase_orders
    GROUP BY 
        po_number
    HAVING 
        COUNT(*) > 1
)
SELECT 
    po_number,
    count,
    keep_id,
    array_to_string(all_ids, ',') as ids_to_check
FROM 
    duplicate_pos
ORDER BY 
    count DESC;

-- 6. Update filteredPurchaseOrders in the client code
-- This SQL can't directly modify your React code, but you can run this query
-- to return all purchase orders for project ID 70369ddf-31aa-4261-9382-c6fa67ebacaa
-- to verify they exist and have the correct data structure
SELECT 
    id, 
    po_number as "poNumber",
    name,
    supplier,
    total,
    COALESCE(paid_amount, 0) as "paidBills",
    (total - COALESCE(paid_amount, 0)) as "dueBills",
    status,
    created_at,
    updated_at,
    project_id as "projectId"
FROM 
    purchase_orders
WHERE 
    project_id = '70369ddf-31aa-4261-9382-c6fa67ebacaa'
ORDER BY 
    created_at DESC; 