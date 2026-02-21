-- Add provider and source columns to offers table for API imports
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create table for storing API import configurations
CREATE TABLE IF NOT EXISTS public.api_import_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name text NOT NULL UNIQUE,
  api_endpoint text NOT NULL,
  api_key_secret_name text NOT NULL,
  -- Store reference to env var name, not the actual secret
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_import_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage API configs
CREATE POLICY "Admin manages api_import_configs" ON public.api_import_configs 
  FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());

-- Insert default configurations for common providers
INSERT INTO public.api_import_configs (provider_name, api_endpoint, api_key_secret_name, is_active) VALUES
  ('CPX Research', 'https://network.cpx-research.com/api/v1/offers', 'CPX_API_KEY', true),
  ('BitLabs', 'https://api.bitlabs.ai/v1/offers', 'BITLABS_API_KEY', true)
ON CONFLICT (provider_name) DO NOTHING;

-- Update trigger
CREATE TRIGGER update_api_import_configs_updated_at 
  BEFORE UPDATE ON public.api_import_configs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
