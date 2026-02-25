-- Fix foreign key constraints blocking deletion

-- STEP 1: Find all tables that reference recycle_bin
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'recycle_bin';

-- STEP 2: Find all tables that reference offers
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'offers';

-- STEP 3: Check if there are any records in those referencing tables
-- (This will show us what's blocking the deletion)

-- Check bulk_import_logs if it references recycle_bin
SELECT COUNT(*) as bulk_import_logs_count 
FROM bulk_import_logs 
WHERE recycle_bin_id IS NOT NULL;

-- Check duplicate_detection_logs if it references offers
SELECT COUNT(*) as duplicate_detection_logs_count 
FROM duplicate_detection_logs 
WHERE matching_offer_id IN (
    SELECT offer_id FROM recycle_bin LIMIT 1000
);

-- Check missing_offers_report if it references offers
SELECT COUNT(*) as missing_offers_report_count 
FROM missing_offers_report 
WHERE report_data::jsonb ? 'offer_ids';

-- STEP 4: Drop the foreign key constraints that are blocking deletion
-- WARNING: This will remove data integrity but allow deletion

-- Drop foreign key from bulk_import_logs (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'bulk_import_logs_recycle_bin_id_fkey') THEN
        ALTER TABLE bulk_import_logs DROP CONSTRAINT bulk_import_logs_recycle_bin_id_fkey;
        RAISE NOTICE '✅ Dropped bulk_import_logs foreign key constraint';
    END IF;
END $$;

-- Drop foreign key from duplicate_detection_logs (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'duplicate_detection_logs_matching_offer_id_fkey') THEN
        ALTER TABLE duplicate_detection_logs DROP CONSTRAINT duplicate_detection_logs_matching_offer_id_fkey;
        RAISE NOTICE '✅ Dropped duplicate_detection_logs foreign key constraint';
    END IF;
END $$;

-- STEP 5: Now test deletion again
DO $$
DECLARE
    item_id UUID;
    item_exists BOOLEAN;
BEGIN
    -- Get first recycle bin item
    SELECT id INTO item_id 
    FROM public.recycle_bin 
    LIMIT 1;
    
    IF item_id IS NOT NULL THEN
        RAISE NOTICE 'Testing deletion with item ID: %', item_id;
        
        -- Try to delete the item
        DELETE FROM public.recycle_bin WHERE id = item_id;
        
        -- Check if it was deleted
        SELECT EXISTS(SELECT 1 FROM public.recycle_bin WHERE id = item_id) INTO item_exists;
        
        IF item_exists THEN
            RAISE NOTICE '❌ Delete failed - item still exists';
        ELSE
            RAISE NOTICE '✅ Delete successful - item removed';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ No items found in recycle bin to test';
    END IF;
END $$;

-- STEP 6: Check final count
SELECT COUNT(*) as final_recycle_bin_count FROM public.recycle_bin;
