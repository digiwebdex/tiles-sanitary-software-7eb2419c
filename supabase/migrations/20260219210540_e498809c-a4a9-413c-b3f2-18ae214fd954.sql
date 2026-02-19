
-- Fix audit log trigger: user_id column is uuid, auth.uid() is already uuid, remove the ::text cast
CREATE OR REPLACE FUNCTION public.log_stock_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    dealer_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.dealer_id, OLD.dealer_id),
    auth.uid(),   -- uuid, no ::text cast
    TG_OP,
    'stock',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN NEW;
END;
$$;
