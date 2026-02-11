
-- Create offers table for offer management
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id text,
  title text NOT NULL,
  url text,
  payout numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  payout_model text DEFAULT 'CPA',
  countries text,
  allowed_countries text,
  platform text,
  device text,
  vertical text,
  preview_url text,
  image_url text,
  traffic_sources text,
  devices text,
  expiry_date timestamp with time zone,
  percent numeric DEFAULT 0,
  non_access_url text,
  description text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages offers" ON public.offers FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());
CREATE POLICY "Auth users read active offers" ON public.offers FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
