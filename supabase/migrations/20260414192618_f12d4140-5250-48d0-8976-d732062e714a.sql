
-- 1. Add backorder setting to dealers
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS allow_backorder boolean NOT NULL DEFAULT false;

-- 2. Add backorder flag to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS has_backorder boolean NOT NULL DEFAULT false;

-- 3. Add backorder tracking columns to sale_items
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS available_qty_at_sale numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS backorder_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS allocated_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'fulfilled';

-- 4. Create backorder_allocations table
CREATE TABLE IF NOT EXISTS public.backorder_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  purchase_item_id uuid NOT NULL REFERENCES public.purchase_items(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  allocated_qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backorder_alloc_dealer ON public.backorder_allocations(dealer_id);
CREATE INDEX IF NOT EXISTS idx_backorder_alloc_sale_item ON public.backorder_allocations(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_backorder_alloc_product ON public.backorder_allocations(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_backorder ON public.sale_items(product_id, dealer_id) WHERE backorder_qty > 0;
CREATE INDEX IF NOT EXISTS idx_sales_has_backorder ON public.sales(dealer_id) WHERE has_backorder = true;

-- 5. RLS for backorder_allocations
ALTER TABLE public.backorder_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer users can view backorder_allocations"
ON public.backorder_allocations FOR SELECT
TO authenticated
USING (dealer_id = get_user_dealer_id(auth.uid()));

CREATE POLICY "Dealer admins can manage backorder_allocations"
ON public.backorder_allocations FOR ALL
TO authenticated
USING (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
WITH CHECK (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role));

CREATE POLICY "Salesmen can create backorder_allocations"
ON public.backorder_allocations FOR INSERT
TO authenticated
WITH CHECK (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'salesman'::app_role));

CREATE POLICY "Super admin full access to backorder_allocations"
ON public.backorder_allocations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Subscription required for backorder_allocations writes"
ON public.backorder_allocations FOR INSERT
TO authenticated
WITH CHECK (has_active_subscription());
