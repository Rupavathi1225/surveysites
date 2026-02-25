-- Comprehensive test to debug recycle bin deletion
-- Run this in Supabase SQL Editor

-- 1. Check current state
SELECT '=== CURRENT RECYCLE BIN STATE ===' as info;
SELECT 
    id,
    offer_id,
    deleted_at,
    restored_at,
    CASE 
        WHEN restored_at IS NULL THEN 'Not restored'
        ELSE 'Restored'
    END as status
FROM public.recycle_bin 
ORDER BY deleted_at DESC 
LIMIT 5;

-- 2. Check if offers exist for these recycle bin items
SELECT '=== CHECKING OFFER EXISTENCE ===' as info;
SELECT 
    rb.id as recycle_id,
    rb.offer_id,
    o.id as offer_exists,
    CASE 
        WHEN o.id IS NOT NULL THEN 'Offer exists'
        ELSE 'Offer NOT found'
    END as offer_status
FROM public.recycle_bin rb
LEFT JOIN public.offers o ON o.id::text = rb.offer_id::text
WHERE rb.restored_at IS NULL
LIMIT 5;

-- 3. Test a sample deletion step by step
DO $$
DECLARE
    test_recycle_id uuid;
    test_offer_id text;
    test_offer_uuid uuid;
BEGIN
    -- Get a sample item
    SELECT id, offer_id INTO test_recycle_id, test_offer_id
    FROM public.recycle_bin 
    WHERE restored_at IS NULL 
    LIMIT 1;
    
    IF test_recycle_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Selected recycle item: %', test_recycle_id;
        RAISE NOTICE '🧪 Corresponding offer_id: %', test_offer_id;
        
        -- Try to convert offer_id to UUID
        BEGIN
            test_offer_uuid := test_offer_id::uuid;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Cannot convert offer_id to UUID: %', SQLERRM;
            test_offer_uuid := NULL;
        END;
        
        IF test_offer_uuid IS NOT NULL THEN
            RAISE NOTICE '✅ Converted to UUID: %', test_offer_uuid;
            
            -- Delete from offers table
            DELETE FROM public.offers WHERE id = test_offer_uuid;
            RAISE NOTICE '✅ Deleted from offers table';
            
            -- Delete from recycle bin
            DELETE FROM public.recycle_bin WHERE id = test_recycle_id;
            RAISE NOTICE '✅ Deleted from recycle bin';
            
            RAISE NOTICE '🎉 Test deletion successful!';
        ELSE
            RAISE NOTICE '❌ Could not convert offer_id to UUID';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ No items in recycle bin to test';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- 4. Check final state
SELECT '=== FINAL RECYCLE BIN STATE ===' as info;
SELECT COUNT(*) as remaining_items
FROM public.recycle_bin 
WHERE restored_at IS NULL;

SELECT '=== TEST COMPLETE ===' as result;
