
-- Fix: Remove overly permissive INSERT policy, edge functions use service role (bypasses RLS)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
