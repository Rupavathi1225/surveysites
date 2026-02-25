-- Fix recycle bin data type issues
-- Run this in Supabase SQL Editor

-- 1. Check current data types
SELECT 'Current data types in recycle_bin:' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'recycle_bin' 
AND table_schema = 'public'
AND column_name = 'offer_id';

SELECT 'Current data types in offers:' as info;
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND table_schema = 'public'
AND column_name = 'id';

-- 2. Check sample data to see the issue
SELECT 'Sample data comparison:' as info;
SELECT 
    rb.id as recycle_id,
    rb.offer_id as recycle_offer_id,
    pg_typeof(rb.offer_id) as recycle_offer_id_type,
    o.id as offers_id,
    pg_typeof(o.id) as offers_id_type,
    CASE 
        WHEN o.id IS NOT NULL THEN 'MATCH FOUND'
        ELSE 'NO MATCH'
    END as match_status
FROM public.recycle_bin rb
LEFT JOIN public.offers o ON o.id::text = rb.offer_id::text
WHERE rb.restored_at IS NULL
LIMIT 5;

-- 3. Fix the issue by updating offers table to use text comparison
-- This creates a temporary function to handle the conversion
CREATE OR REPLACE FUNCTION text_to_uuid(text_val text)
RETURNS uuid
LANGUAGE sql
AS $$
BEGIN
    RETURN text_val::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 4. Test the function
SELECT 'Testing conversion function:' as info;
SELECT 
    offer_id,
    text_to_uuid(offer_id) as converted_uuid,
    pg_typeof(text_to_uuid(offer_id)) as converted_type
FROM public.recycle_bin 
WHERE restored_at IS NULL
LIMIT 3;

-- 5. Now try to delete using the conversion function
DO $$
DECLARE
    test_recycle_id uuid;
    test_offer_id text;
    converted_uuid uuid;
BEGIN
    -- Get a sample item
    SELECT id, offer_id INTO test_recycle_id, test_offer_id
    FROM public.recycle_bin 
    WHERE restored_at IS NULL 
    LIMIT 1;
    
    IF test_recycle_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing with recycle_id: %, offer_id: %', test_recycle_id, test_offer_id;
        
        -- Convert the offer_id
        converted_uuid := text_to_uuid(test_offer_id);
        RAISE NOTICE '🧪 Converted UUID: %', converted_uuid;
        
        -- Check if offer exists
        IF EXISTS (SELECT 1 FROM public.offers WHERE id = converted_uuid) THEN
            RAISE NOTICE '✅ Offer exists, deleting...';
            
            -- Delete the offer
            DELETE FROM public.offers WHERE id = converted_uuid;
            RAISE NOTICE '✅ Offer deleted';
            
            -- Delete from recycle bin
            DELETE FROM public.recycle_bin WHERE id = test_recycle_id;
            RAISE NOTICE '✅ Recycle bin item deleted';
        ELSE
            RAISE NOTICE '❌ Offer does not exist after conversion';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ No items to test with';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- 6. Clean up the function
DROP FUNCTION IF EXISTS text_to_uuid(text);

SELECT 'Fix test completed!' as result;
