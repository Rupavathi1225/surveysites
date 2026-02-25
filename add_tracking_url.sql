-- Add tracking_url column to offers table
-- Run this in Supabase SQL Editor

-- Add tracking_url column if it doesn't exist
ALTER TABLE offers ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_offers_tracking_url ON offers(tracking_url);

-- Verify column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND column_name = 'tracking_url'
ORDER BY column_name;
