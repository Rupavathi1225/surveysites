-- Add network_id column to offers table for tracking which network imported the offer
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS network_id text;

-- Create index for faster filtering by network_id
CREATE INDEX IF NOT EXISTS idx_offers_network_id ON public.offers(network_id);
