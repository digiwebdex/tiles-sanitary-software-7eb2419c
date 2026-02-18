
-- Add missing columns to sales_returns
ALTER TABLE public.sales_returns
  ADD COLUMN is_broken BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Create customer_ledger for tracking payments, refunds, dues
CREATE TABLE public.customer_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id),
  sales_return_id UUID REFERENCES public.sales_returns(id),
  type TEXT NOT NULL CHECK (type IN ('sale', 'payment', 'refund', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

-- RLS for customer_ledger
CREATE POLICY "Super admin full access" ON public.customer_ledger
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Dealer users can view" ON public.customer_ledger
  FOR SELECT TO authenticated
  USING (dealer_id = public.get_user_dealer_id(auth.uid()));

CREATE POLICY "Dealer admins can manage" ON public.customer_ledger
  FOR ALL TO authenticated
  USING (dealer_id = public.get_user_dealer_id(auth.uid()) AND public.has_role(auth.uid(), 'dealer_admin'))
  WITH CHECK (dealer_id = public.get_user_dealer_id(auth.uid()) AND public.has_role(auth.uid(), 'dealer_admin'));

CREATE POLICY "Salesmen can create" ON public.customer_ledger
  FOR INSERT TO authenticated
  WITH CHECK (dealer_id = public.get_user_dealer_id(auth.uid()) AND public.has_role(auth.uid(), 'salesman'));
