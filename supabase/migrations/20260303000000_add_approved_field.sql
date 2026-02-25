-- Add approved field to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Add comment to describe the field
COMMENT ON COLUMN public.offers.approved IS 'Indicates whether the offer has been approved for display';

-- Create index for faster queries on approved status
CREATE INDEX IF NOT EXISTS idx_offers_approved ON public.offers(approved);
