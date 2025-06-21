-- Add updated_by column to purchase_orders table
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Update the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_orders'
AND column_name = 'updated_by'; 