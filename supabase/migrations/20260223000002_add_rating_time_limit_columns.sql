-- Add rating and time_limit columns to offers table for import options
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 4;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 2; -- in seconds

-- Add comment for clarity
COMMENT ON COLUMN public.offers.rating IS 'Star rating for the offer (1-5)';
COMMENT ON COLUMN public.offers.time_limit IS 'Time in seconds the offer should be visible on frontend';
