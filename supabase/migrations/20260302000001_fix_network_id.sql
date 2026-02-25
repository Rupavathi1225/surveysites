-- Fix network_id column - ensure it exists and is properly configured
DO $$
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'network_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.offers ADD COLUMN network_id text;
        RAISE NOTICE 'Added network_id column to offers table';
    END IF;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_offers_network_id ON public.offers(network_id);
    
    -- Update some existing offers with sample network_id for testing
    UPDATE public.offers 
    SET network_id = 'cjxnonetwork' 
    WHERE network_id IS NULL 
    AND id IN (
        SELECT id FROM public.offers WHERE network_id IS NULL LIMIT 3
    );
    
    RAISE NOTICE 'Updated sample offers with network_id for testing';
END $$;

-- Verify the column exists and show data
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND table_schema = 'public' 
AND column_name = 'network_id';

-- Show sample offers with network_id
SELECT id, title, network_id, created_at 
FROM public.offers 
WHERE network_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
