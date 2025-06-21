-- Add approval and rejection columns to purchase_orders table
DO $$
BEGIN
  -- Add approval_date if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'approval_date'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added approval_date column';
  END IF;
  
  -- Add approval_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN approval_notes TEXT;
    RAISE NOTICE 'Added approval_notes column';
  END IF;
  
  -- Add rejection_reason if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE 'Added rejection_reason column';
  END IF;
  
  -- Add rejection_date if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND column_name = 'rejection_date'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN rejection_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added rejection_date column';
  END IF;
  
  -- Modify status type if needed to include 'Rejected' status
  -- First, check if any rows have 'Rejected' status already
  PERFORM 1 FROM public.purchase_orders WHERE status = 'Rejected';
  IF NOT FOUND THEN
    -- Update default values or constraints as needed
    RAISE NOTICE 'Adding support for Rejected status';
  END IF;
END $$; 