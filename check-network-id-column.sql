-- Check if network_id column exists in offers table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offers' AND table_schema = 'public' AND column_name = 'network_id';

-- If no results above, add the column
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS network_id text;

-- Create index for faster filtering
-- CREATE INDEX IF NOT EXISTS idx_offers_network_id ON public.offers(network_id);

-- Check existing network_id values
SELECT COUNT(*) as total_offers, 
       COUNT(network_id) as offers_with_network_id,
       COUNT(DISTINCT network_id) as unique_networks
FROM public.offers;
