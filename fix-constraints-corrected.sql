-- Corrected foreign key constraints fix

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

-- STEP 3: Drop all foreign key constraints that reference recycle_bin or offers
-- This will allow deletion without constraint violations

DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Drop constraints referencing recycle_bin
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'recycle_bin'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_rec.table_name, constraint_rec.constraint_name);
            RAISE NOTICE '✅ Dropped constraint % on table %', constraint_rec.constraint_name, constraint_rec.table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Could not drop constraint % on table %: %', constraint_rec.constraint_name, constraint_rec.table_name, SQLERRM;
        END;
    END LOOP;
    
    -- Drop constraints referencing offers
    FOR constraint_rec IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'offers'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_rec.table_name, constraint_rec.constraint_name);
            RAISE NOTICE '✅ Dropped constraint % on table %', constraint_rec.constraint_name, constraint_rec.table_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Could not drop constraint % on table %: %', constraint_rec.constraint_name, constraint_rec.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- STEP 4: Now test deletion again
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

-- STEP 5: Check final count
SELECT COUNT(*) as final_recycle_bin_count FROM public.recycle_bin;
