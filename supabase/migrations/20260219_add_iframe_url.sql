-- Add iframe_url column to survey_providers table if it doesn't exist
ALTER TABLE public.survey_providers 
ADD COLUMN IF NOT EXISTS iframe_url TEXT;

-- Add external_url column as fallback
ALTER TABLE public.survey_providers 
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Add comment to iframe_url column
COMMENT ON COLUMN public.survey_providers.iframe_url IS 'Direct URL for iframe src attribute - use this if you have a specific iframe URL';
COMMENT ON COLUMN public.survey_providers.external_url IS 'Fallback URL if iframe_url or iframe_code is not available';
