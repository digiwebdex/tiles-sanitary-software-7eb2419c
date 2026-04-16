
-- Approval type enum
CREATE TYPE public.approval_type AS ENUM (
  'backorder_sale',
  'mixed_shade',
  'mixed_caliber',
  'credit_override',
  'overdue_override',
  'discount_override',
  'stock_adjustment',
  'sale_cancel',
  'reservation_release'
);

-- Approval requests table
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  approval_type public.approval_type NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  action_hash text NOT NULL,
  context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  source_type text NOT NULL,
  source_id uuid,
  requested_by uuid NOT NULL,
  decided_by uuid,
  decision_note text,
  decided_at timestamptz,
  consumed_by uuid,
  consumed_at timestamptz,
  consumed_source_id uuid,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending','approved','rejected','expired','cancelled','auto_approved','consumed','stale'))
);

-- Approval settings table (one per dealer)
CREATE TABLE public.approval_settings (
  dealer_id uuid PRIMARY KEY REFERENCES public.dealers(id) ON DELETE CASCADE,
  require_backorder_approval boolean NOT NULL DEFAULT true,
  require_mixed_shade_approval boolean NOT NULL DEFAULT true,
  require_mixed_caliber_approval boolean NOT NULL DEFAULT true,
  require_credit_override_approval boolean NOT NULL DEFAULT true,
  require_overdue_override_approval boolean NOT NULL DEFAULT true,
  require_stock_adjustment_approval boolean NOT NULL DEFAULT false,
  require_sale_cancel_approval boolean NOT NULL DEFAULT true,
  discount_approval_threshold numeric NOT NULL DEFAULT 10,
  auto_approve_for_admins boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_approval_requests_dealer_status ON public.approval_requests(dealer_id, status);
CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX idx_approval_requests_action_hash ON public.approval_requests(action_hash);

-- RLS on approval_requests
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access to approval_requests"
  ON public.approval_requests FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Dealer users can view approval_requests"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (dealer_id = get_user_dealer_id(auth.uid()));

CREATE POLICY "Dealer users can create approval_requests"
  ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (
    dealer_id = get_user_dealer_id(auth.uid())
    AND has_active_subscription()
  );

CREATE POLICY "Dealer admins can update approval_requests"
  ON public.approval_requests FOR UPDATE TO authenticated
  USING (
    dealer_id = get_user_dealer_id(auth.uid())
    AND has_role(auth.uid(), 'dealer_admin')
  );

-- RLS on approval_settings
ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access to approval_settings"
  ON public.approval_settings FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Dealer users can view approval_settings"
  ON public.approval_settings FOR SELECT TO authenticated
  USING (dealer_id = get_user_dealer_id(auth.uid()));

CREATE POLICY "Dealer admins can manage approval_settings"
  ON public.approval_settings FOR ALL TO authenticated
  USING (
    dealer_id = get_user_dealer_id(auth.uid())
    AND has_role(auth.uid(), 'dealer_admin')
  )
  WITH CHECK (
    dealer_id = get_user_dealer_id(auth.uid())
    AND has_role(auth.uid(), 'dealer_admin')
  );

-- Trigger for approval_settings updated_at
CREATE TRIGGER update_approval_settings_updated_at
  BEFORE UPDATE ON public.approval_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RPC: Decide approval request (atomic pending → approved/rejected)
CREATE OR REPLACE FUNCTION public.decide_approval_request(
  _request_id uuid,
  _decision text,
  _decision_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row record;
  _approval_type public.approval_type;
  _high_risk boolean;
BEGIN
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  -- Atomic lock + transition
  UPDATE public.approval_requests
  SET
    status = _decision,
    decided_by = auth.uid(),
    decided_at = now(),
    decision_note = _decision_note
  WHERE id = _request_id AND status = 'pending'
  RETURNING id, approval_type INTO _row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request already decided or not found';
  END IF;

  -- Enforce mandatory rejection note
  IF _decision = 'rejected' AND (COALESCE(_decision_note, '') = '') THEN
    RAISE EXCEPTION 'Rejection note is mandatory';
  END IF;

  -- Enforce mandatory approval note for high-risk types
  _approval_type := _row.approval_type;
  _high_risk := _approval_type IN ('credit_override', 'sale_cancel', 'stock_adjustment');
  IF _decision = 'approved' AND _high_risk AND (COALESCE(_decision_note, '') = '') THEN
    RAISE EXCEPTION 'Approval note is mandatory for high-risk actions';
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (dealer_id, user_id, action, table_name, record_id, new_data)
  SELECT
    dealer_id, auth.uid(),
    'APPROVAL_' || upper(_decision),
    'approval_requests',
    _request_id,
    jsonb_build_object(
      'approval_type', approval_type,
      'decision', _decision,
      'decision_note', _decision_note
    )
  FROM public.approval_requests WHERE id = _request_id;

  RETURN _request_id;
END;
$$;

-- RPC: Consume approval request (atomic approved → consumed + bind source_id)
CREATE OR REPLACE FUNCTION public.consume_approval_request(
  _request_id uuid,
  _action_hash text,
  _source_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row record;
BEGIN
  -- Lock and validate
  SELECT * INTO _row
  FROM public.approval_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  -- Must be approved (not auto_approved — those don't need consumption)
  IF _row.status NOT IN ('approved', 'auto_approved') THEN
    RAISE EXCEPTION 'Request is not in approved state (current: %)', _row.status;
  END IF;

  -- Must not already be consumed
  IF _row.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Approval already consumed';
  END IF;

  -- Must not be expired
  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    UPDATE public.approval_requests SET status = 'expired' WHERE id = _request_id;
    RAISE EXCEPTION 'Approval has expired';
  END IF;

  -- Validate action hash matches
  IF _row.action_hash <> _action_hash THEN
    UPDATE public.approval_requests SET status = 'stale' WHERE id = _request_id;
    RAISE EXCEPTION 'Action changed since approval — hash mismatch';
  END IF;

  -- Consume
  UPDATE public.approval_requests SET
    status = 'consumed',
    consumed_by = auth.uid(),
    consumed_at = now(),
    consumed_source_id = _source_id
  WHERE id = _request_id;

  -- Audit
  INSERT INTO public.audit_logs (dealer_id, user_id, action, table_name, record_id, new_data)
  VALUES (
    _row.dealer_id, auth.uid(),
    'APPROVAL_CONSUMED',
    'approval_requests',
    _request_id,
    jsonb_build_object('consumed_source_id', _source_id, 'action_hash', _action_hash)
  );

  RETURN _request_id;
END;
$$;
