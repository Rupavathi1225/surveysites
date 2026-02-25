-- FORCE UPDATE: Replace all default-network with proper network names
-- This will overwrite any existing network_id values

-- First, let's see what we're working with
SELECT 
    network_id,
    COUNT(*) as count
FROM public.offers 
GROUP BY network_id 
ORDER BY count DESC;

-- Force update CJXNO offers - overwrite any existing values
UPDATE public.offers 
SET network_id = 'cjxnonetwork' 
WHERE (
    provider ILIKE '%cjxno%' OR 
    provider ILIKE '%cjx%' OR
    source ILIKE '%cjxno%' OR
    source ILIKE '%cjx%' OR
    title ILIKE '%cjxno%' OR
    title ILIKE '%cjx%'
);

-- Force update CPA offers
UPDATE public.offers 
SET network_id = 'cpa' 
WHERE (
    provider ILIKE '%cpa%' OR 
    source ILIKE '%cpa%' OR
    title ILIKE '%cpa%'
);

-- Force update Lead offers
UPDATE public.offers 
SET network_id = 'leadads' 
WHERE (
    provider ILIKE '%lead%' OR 
    source ILIKE '%lead%' OR
    title ILIKE '%lead%'
);

-- Force update Merchant offers
UPDATE public.offers 
SET network_id = 'merchant' 
WHERE (
    provider ILIKE '%merchant%' OR 
    source ILIKE '%merchant%' OR
    title ILIKE '%merchant%'
);

-- Force update OfferToro offers
UPDATE public.offers 
SET network_id = 'offertoro' 
WHERE (
    provider ILIKE '%offertoro%' OR 
    source ILIKE '%offertoro%' OR
    title ILIKE '%offertoro%'
);

-- Force update AdWork offers
UPDATE public.offers 
SET network_id = 'adworkmedia' 
WHERE (
    provider ILIKE '%adwork%' OR 
    source ILIKE '%adwork%' OR
    title ILIKE '%adwork%'
);

-- Replace any remaining default-network with unknown
UPDATE public.offers 
SET network_id = 'unknown' 
WHERE network_id = 'default-network' OR network_id IS NULL;

-- Show the final results
SELECT 
    network_id,
    COUNT(*) as count
FROM public.offers 
GROUP BY network_id 
ORDER BY count DESC;
