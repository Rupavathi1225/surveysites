-- Test the recycle bin delete function
-- Run this in Supabase SQL Editor to test if deletes work

-- 1. Check current recycle bin contents
SELECT 'Current recycle bin items:' as info;
SELECT id, offer_id, deleted_at, 
       CASE 
         WHEN restored_at IS NULL THEN 'Not restored'
         ELSE 'Restored'
       END as status
FROM public.recycle_bin 
ORDER BY deleted_at DESC;

-- 2. Try to delete one item (if any exist)
DO $$
DECLARE
    test_id uuid;
    test_offer_id text;
BEGIN
    -- Get a sample recycle bin item that hasn't been restored
    SELECT id, offer_id INTO test_id, test_offer_id 
    FROM public.recycle_bin 
    WHERE restored_at IS NULL 
    LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing deletion on recycle_bin item: %', test_id;
        RAISE NOTICE '🧪 Corresponding offer_id: %', test_offer_id;
        
        -- First, delete the offer if it exists
        IF test_offer_id IS NOT NULL THEN
            DELETE FROM public.offers WHERE id = test_offer_id::uuid;
            RAISE NOTICE '✅ Deleted offer from offers table';
        END IF;
        
        -- Then delete from recycle bin
        DELETE FROM public.recycle_bin WHERE id = test_id;
        RAISE NOTICE '✅ Deleted item from recycle_bin table';
        RAISE NOTICE '🎉 Delete test successful!';
    ELSE
        RAISE NOTICE 'ℹ️ No items in recycle_bin to test deletion';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Delete test failed: %', SQLERRM;
    RAISE NOTICE '❌ SQLSTATE: %', SQLSTATE;
END $$;

-- 3. Check final status
SELECT 'Recycle bin item count after test:' as info, COUNT(*) as count 
FROM public.recycle_bin;

-- 4. If the test worked, the delete function should work from the UI too
SELECT 'Test completed! If no errors above, the delete function should work from the admin panel.' as result;
