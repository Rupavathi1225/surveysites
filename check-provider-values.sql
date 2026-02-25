-- Check what values are actually in the provider field
SELECT 
    provider,
    network_id,
    COUNT(*) as count
FROM public.offers 
GROUP BY provider, network_id 
ORDER BY count DESC
LIMIT 20;

-- Show sample offers with their provider and network_id
SELECT 
    id,
    title,
    provider,
    network_id,
    source,
    created_at
FROM public.offers 
ORDER BY created_at DESC
LIMIT 10;
