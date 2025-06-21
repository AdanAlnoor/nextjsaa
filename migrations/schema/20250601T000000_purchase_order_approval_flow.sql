-- Migration for purchase order approval flow
-- Created: 2025-06-01T00:00:00.000Z

-- Step 1: Ensure required columns exist
ALTER TABLE IF EXISTS public.purchase_orders 
  ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP WITH TIME ZONE;

-- Step 2: Add indexes for faster lookups of approval status
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approval_date ON public.purchase_orders(approval_date) WHERE approval_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_rejection_date ON public.purchase_orders(rejection_date) WHERE rejection_date IS NOT NULL;

-- Step 3: Create view for tracking approvals (useful for reporting)
CREATE OR REPLACE VIEW public.purchase_order_approvals AS
SELECT
  po.id,
  po.po_number,
  po.name,
  po.supplier,
  po.status,
  po.total,
  po.project_id,
  po.created_by,
  po.created_at,
  po.approval_date,
  po.approval_notes,
  po.rejection_date,
  po.rejection_reason,
  CASE 
    WHEN po.status = 'Approved' THEN
      EXTRACT(EPOCH FROM (po.approval_date - po.created_at))/86400
    ELSE NULL
  END AS days_to_approve,
  p.name AS project_name
FROM 
  public.purchase_orders po
LEFT JOIN
  public.projects p ON po.project_id = p.id
WHERE 
  po.status IN ('Approved', 'Rejected', 'Pending');

-- Step 4: Create a function to transition a PO to Pending status
CREATE OR REPLACE FUNCTION public.submit_purchase_order_for_approval(
  p_purchase_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Draft status
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

-- Step 5: Create a function to approve a purchase order
CREATE OR REPLACE FUNCTION public.approve_purchase_order(
  p_purchase_order_id UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Pending status
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

-- Step 6: Create a function to reject a purchase order
CREATE OR REPLACE FUNCTION public.reject_purchase_order(
  p_purchase_order_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Pending status
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

-- Step 7: Create a function to resubmit a rejected purchase order
CREATE OR REPLACE FUNCTION public.resubmit_purchase_order(
  p_purchase_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if PO exists and is in Rejected status
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

-- Step 8: Grant permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_purchase_order_for_approval TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_purchase_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_purchase_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_purchase_order TO authenticated;

-- Step 9: Update RLS policies to restrict approval actions
-- First, drop policies that might conflict
DROP POLICY IF EXISTS "Only approvers can approve/reject purchase orders" ON public.purchase_orders;

-- Create new policy for approvals
CREATE POLICY "Only approvers can approve or reject purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  (status = 'Pending') AND (
    -- Allow update if user is approver
    public.user_has_role(auth.uid(), 'admin') OR
    public.user_has_role(auth.uid(), 'project_manager', project_id) OR
    public.user_has_role(auth.uid(), 'finance')
  )
);

-- Create policy for resubmitting rejected POs
CREATE POLICY "Purchasers can resubmit rejected purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  (status = 'Rejected') AND (
    -- Allow update if user is creator or has purchaser role
    public.user_has_role(auth.uid(), 'admin') OR
    public.user_has_role(auth.uid(), 'project_manager', project_id) OR
    public.user_has_role(auth.uid(), 'purchaser', project_id) OR
    created_by = auth.uid()
  )
);

-- Grant permissions on the approval view
GRANT SELECT ON public.purchase_order_approvals TO authenticated;
GRANT SELECT ON public.purchase_order_approvals TO service_role; 