
-- ─────────────────────────────────────────────────────────────
-- Approval Workflow Batch 3: lifecycle polish migration
-- ─────────────────────────────────────────────────────────────

-- 1. Add approval_expiry_hours to approval_settings
ALTER TABLE public.approval_settings
  ADD COLUMN IF NOT EXISTS approval_expiry_hours integer NOT NULL DEFAULT 24;

-- 2. RPC: cancel a pending approval (requester or admin only)
CREATE OR REPLACE FUNCTION public.cancel_approval_request(
  _request_id uuid,
  _cancel_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row record;
  _is_admin boolean;
BEGIN
  SELECT * INTO _row
  FROM public.approval_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF _row.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be cancelled (current: %)', _row.status;
  END IF;

  -- Permission: requester themselves OR dealer_admin of same dealer
  _is_admin := has_role(auth.uid(), 'dealer_admin'::app_role)
               AND get_user_dealer_id(auth.uid()) = _row.dealer_id;

  IF _row.requested_by <> auth.uid() AND NOT _is_admin AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'You cannot cancel this request';
  END IF;

  UPDATE public.approval_requests SET
    status = 'cancelled',
    decided_by = auth.uid(),
    decided_at = now(),
    decision_note = _cancel_reason
  WHERE id = _request_id;

  -- Audit
  INSERT INTO public.audit_logs (dealer_id, user_id, action, table_name, record_id, new_data)
  VALUES (
    _row.dealer_id, auth.uid(),
    'APPROVAL_CANCELLED',
    'approval_requests',
    _request_id,
    jsonb_build_object('reason', _cancel_reason, 'approval_type', _row.approval_type)
  );

  RETURN _request_id;
END;
$$;

-- 3. RPC: bulk-expire stale pending/approved requests for a dealer
CREATE OR REPLACE FUNCTION public.expire_stale_approvals(_dealer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer := 0;
  _row record;
BEGIN
  FOR _row IN
    SELECT id, dealer_id, approval_type
    FROM public.approval_requests
    WHERE dealer_id = _dealer_id
      AND status IN ('pending', 'approved', 'auto_approved')
      AND consumed_at IS NULL
      AND expires_at IS NOT NULL
      AND expires_at < now()
    FOR UPDATE
  LOOP
    UPDATE public.approval_requests SET status = 'expired'
    WHERE id = _row.id;

    INSERT INTO public.audit_logs (dealer_id, action, table_name, record_id, new_data)
    VALUES (
      _row.dealer_id,
      'APPROVAL_AUTO_EXPIRED',
      'approval_requests',
      _row.id,
      jsonb_build_object('approval_type', _row.approval_type)
    );

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;
