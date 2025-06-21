-- Add linked_bill field to purchase_orders table
ALTER TABLE IF EXISTS public.purchase_orders 
ADD COLUMN IF NOT EXISTS linked_bill TEXT;

-- Update the status enum to include 'Closed' status
DO $$ 
BEGIN
  -- Check if the enum exists and doesn't already have 'Closed'
  IF EXISTS (
    SELECT 1 
    FROM pg_type 
    WHERE typname = 'po_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'po_status'
    AND e.enumlabel = 'Closed'
  ) THEN
    -- Add 'Closed' to the enum
    ALTER TYPE po_status ADD VALUE 'Closed';
  END IF;
END $$;

-- Update existing enum values in status column
-- This will only execute if the column is using the enum type
DO $$
BEGIN
  -- If column exists and is using the enum type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders' 
    AND column_name = 'status'
    AND data_type = 'USER-DEFINED'
    AND udt_name = 'po_status'
  ) THEN
    -- We need to do this conditionally because ALTER TYPE ADD VALUE 
    -- can only be executed when the type is not used in a transaction
    -- So we'll ensure the column accepts both text and enum values
    ALTER TABLE public.purchase_orders 
    ALTER COLUMN status TYPE TEXT;
  END IF;
END $$; 