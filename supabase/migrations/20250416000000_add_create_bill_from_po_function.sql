-- Function to create a bill from a purchase order
-- This handles the database-side conversion from PO to bill
CREATE OR REPLACE FUNCTION create_bill_from_po(
    p_purchase_order_id UUID,
    p_bill_reference TEXT,
    p_amount DECIMAL,
    p_issue_date DATE,
    p_project_id UUID,
    p_status TEXT DEFAULT 'Pending',
    p_due_date DATE DEFAULT NULL,
    p_bill_number TEXT DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bill_id UUID;
    v_po_record RECORD;
    v_po_items RECORD;
    v_bill_data JSONB;
BEGIN
    -- First, get the purchase order details
    SELECT * INTO v_po_record
    FROM purchase_orders
    WHERE id = p_purchase_order_id;
    
    IF v_po_record IS NULL THEN
        RAISE EXCEPTION 'Purchase order with ID % not found', p_purchase_order_id;
    END IF;
    
    -- Create the bill
    INSERT INTO bills (
        bill_number,
        bill_reference,
        supplier_id,
        project_id,
        purchase_order_id,
        issue_date,
        due_date,
        amount,
        status,
        name
    ) VALUES (
        p_bill_number,
        p_bill_reference,
        COALESCE(p_supplier_id, v_po_record.supplier_id),
        p_project_id,
        p_purchase_order_id,
        p_issue_date,
        p_due_date,
        p_amount,
        p_status,
        'Bill for ' || v_po_record.po_number
    )
    RETURNING id INTO v_bill_id;
    
    -- Convert PO items to bill items
    FOR v_po_items IN (
        SELECT * FROM purchase_order_items 
        WHERE purchase_order_id = p_purchase_order_id
    ) LOOP
        INSERT INTO bill_items (
            bill_id,
            description,
            quantity,
            unit,
            unit_cost,
            amount,
            internal_note,
            cost_control_item_id
        ) VALUES (
            v_bill_id,
            v_po_items.description,
            v_po_items.quantity,
            v_po_items.unit,
            COALESCE(v_po_items.price, v_po_items.unit_cost),
            v_po_items.amount,
            v_po_items.internal_note,
            v_po_items.cost_control_item_id
        );
    END LOOP;
    
    -- Update the purchase order status
    UPDATE purchase_orders
    SET 
        status = 'Billed',
        linked_bill = p_bill_number,
        updated_at = NOW()
    WHERE id = p_purchase_order_id;
    
    -- Return bill data
    SELECT 
        jsonb_build_object(
            'id', b.id,
            'bill_number', b.bill_number,
            'supplier_id', b.supplier_id,
            'project_id', b.project_id,
            'purchase_order_id', b.purchase_order_id,
            'amount', b.amount,
            'status', b.status,
            'created_at', b.created_at
        ) INTO v_bill_data
    FROM bills b
    WHERE b.id = v_bill_id;
    
    RETURN v_bill_data;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$; 