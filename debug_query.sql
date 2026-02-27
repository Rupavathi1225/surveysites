-- Check actual offer counts in database
SELECT 
  COUNT(*) as total_offers,
  COUNT(CASE WHEN source = 'api' THEN 1 END) as api_offers,
  COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_offers,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_offers
FROM offers;

-- Check for duplicate offer_ids
SELECT 
  offer_id,
  COUNT(*) as count
FROM offers 
GROUP BY offer_id 
HAVING COUNT(*) > 1 
ORDER BY count DESC;

-- Check recent imports
SELECT 
  source,
  network_id,
  COUNT(*) as count,
  MIN(created_at) as first_imported,
  MAX(created_at) as last_imported
FROM offers 
WHERE source = 'api'
GROUP BY source, network_id 
ORDER BY last_imported DESC;
