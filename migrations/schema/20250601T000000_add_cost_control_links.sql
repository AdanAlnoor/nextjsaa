-- Add cost_control_item_id to bill_items table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bill_items'
        AND column_name = 'cost_control_item_id'
    ) THEN
        ALTER TABLE public.bill_items ADD COLUMN cost_control_item_id UUID REFERENCES public.cost_control_items(id) ON DELETE SET NULL;
        COMMENT ON COLUMN public.bill_items.cost_control_item_id IS 'Link to the cost control item this bill item is associated with';
    END IF;
END
$$;

-- Add cost_control_item_id to purchase_order_items table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'purchase_order_items'
        AND column_name = 'cost_control_item_id'
    ) THEN
        ALTER TABLE public.purchase_order_items ADD COLUMN cost_control_item_id UUID REFERENCES public.cost_control_items(id) ON DELETE SET NULL;
        COMMENT ON COLUMN public.purchase_order_items.cost_control_item_id IS 'Link to the cost control item this purchase order item is associated with';
    END IF;
END
$$;

-- Update the bill form to add a dropdown for selecting cost control items
COMMENT ON TABLE public.bill_items IS 'Items on bills that can be linked to cost control items';
COMMENT ON TABLE public.purchase_order_items IS 'Items on purchase orders that can be linked to cost control items';

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS bill_items_cost_control_item_id_idx ON public.bill_items(cost_control_item_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_cost_control_item_id_idx ON public.purchase_order_items(cost_control_item_id); 