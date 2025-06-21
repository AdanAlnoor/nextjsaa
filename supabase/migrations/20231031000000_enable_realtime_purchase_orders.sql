-- Enable realtime for the purchase_orders table
-- This migration enables real-time functionality for the purchase_orders table
-- allowing clients to subscribe to changes

-- First, enable the database to publish changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;

-- Since we're dealing with approvals and statuses, also add related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_order_items;

-- Add comment to document the real-time functionality
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders with real-time subscription enabled';

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Enabled real-time functionality for purchase_orders and related tables';
END $$;
