
-- Table to track page visits per user session
CREATE TABLE public.page_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  login_log_id uuid REFERENCES public.login_logs(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads page visits" ON public.page_visits FOR SELECT USING (is_admin_or_subadmin());
CREATE POLICY "Users insert own visits" ON public.page_visits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin deletes page visits" ON public.page_visits FOR DELETE USING (is_admin());

CREATE INDEX idx_page_visits_login_log ON public.page_visits(login_log_id);
CREATE INDEX idx_page_visits_user ON public.page_visits(user_id);
