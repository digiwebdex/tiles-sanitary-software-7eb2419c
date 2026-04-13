
-- ============================================
-- 1. Invoice sequence table for race-safe numbering
-- ============================================
CREATE TABLE public.invoice_sequences (
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  next_invoice_no integer NOT NULL DEFAULT 1,
  next_challan_no integer NOT NULL DEFAULT 1,
  PRIMARY KEY (dealer_id)
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer admins can manage own sequences"
  ON public.invoice_sequences FOR ALL
  TO authenticated
  USING (dealer_id = get_user_dealer_id(auth.uid()))
  WITH CHECK (dealer_id = get_user_dealer_id(auth.uid()));

CREATE POLICY "Super admin full access to invoice_sequences"
  ON public.invoice_sequences FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Atomic invoice number generator
CREATE OR REPLACE FUNCTION public.generate_next_invoice_no(_dealer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next integer;
BEGIN
  -- Upsert: create row if not exists, then atomically increment
  INSERT INTO public.invoice_sequences (dealer_id, next_invoice_no)
  VALUES (_dealer_id, 2)
  ON CONFLICT (dealer_id) DO UPDATE
    SET next_invoice_no = invoice_sequences.next_invoice_no + 1
  RETURNING next_invoice_no - 1 INTO _next;
  
  -- If this was the first insert, _next = 2-1 = 1. Perfect.
  RETURN 'INV-' || lpad(_next::text, 5, '0');
END;
$$;

-- Atomic challan number generator
CREATE OR REPLACE FUNCTION public.generate_next_challan_no(_dealer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next integer;
BEGIN
  INSERT INTO public.invoice_sequences (dealer_id, next_challan_no)
  VALUES (_dealer_id, 2)
  ON CONFLICT (dealer_id) DO UPDATE
    SET next_challan_no = invoice_sequences.next_challan_no + 1
  RETURNING next_challan_no - 1 INTO _next;

  RETURN 'CH-' || lpad(_next::text, 5, '0');
END;
$$;

-- ============================================
-- 2. Seed existing dealers with correct next numbers
-- ============================================
INSERT INTO public.invoice_sequences (dealer_id, next_invoice_no, next_challan_no)
SELECT 
  d.id,
  COALESCE((SELECT COUNT(*) + 1 FROM sales s WHERE s.dealer_id = d.id), 1),
  COALESCE((SELECT COUNT(*) + 1 FROM challans c WHERE c.dealer_id = d.id), 1)
FROM dealers d
ON CONFLICT (dealer_id) DO NOTHING;

-- ============================================
-- 3. RLS hardening: block salesman UPDATE/DELETE
-- ============================================

-- Block salesman from updating sales
CREATE POLICY "Salesmen cannot update sales"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from deleting sales
CREATE POLICY "Salesmen cannot delete sales"
  ON public.sales FOR DELETE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from updating sale_items
CREATE POLICY "Salesmen cannot update sale_items"
  ON public.sale_items FOR UPDATE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from deleting sale_items
CREATE POLICY "Salesmen cannot delete sale_items"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from updating stock (prevents manual adjustments)
CREATE POLICY "Salesmen cannot update stock"
  ON public.stock FOR UPDATE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from updating products (prevents price changes)
CREATE POLICY "Salesmen cannot update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from deleting customer_ledger entries
CREATE POLICY "Salesmen cannot delete customer_ledger"
  ON public.customer_ledger FOR DELETE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );

-- Block salesman from deleting cash_ledger entries
CREATE POLICY "Salesmen cannot delete cash_ledger"
  ON public.cash_ledger FOR DELETE
  TO authenticated
  USING (
    NOT has_role(auth.uid(), 'salesman'::app_role)
    OR is_super_admin()
    OR (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  );
