-- Universal SQL fix for delete permissions
-- This doesn't rely on specific email addresses

-- STEP 1: Check if user is authenticated
SELECT auth.uid(), auth.jwt() ->> 'email', auth.role();

-- STEP 2: Drop all existing policies completely
DROP POLICY IF EXISTS "Admin manages offers" ON public.offers;
DROP POLICY IF EXISTS "Admin manages recycle bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Users can view offers" ON public.offers;
DROP POLICY IF EXISTS "Users can view recycle bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Users can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Users can view their recycle bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Auth users read active offers" ON public.offers;

-- STEP 3: Disable RLS temporarily to allow operations
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin DISABLE ROW LEVEL SECURITY;

-- STEP 4: Test direct delete (this should work now)
-- This will show if delete works without RLS
DELETE FROM public.recycle_bin WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- STEP 5: Re-enable RLS with simple policies
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create simple admin policy (for any authenticated user)
CREATE POLICY "Authenticated users can manage offers" ON public.offers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage recycle bin" ON public.recycle_bin
    FOR ALL USING (auth.role() = 'authenticated');

-- STEP 7: Create public read policy for offers
CREATE POLICY "Public can read offers" ON public.offers
    FOR SELECT USING (is_deleted = false AND is_public = true);

-- STEP 8: Verify policies
SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 9: Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('offers', 'recycle_bin');
