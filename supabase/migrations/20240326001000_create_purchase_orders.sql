-- Create enum for purchase order status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE po_status AS ENUM ('Draft', 'Pending', 'Approved');
    END IF;
END $$;

-- Check if tables exist before dropping them
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'costline_items') THEN
        DROP TABLE IF EXISTS costline_items CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'purchase_orders') THEN
        DROP TABLE IF EXISTS purchase_orders CASCADE;
    END IF;
END $$;

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT NOT NULL,
    name TEXT NOT NULL,
    bills TEXT,
    assigned_to TEXT NOT NULL,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
    due_bills DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status po_status NOT NULL DEFAULT 'Draft',
    send_date TIMESTAMP WITH TIME ZONE,
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT,
    approval_date TIMESTAMP WITH TIME ZONE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create costline items table
CREATE TABLE IF NOT EXISTS costline_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    costline_id UUID REFERENCES costlines(id),
    name TEXT,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS purchase_orders_project_id_idx ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS costline_items_purchase_order_id_idx ON costline_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS costline_items_costline_id_idx ON costline_items(costline_id);

-- Check if functions/triggers exist before attempting to drop them
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_purchase_orders_updated_at') THEN
        DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_purchase_orders_updated_at') THEN
        DROP FUNCTION IF EXISTS update_purchase_orders_updated_at();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_costline_items_updated_at') THEN
        DROP TRIGGER IF EXISTS update_costline_items_updated_at ON costline_items;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_costline_items_updated_at') THEN
        DROP FUNCTION IF EXISTS update_costline_items_updated_at();
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_purchase_order_total') THEN
        DROP TRIGGER IF EXISTS update_purchase_order_total ON costline_items;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_purchase_order_total') THEN
        DROP FUNCTION IF EXISTS update_purchase_order_total();
    END IF;
END $$;

-- Create trigger to update the updated_at timestamp for purchase orders
CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_orders_updated_at();

-- Create trigger to update the updated_at timestamp for costline items
CREATE OR REPLACE FUNCTION update_costline_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_costline_items_updated_at
    BEFORE UPDATE ON costline_items
    FOR EACH ROW
    EXECUTE FUNCTION update_costline_items_updated_at();

-- Create trigger to update purchase order total when costline items change
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET total = (
        SELECT COALESCE(SUM(amount), 0)
        FROM costline_items
        WHERE purchase_order_id = NEW.purchase_order_id
    )
    WHERE id = NEW.purchase_order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_order_total
    AFTER INSERT OR UPDATE OR DELETE ON costline_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_total(); 