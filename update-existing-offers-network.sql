-- Update existing offers with network_id based on their provider field patterns
-- This will add network_id to existing offers so they show in Network column

-- Update offers with CJXNO network patterns
UPDATE public.offers 
SET network_id = 'cjxnonetwork' 
WHERE network_id IS NULL 
AND (
    provider ILIKE '%cjxno%' OR 
    provider ILIKE '%cjx%' OR
    source ILIKE '%cjxno%' OR
    source ILIKE '%cjx%' OR
    title ILIKE '%cjxno%' OR
    title ILIKE '%cjx%'
);

-- Update offers with CPA network patterns
UPDATE public.offers 
SET network_id = 'cpa' 
WHERE network_id IS NULL 
AND (
    provider ILIKE '%cpa%' OR 
    source ILIKE '%cpa%' OR
    title ILIKE '%cpa%'
);

-- Update offers with Lead network patterns
UPDATE public.offers 
SET network_id = 'leadads' 
WHERE network_id IS NULL 
AND (
    provider ILIKE '%lead%' OR 
    source ILIKE '%lead%' OR
    title ILIKE '%lead%'
);

-- Update offers with Merchant network patterns
UPDATE public.offers 
SET network_id = 'merchant' 
WHERE network_id IS NULL 
AND (
    provider ILIKE '%merchant%' OR 
    source ILIKE '%merchant%' OR
    title ILIKE '%merchant%'
);

-- Update offers with OfferToro network patterns
UPDATE public.offers 
SET network_id = 'offertoro' 
WHERE network_id IS NULL 
AND (
    provider ILIKE '%offertoro%' OR 
    source ILIKE '%offertoro%' OR
    title ILIKE '%offertoro%'
);

-- Update offers with AdWork network patterns
UPDATE public.offers 
SET network_id = 'adworkmedia' 
WHERE network_id IS NULL 
AND (
    provider ILIKE '%adwork%' OR 
    source ILIKE '%adwork%' OR
    title ILIKE '%adwork%'
);

-- For any remaining offers, assign a default network_id
UPDATE public.offers 
SET network_id = 'unknown' 
WHERE network_id IS NULL;

-- Show the results
SELECT 
    provider,
    network_id,
    COUNT(*) as offer_count
FROM public.offers 
WHERE network_id IS NOT NULL
GROUP BY provider, network_id 
ORDER BY offer_count DESC;

-- Show the results
SELECT 
    provider,
    source,
    network_id,
    COUNT(*) as offer_count
FROM public.offers 
GROUP BY provider, source, network_id 
ORDER BY offer_count DESC;

-- Show sample offers with their network_id
SELECT id, title, provider, source, network_id, created_at
FROM public.offers 
WHERE network_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
