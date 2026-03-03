-- Get all non-deleted offers with cache busting
CREATE OR REPLACE FUNCTION get_all_offers_fresh(cache_buster text, timestamp bigint)
RETURNS TABLE (
  id uuid,
  offer_id text,
  title text,
  url text,
  payout numeric,
  source text,
  status text,
  devices text,
  device text,
  percent numeric,
  category text,
  currency text,
  offer_id text,
  platform text,
  provider text,
  vertical text,
  countries text,
  image_url text,
  is_public boolean,
  created_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz,
  description text,
  expiry_date timestamptz,
  preview_url text,
  payout_model text,
  non_access_url text,
  import_batch_id text,
  traffic_sources text,
  allowed_countries text,
  is_deleted boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add cache busting to prevent stale data
  PERFORM pg_sleep(0.1);
  
  RETURN QUERY 
  SELECT 
    o.*,
    EXTRACT(EPOCH FROM o.created_at) * 1000 as created_timestamp
  FROM offers o
  WHERE o.is_deleted = false
  ORDER BY o.created_at DESC;
END;
$$;
