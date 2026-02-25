-- Add unique index on offer_id + provider so that upsert with ON CONFLICT works
-- If duplicates already exist, you may need to clean them before running this migration.

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_offer_provider_unique
ON public.offers (offer_id, provider);
