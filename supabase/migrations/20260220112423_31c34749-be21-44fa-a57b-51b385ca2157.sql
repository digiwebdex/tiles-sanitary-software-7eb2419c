
-- Add billing_cycle and yearly_discount_applied to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS yearly_discount_applied boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.subscriptions.billing_cycle IS 'monthly or yearly billing cycle';
COMMENT ON COLUMN public.subscriptions.yearly_discount_applied IS 'True if the 30% first-year yearly discount was applied to this subscription period';
