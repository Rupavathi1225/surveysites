-- Add missing columns to offers table for bulk imports
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_is_deleted ON public.offers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_offers_offer_id ON public.offers(offer_id);
