
-- Create customer_followups table for collection follow-up tracking
CREATE TABLE public.customer_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customer_followups_dealer_id ON public.customer_followups(dealer_id);
CREATE INDEX idx_customer_followups_customer_id ON public.customer_followups(customer_id);

-- Enable RLS
ALTER TABLE public.customer_followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Dealer admins can manage customer_followups"
  ON public.customer_followups FOR ALL
  TO authenticated
  USING (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'))
  WITH CHECK (dealer_id = get_user_dealer_id(auth.uid()) AND has_role(auth.uid(), 'dealer_admin'));

CREATE POLICY "Dealer users can view customer_followups"
  ON public.customer_followups FOR SELECT
  TO authenticated
  USING (dealer_id = get_user_dealer_id(auth.uid()));

CREATE POLICY "Super admin full access to customer_followups"
  ON public.customer_followups FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Subscription required for customer_followups writes"
  ON public.customer_followups FOR INSERT
  TO authenticated
  WITH CHECK (has_active_subscription());
