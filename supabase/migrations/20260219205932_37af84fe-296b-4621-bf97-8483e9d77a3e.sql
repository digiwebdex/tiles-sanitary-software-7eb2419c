
-- Add missing columns to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email         text,
  ADD COLUMN IF NOT EXISTS reference_name text,
  ADD COLUMN IF NOT EXISTS opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'active';

-- Unique supplier name per dealer (prevent duplicates)
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_dealer_id_name_key;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_dealer_id_name_key UNIQUE (dealer_id, name);

-- ─── Opening balance → customer_ledger trigger ───────────────────────────────

CREATE OR REPLACE FUNCTION public.customer_opening_balance_ledger()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.opening_balance IS NOT NULL AND NEW.opening_balance <> 0 THEN
    INSERT INTO public.customer_ledger (
      dealer_id, customer_id, type, amount, description, entry_date
    ) VALUES (
      NEW.dealer_id,
      NEW.id,
      'adjustment',
      NEW.opening_balance,
      'Opening balance',
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_opening_balance ON public.customers;

CREATE TRIGGER trg_customer_opening_balance
  AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customer_opening_balance_ledger();

-- RLS: allow dealer_admins to manage customer email/reference_name/opening_balance/status (already covered by existing policies)
-- No new policies needed — existing "Dealer admins can manage" policy covers all columns
