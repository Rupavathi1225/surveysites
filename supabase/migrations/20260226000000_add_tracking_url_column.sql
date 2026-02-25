-- Add tracking_url column to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS tracking_url text;

-- Create index for faster queries on tracking_url
CREATE INDEX IF NOT EXISTS idx_offers_tracking_url ON public.offers(tracking_url);

-- Add comment to document the purpose
COMMENT ON COLUMN public.offers.tracking_url IS 'Affiliate tracking URL with network-specific parameters';
