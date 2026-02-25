-- Auto diagnostic SQL - gets real IDs and tests deletion

-- STEP 1: Check if RLS is really disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 2: Check remaining policies
SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 3: Check for foreign key constraints
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
    AND (tc.table_name = 'offers' OR tc.table_name = 'recycle_bin');

-- STEP 4: Check for triggers
SELECT event_object_table, trigger_name, action_timing, action_condition, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('offers', 'recycle_bin');

-- STEP 5: Get actual recycle bin items
SELECT id, offer_id, deleted_at, expires_at 
FROM public.recycle_bin 
LIMIT 3;

-- STEP 6: Test deletion with a real ID (automatically gets first item)
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

-- STEP 7: Check final count
SELECT COUNT(*) as final_recycle_bin_count FROM public.recycle_bin;
