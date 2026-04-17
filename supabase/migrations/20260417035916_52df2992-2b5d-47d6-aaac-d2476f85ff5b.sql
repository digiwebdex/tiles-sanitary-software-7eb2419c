
CREATE TABLE public.supplier_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_notes_dealer ON public.supplier_notes(dealer_id);
CREATE INDEX idx_supplier_notes_supplier ON public.supplier_notes(supplier_id);

ALTER TABLE public.supplier_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer admins can manage supplier_notes"
  ON public.supplier_notes
  FOR ALL
  TO authenticated
  USING ((dealer_id = get_user_dealer_id(auth.uid())) AND has_role(auth.uid(), 'dealer_admin'::app_role))
  WITH CHECK ((dealer_id = get_user_dealer_id(auth.uid())) AND has_role(auth.uid(), 'dealer_admin'::app_role));

CREATE POLICY "Super admin full access to supplier_notes"
  ON public.supplier_notes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE OR REPLACE FUNCTION public.touch_supplier_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_notes_updated_at
  BEFORE UPDATE ON public.supplier_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_supplier_notes_updated_at();
