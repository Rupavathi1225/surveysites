-- Add approval workflow fields to offers table
-- Run this SQL in your Supabase SQL Editor

-- Check if columns exist before adding them
DO $$
BEGIN
    -- Add approval_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE offers ADD COLUMN approval_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add approved_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'approved_date'
    ) THEN
        ALTER TABLE offers ADD COLUMN approved_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE offers ADD COLUMN approved_by TEXT;
    END IF;
    
    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE offers ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offers_approval_status ON offers(approval_status);
CREATE INDEX IF NOT EXISTS idx_offers_approved_date ON offers(approved_date);

-- Update existing offers to have default approval status
UPDATE offers SET approval_status = 'pending' WHERE approval_status IS NULL;
