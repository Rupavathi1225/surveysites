-- Test query to check current network_id values
SELECT 
    id,
    title,
    provider,
    network_id,
    CASE 
        WHEN network_id IS NULL THEN 'MISSING'
        WHEN network_id = 'default-network' THEN 'DEFAULT'
        ELSE network_id
    END as status
FROM public.offers 
ORDER BY created_at DESC 
LIMIT 10;

-- Count of each network_id type
SELECT 
    network_id,
    COUNT(*) as count
FROM public.offers 
GROUP BY network_id 
ORDER BY count DESC;
