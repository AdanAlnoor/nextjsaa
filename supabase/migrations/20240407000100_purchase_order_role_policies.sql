-- Add role-based policies for purchase orders
DROP POLICY IF EXISTS "Allow all users to view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to insert purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to update purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow all users to delete purchase orders" ON public.purchase_orders;

-- View policies - Both purchasers and approvers can view
CREATE POLICY "Users with roles can view purchase orders"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  -- Project managers, purchasers, finance, and admins can view
  public.user_has_role(auth.uid(), 'admin') OR
  public.user_has_role(auth.uid(), 'project_manager', project_id) OR
  public.user_has_role(auth.uid(), 'purchaser', project_id) OR
  public.user_has_role(auth.uid(), 'finance') OR
  public.user_has_role(auth.uid(), 'viewer', project_id)
);

-- Insert policy - Only purchasers can create
CREATE POLICY "Only purchasers can create purchase orders"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_role(auth.uid(), 'admin') OR
  public.user_has_role(auth.uid(), 'project_manager', project_id) OR
  public.user_has_role(auth.uid(), 'purchaser', project_id)
);

-- Update policy - Status-based restrictions
CREATE POLICY "Purchasers can update draft purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  (status = 'Draft') AND
  (
    public.user_has_role(auth.uid(), 'admin') OR
    public.user_has_role(auth.uid(), 'project_manager', project_id) OR
    public.user_has_role(auth.uid(), 'purchaser', project_id)
  )
);

CREATE POLICY "Only approvers can approve/reject purchase orders"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  (status = 'Pending') AND
  (
    public.user_has_role(auth.uid(), 'admin') OR
    public.user_has_role(auth.uid(), 'project_manager', project_id) OR
    public.user_has_role(auth.uid(), 'finance')
  )
);

CREATE POLICY "Finance can convert purchase orders to bills"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  (status = 'Approved') AND
  (
    public.user_has_role(auth.uid(), 'admin') OR
    public.user_has_role(auth.uid(), 'finance')
  )
);

-- Delete policy - Only admin and project managers can delete
CREATE POLICY "Only admin and project managers can delete purchase orders"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (
  public.user_has_role(auth.uid(), 'admin') OR
  public.user_has_role(auth.uid(), 'project_manager', project_id)
);

-- Update purchase order items policies
DROP POLICY IF EXISTS "Allow all users to view purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to insert purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to update purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow all users to delete purchase order items" ON public.purchase_order_items;

-- View policy for items
CREATE POLICY "Users with roles can view purchase order items"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id AND
    (
      public.user_has_role(auth.uid(), 'admin') OR
      public.user_has_role(auth.uid(), 'project_manager', po.project_id) OR
      public.user_has_role(auth.uid(), 'purchaser', po.project_id) OR
      public.user_has_role(auth.uid(), 'finance') OR
      public.user_has_role(auth.uid(), 'viewer', po.project_id)
    )
  )
);

-- Insert policy for items
CREATE POLICY "Only purchasers can add purchase order items"
ON public.purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id AND
    po.status = 'Draft' AND
    (
      public.user_has_role(auth.uid(), 'admin') OR
      public.user_has_role(auth.uid(), 'project_manager', po.project_id) OR
      public.user_has_role(auth.uid(), 'purchaser', po.project_id)
    )
  )
);

-- Update policy for items
CREATE POLICY "Only purchasers can update purchase order items"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id AND
    po.status = 'Draft' AND
    (
      public.user_has_role(auth.uid(), 'admin') OR
      public.user_has_role(auth.uid(), 'project_manager', po.project_id) OR
      public.user_has_role(auth.uid(), 'purchaser', po.project_id)
    )
  )
);

-- Delete policy for items
CREATE POLICY "Only purchasers can delete purchase order items"
ON public.purchase_order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id AND
    po.status = 'Draft' AND
    (
      public.user_has_role(auth.uid(), 'admin') OR
      public.user_has_role(auth.uid(), 'project_manager', po.project_id) OR
      public.user_has_role(auth.uid(), 'purchaser', po.project_id)
    )
  )
); 