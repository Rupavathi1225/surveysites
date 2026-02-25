-- Simple and direct SQL to add approval columns
-- Run this in Supabase SQL Editor

-- Add approval_status column
ALTER TABLE offers ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- Add approved_date column  
ALTER TABLE offers ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE;

-- Add approved_by column
ALTER TABLE offers ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Add rejection_reason column
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_offers_approval_status ON offers(approval_status);
CREATE INDEX IF NOT EXISTS idx_offers_approved_date ON offers(approved_date);

-- Update existing offers
UPDATE offers SET approval_status = 'pending' WHERE approval_status IS NULL;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND column_name IN ('approval_status', 'approved_date', 'approved_by', 'rejection_reason')
ORDER BY column_name;
