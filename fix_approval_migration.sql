-- Complete approval workflow migration for offers table
-- This script handles all scenarios including schema cache issues

-- Clear schema cache first to ensure fresh metadata
DO $$
BEGIN
    -- Notify user we're clearing cache
    RAISE NOTICE 'Clearing schema cache for approval fields migration';
    
    -- Clear the specific table from cache
    PERFORM pg_notify('offers', 'cache_invalidate');
END $$;

-- Wait a moment for cache to clear
DO $$
BEGIN
    PERFORM pg_sleep(1);
END $$;

-- Now add the approval fields with proper error handling
DO $$
BEGIN
    -- Add approval_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE offers ADD COLUMN approval_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added approval_status column';
    ELSE
        RAISE NOTICE 'approval_status column already exists';
    END IF;
    
    -- Add approved_date column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'approved_date'
    ) THEN
        ALTER TABLE offers ADD COLUMN approved_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added approved_date column';
    ELSE
        RAISE NOTICE 'approved_date column already exists';
    END IF;
    
    -- Add approved_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE offers ADD COLUMN approved_by TEXT;
        RAISE NOTICE 'Added approved_by column';
    ELSE
        RAISE NOTICE 'approved_by column already exists';
    END IF;
    
    -- Add rejection_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE offers ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Added rejection_reason column';
    ELSE
        RAISE NOTICE 'rejection_reason column already exists';
    END IF;
END $$;

-- Add indexes for better performance
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_offers_approval_status ON offers(approval_status);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create approval_status index';
END;

CREATE INDEX IF NOT EXISTS idx_offers_approved_date ON offers(approved_date);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create approved_date index';
END;
END $$;

-- Update existing offers to have default approval status
DO $$
BEGIN
    UPDATE offers 
    SET approval_status = 'pending' 
    WHERE approval_status IS NULL;
    
    GET DIAGNOSTICS = updated_count;
    RAISE NOTICE 'Updated ' || updated_count || ' offers to pending status';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to update offers: ' || SQLERRM || ' - ' || SQLSTATE;
END $$;

-- Success message
DO $$
BEGIN
    SELECT 'All approval fields added successfully!' as result;
END $$;
