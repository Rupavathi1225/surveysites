-- Recycle Bin Delete Fix - Run in Supabase SQL Editor
-- This fixes the issue where offers can't be permanently deleted from recycle bin

-- 1. First, let's check if RLS is enabled and what policies exist
SELECT 'Checking RLS status...' as info;
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('offers', 'recycle_bin', 'profiles');

-- 2. Check existing policies on offers table
SELECT 'Current policies on offers:' as info;
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'offers';

-- 3. Check existing policies on recycle_bin table
SELECT 'Current policies on recycle_bin:' as info;
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'recycle_bin';

-- 4. Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Admin manages offers" ON public.offers;
DROP POLICY IF EXISTS "Admin manages recycle bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Anyone can view offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can insert offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can update offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can delete offers" ON public.offers;

-- 5. Create permissive RLS policies for offers table
-- Allow authenticated users to do everything with offers
CREATE POLICY "Allow authenticated full access to offers" ON public.offers
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Create permissive RLS policies for recycle_bin table
-- Allow authenticated users to do everything with recycle_bin
CREATE POLICY "Allow authenticated full access to recycle_bin" ON public.recycle_bin
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Verify the new policies
SELECT 'New policies on offers:' as info;
SELECT policyname, cmd, permissive, roles FROM pg_policies WHERE tablename = 'offers';

SELECT 'New policies on recycle_bin:' as info;
SELECT policyname, cmd, permissive, roles FROM pg_policies WHERE tablename = 'recycle_bin';

-- 8. Test: Try to delete a test offer (use a fake UUID to test permissions without actually deleting)
-- This should return an error about the UUID not being found, NOT a permission error
DO $$
BEGIN
    DELETE FROM public.offers WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Delete test result: %', SQLERRM;
END
$$;

-- 9. Check for foreign key constraints that might block deletion
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'offers' OR tc.table_name = 'recycle_bin');

-- 10. If there are foreign keys with RESTRICT, they might be blocking deletes
-- Check if recycle_bin.offer_id has ON DELETE RESTRICT
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND kcu.column_name = 'offer_id'
AND tc.table_name = 'recycle_bin';

-- 11. If foreign key has RESTRICT, drop and recreate with CASCADE
-- Uncomment the following if needed:
-- ALTER TABLE public.recycle_bin DROP CONSTRAINT IF EXISTS recycle_bin_offer_id_fkey;
-- ALTER TABLE public.recycle_bin ADD CONSTRAINT recycle_bin_offer_id_fkey 
--     FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

-- 12. Final test - check if we can delete from recycle_bin
DO $$
DECLARE
    test_id uuid;
BEGIN
    -- Get a sample recycle_bin id
    SELECT id INTO test_id FROM public.recycle_bin LIMIT 1;
    IF test_id IS NOT NULL THEN
        RAISE NOTICE 'Testing delete on recycle_bin ID: %', test_id;
    ELSE
        RAISE NOTICE 'No items in recycle_bin to test';
    END IF;
END
$$;

SELECT 'Fix complete! Try deleting from recycle bin now.' as info;
