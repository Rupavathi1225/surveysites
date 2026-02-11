
-- Click tracking table for surveys/offers
CREATE TABLE public.offer_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  offer_id uuid REFERENCES public.offers(id),
  survey_link_id uuid REFERENCES public.survey_links(id),
  session_id text,
  ip_address text,
  country text,
  device_type text,
  browser text,
  os text,
  user_agent text,
  source text,
  utm_params jsonb,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  time_spent integer DEFAULT 0,
  completion_status text DEFAULT 'clicked',
  vpn_proxy_flag boolean DEFAULT false,
  attempt_count integer DEFAULT 1,
  risk_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.offer_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads all clicks" ON public.offer_clicks FOR SELECT USING (is_admin_or_subadmin());
CREATE POLICY "Users insert own clicks" ON public.offer_clicks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin updates clicks" ON public.offer_clicks FOR UPDATE USING (is_admin_or_subadmin());
CREATE POLICY "Admin deletes clicks" ON public.offer_clicks FOR DELETE USING (is_admin());
