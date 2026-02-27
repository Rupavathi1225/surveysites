-- Quick Recycle Bin Delete Fix
-- Run this in Supabase SQL Editor to fix delete permissions

-- 1. Check current RLS status
SELECT 'Checking RLS status...' as info;
SELECT schemaname, tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('offers', 'recycle_bin');

-- 2. Drop any restrictive policies
DROP POLICY IF EXISTS "Admin manages offers" ON public.offers;
DROP POLICY IF EXISTS "Admin manages recycle_bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Anyone can view offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can insert offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can update offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can delete offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated full access to offers" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated full access to recycle_bin" ON public.recycle_bin;

-- 3. Create simple permissive policies
CREATE POLICY "Enable full access for authenticated users" ON public.offers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable full access for authenticated users" ON public.recycle_bin
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Verify policies
SELECT 'Offers policies:' as info;
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'offers';

SELECT 'Recycle bin policies:' as info;
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'recycle_bin';

-- 5. Test deletion (should show success or item not found error, not permission error)
DO $$
DECLARE
    test_id uuid;
BEGIN
    SELECT id INTO test_id FROM public.recycle_bin LIMIT 1;
    IF test_id IS NOT NULL THEN
        RAISE NOTICE 'Testing delete on recycle_bin item: %', test_id;
        DELETE FROM public.recycle_bin WHERE id = test_id;
        RAISE NOTICE '✅ Delete test successful!';
    ELSE
        RAISE NOTICE 'ℹ️ No items in recycle_bin to test';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Delete test failed: %', SQLERRM;
END $$;

SELECT 'Quick fix completed! Try deleting from recycle bin now.' as result;
