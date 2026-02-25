-- Check recycle bin data format
-- Run this in Supabase SQL Editor to debug the issue

-- 1. Check the structure of recycle_bin table
SELECT 'Recycle bin table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'recycle_bin' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check sample data with types
SELECT 'Sample recycle bin data:' as info;
SELECT 
    id,
    offer_id,
    pg_typeof(offer_id) as offer_id_type,
    deleted_at,
    restored_at,
    CASE 
        WHEN restored_at IS NULL THEN 'Not restored'
        ELSE 'Restored'
    END as status
FROM public.recycle_bin 
WHERE restored_at IS NULL
LIMIT 5;

-- 3. Check if these offer_ids exist in offers table
SELECT 'Checking if offer_ids exist in offers table:' as info;
SELECT 
    rb.id as recycle_id,
    rb.offer_id,
    rb.offer_id_type,
    o.id as offer_exists,
    o.title as offer_title,
    o.is_deleted as offer_is_deleted
FROM (
    SELECT 
        id, 
        offer_id,
        pg_typeof(offer_id) as offer_id_type
    FROM public.recycle_bin 
    WHERE restored_at IS NULL
    LIMIT 3
) rb
LEFT JOIN public.offers o ON o.id = rb.offer_id::text;

-- 4. Try a manual delete to see what happens
DO $$
DECLARE
    test_recycle_id uuid;
    test_offer_id text;
BEGIN
    -- Get a sample item
    SELECT id, offer_id INTO test_recycle_id, test_offer_id
    FROM public.recycle_bin 
    WHERE restored_at IS NULL 
    LIMIT 1;
    
    IF test_recycle_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing with recycle_id: %, offer_id: %', test_recycle_id, test_offer_id;
        RAISE NOTICE '🧪 offer_id type: %', pg_typeof(test_offer_id);
        
        -- Check if offer exists
        IF EXISTS (SELECT 1 FROM public.offers WHERE id = test_offer_id::text) THEN
            RAISE NOTICE '✅ Offer exists in offers table';
            
            -- Try to delete the offer
            DELETE FROM public.offers WHERE id = test_offer_id::text;
            RAISE NOTICE '✅ Successfully deleted offer';
            
            -- Delete from recycle bin
            DELETE FROM public.recycle_bin WHERE id = test_recycle_id;
            RAISE NOTICE '✅ Successfully deleted from recycle bin';
        ELSE
            RAISE NOTICE '❌ Offer does not exist in offers table';
            
            -- Just delete from recycle bin
            DELETE FROM public.recycle_bin WHERE id = test_recycle_id;
            RAISE NOTICE '✅ Deleted from recycle bin only (offer was already gone)';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ No items to test with';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- 5. Final count
SELECT 'Final recycle bin count:' as info, COUNT(*) as count 
FROM public.recycle_bin 
WHERE restored_at IS NULL;
