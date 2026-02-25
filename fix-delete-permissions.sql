-- Simple SQL to fix delete permissions for recycle bin
-- Run this in Supabase SQL Editor - one section at a time

-- STEP 1: Check current policies (run this first)
SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin manages offers" ON public.offers;
DROP POLICY IF EXISTS "Admin manages recycle bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Users can view offers" ON public.offers;
DROP POLICY IF EXISTS "Users can view recycle bin" ON public.recycle_bin;

-- STEP 3: Create new policies for offers table
CREATE POLICY "Admin manages offers" ON public.offers
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@surveyi.com');

CREATE POLICY "Users can view active offers" ON public.offers
    FOR SELECT USING (is_deleted = false AND is_public = true);

-- STEP 4: Create new policies for recycle bin table  
CREATE POLICY "Admin manages recycle bin" ON public.recycle_bin
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@surveyi.com');

CREATE POLICY "Users can view their recycle bin" ON public.recycle_bin
    FOR SELECT USING (auth.jwt() ->> 'email' = 'admin@surveyi.com');

-- STEP 5: Test the policies (run this to verify)
-- This should show the policies we just created
SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 6: Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 7: If RLS is not enabled, enable it
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;
