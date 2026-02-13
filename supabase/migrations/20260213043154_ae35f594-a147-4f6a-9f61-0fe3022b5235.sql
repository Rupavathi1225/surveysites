
-- Table: downward_partners - Partners who use our offers and receive postbacks from us
CREATE TABLE public.downward_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE,
  postback_url text,
  postback_method text DEFAULT 'GET',
  username_param text DEFAULT 'user_id',
  status_param text DEFAULT 'status',
  payout_param text DEFAULT 'payout',
  txn_param text DEFAULT 'txn_id',
  offer_param text DEFAULT 'offer_id',
  custom_params jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.downward_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages downward partners" ON public.downward_partners FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());
CREATE POLICY "Auth users read downward partners" ON public.downward_partners FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_downward_partners_updated_at BEFORE UPDATE ON public.downward_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: postback_logs - Log all incoming and outgoing postbacks
CREATE TABLE public.postback_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direction text NOT NULL DEFAULT 'incoming', -- 'incoming' or 'outgoing'
  provider_type text, -- 'survey_provider', 'single_link_provider'
  provider_id uuid,
  provider_name text,
  downward_partner_id uuid REFERENCES public.downward_partners(id),
  user_id uuid,
  username text,
  offer_click_id uuid REFERENCES public.offer_clicks(id),
  txn_id text,
  status text, -- 'success', 'failed', 'reversed'
  payout numeric DEFAULT 0,
  payout_type text DEFAULT 'points',
  raw_params jsonb,
  response_code integer,
  response_body text,
  ip_address text,
  error_message text,
  forwarded boolean DEFAULT false,
  forward_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.postback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads postback logs" ON public.postback_logs FOR SELECT USING (is_admin_or_subadmin());
CREATE POLICY "System inserts postback logs" ON public.postback_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin deletes postback logs" ON public.postback_logs FOR DELETE USING (is_admin());
CREATE POLICY "Admin updates postback logs" ON public.postback_logs FOR UPDATE USING (is_admin_or_subadmin());

-- Index for faster lookups
CREATE INDEX idx_postback_logs_direction ON public.postback_logs(direction);
CREATE INDEX idx_postback_logs_created_at ON public.postback_logs(created_at DESC);
CREATE INDEX idx_postback_logs_user ON public.postback_logs(username);
CREATE INDEX idx_postback_logs_txn ON public.postback_logs(txn_id);
