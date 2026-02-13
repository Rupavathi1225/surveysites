
-- Fix: Replace overly permissive INSERT policy with service-role-only pattern
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY so it bypasses RLS anyway.
-- We restrict the INSERT to admin/subadmin for direct client inserts.
DROP POLICY "System inserts postback logs" ON public.postback_logs;
CREATE POLICY "Admin inserts postback logs" ON public.postback_logs FOR INSERT WITH CHECK (is_admin_or_subadmin());
