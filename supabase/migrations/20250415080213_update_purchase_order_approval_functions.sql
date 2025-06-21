-- Migration to update purchase order approval functions to bypass role checks
-- Created: 2025-04-15T08:02:13.000Z

-- Function to approve purchase orders (without role checks)
CREATE OR REPLACE FUNCTION public.approve_purchase_order(
  p_purchase_order_id UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Pending status (no role check)
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = p_purchase_order_id AND status = 'Pending'
  ) THEN
    RAISE EXCEPTION 'Purchase order not found or not in Pending status';
    RETURN FALSE;
  END IF;
  
  -- Update the PO to Approved status
  UPDATE public.purchase_orders
  SET 
    status = 'Approved',
    approval_date = NOW(),
    approval_notes = p_approval_notes,
    updated_at = NOW(),
    -- Clear any rejection data if previously rejected and resubmitted
    rejection_date = NULL,
    rejection_reason = NULL
  WHERE id = p_purchase_order_id;
  
  RETURN TRUE;
END;
$$;

-- Function to reject purchase orders (without role checks)
CREATE OR REPLACE FUNCTION public.reject_purchase_order(
  p_purchase_order_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Pending status (no role check)
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = p_purchase_order_id AND status = 'Pending'
  ) THEN
    RAISE EXCEPTION 'Purchase order not found or not in Pending status';
    RETURN FALSE;
  END IF;
  
  -- Check if rejection reason is provided
  IF p_rejection_reason IS NULL OR p_rejection_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
    RETURN FALSE;
  END IF;
  
  -- Update the PO to Rejected status
  UPDATE public.purchase_orders
  SET 
    status = 'Rejected',
    rejection_date = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW(),
    -- Clear any approval data if previously approved and resubmitted
    approval_date = NULL,
    approval_notes = NULL
  WHERE id = p_purchase_order_id;
  
  RETURN TRUE;
END;
$$;

-- Function to submit purchase orders for approval (without role checks)
CREATE OR REPLACE FUNCTION public.submit_purchase_order_for_approval(
  p_purchase_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Draft status (no role check)
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = p_purchase_order_id AND status = 'Draft'
  ) THEN
    RAISE EXCEPTION 'Purchase order not found or not in Draft status';
    RETURN FALSE;
  END IF;
  
  -- Update the PO to Pending status
  UPDATE public.purchase_orders
  SET 
    status = 'Pending',
    updated_at = NOW()
  WHERE id = p_purchase_order_id;
  
  RETURN TRUE;
END;
$$;

-- Function to resubmit rejected purchase orders (without role checks)
CREATE OR REPLACE FUNCTION public.resubmit_purchase_order(
  p_purchase_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Rejected status (no role check)
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = p_purchase_order_id AND status = 'Rejected'
  ) THEN
    RAISE EXCEPTION 'Purchase order not found or not in Rejected status';
    RETURN FALSE;
  END IF;
  
  -- Update the PO to Pending status
  UPDATE public.purchase_orders
  SET 
    status = 'Pending',
    updated_at = NOW(),
    -- Clear rejection data
    rejection_date = NULL,
    rejection_reason = NULL
  WHERE id = p_purchase_order_id;
  
  RETURN TRUE;
END;
$$;

-- Re-grant permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_purchase_order_for_approval TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_purchase_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_purchase_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_purchase_order TO authenticated;

-- Add comments to document these changes
COMMENT ON FUNCTION public.approve_purchase_order IS 'Approves a purchase order without role-based permission checks';
COMMENT ON FUNCTION public.reject_purchase_order IS 'Rejects a purchase order without role-based permission checks';
COMMENT ON FUNCTION public.submit_purchase_order_for_approval IS 'Submits a purchase order for approval without role-based permission checks';
COMMENT ON FUNCTION public.resubmit_purchase_order IS 'Resubmits a rejected purchase order without role-based permission checks'; 