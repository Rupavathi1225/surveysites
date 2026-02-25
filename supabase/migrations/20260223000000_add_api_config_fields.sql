-- Add new fields to api_import_configs table for flexible API configuration
ALTER TABLE public.api_import_configs ADD COLUMN IF NOT EXISTS network_type text;
ALTER TABLE public.api_import_configs ADD COLUMN IF NOT EXISTS network_id text;
ALTER TABLE public.api_import_configs ADD COLUMN IF NOT EXISTS api_key text;

-- Add comment to document the new columns
COMMENT ON COLUMN public.api_import_configs.network_type IS 'Type of affiliate network (HasOffers, Tune, CPX, BitLabs, etc.)';
COMMENT ON COLUMN public.api_import_configs.network_id IS 'Unique Network ID provided by the affiliate manager';
COMMENT ON COLUMN public.api_import_configs.api_key IS 'Direct API key (alternative to api_key_secret_name)';

-- Update existing default configs with network types
UPDATE public.api_import_configs 
SET network_type = 'CPX' 
WHERE provider_name = 'CPX Research' AND network_type IS NULL;

UPDATE public.api_import_configs 
SET network_type = 'BitLabs' 
WHERE provider_name = 'BitLabs' AND network_type IS NULL;
