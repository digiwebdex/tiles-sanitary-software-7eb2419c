
-- Track resolved rate before manual override
ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS original_resolved_rate numeric;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS original_resolved_rate numeric;

-- Indexes to speed up tier-based reporting
CREATE INDEX IF NOT EXISTS idx_sale_items_tier_id ON public.sale_items(tier_id) WHERE tier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotation_items_tier_id ON public.quotation_items(tier_id) WHERE tier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sale_items_rate_source ON public.sale_items(dealer_id, rate_source);
CREATE INDEX IF NOT EXISTS idx_quotation_items_rate_source ON public.quotation_items(dealer_id, rate_source);
CREATE INDEX IF NOT EXISTS idx_customers_price_tier ON public.customers(price_tier_id) WHERE price_tier_id IS NOT NULL;
