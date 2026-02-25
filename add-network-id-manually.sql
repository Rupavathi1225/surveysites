-- Add network_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'network_id'
    ) THEN
        ALTER TABLE public.offers ADD COLUMN network_id text;
        CREATE INDEX IF NOT EXISTS idx_offers_network_id ON public.offers(network_id);
        RAISE NOTICE 'Added network_id column to offers table';
    ELSE
        RAISE NOTICE 'network_id column already exists in offers table';
    END IF;
END $$;

-- Check if column exists and show sample data
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offers' AND table_schema = 'public' AND column_name = 'network_id';

-- Update a few sample offers with network_id for testing (only if they don't have network_id)
UPDATE public.offers 
SET network_id = 'cjxnonetwork' 
WHERE network_id IS NULL AND id IN (
    SELECT id FROM public.offers WHERE network_id IS NULL LIMIT 5
);

-- Show the updated offers
SELECT id, title, network_id, created_at 
FROM public.offers 
WHERE network_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
