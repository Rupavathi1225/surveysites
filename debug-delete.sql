-- SQL to check and fix delete permissions for recycle bin
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies on offers table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'offers';

-- 2. Check current RLS policies on recycle_bin table  
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'recycle_bin';

-- 3. Check if there are any foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'offers' OR tc.table_name = 'recycle_bin');

-- 4. Add/update RLS policies to allow admin to delete from offers table
DROP POLICY IF EXISTS "Admin manages offers" ON public.offers;
CREATE POLICY "Admin manages offers" ON public.offers
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@surveyi.com');

-- 5. Add/update RLS policies to allow admin to delete from recycle_bin table
DROP POLICY IF EXISTS "Admin manages recycle bin" ON public.recycle_bin;
CREATE POLICY "Admin manages recycle bin" ON public.recycle_bin
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@surveyi.com');

-- 6. Test delete permissions (run as admin)
-- This should return no errors if permissions are correct
DELETE FROM public.offers WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 7. Check if there are any triggers blocking deletion
SELECT event_object_table, trigger_name, action_timing, action_condition, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('offers', 'recycle_bin');

-- 8. Check table constraints
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid::regclass = 'public.offers'::regclass
   OR conrelid::regclass = 'public.recycle_bin'::regclass
ORDER BY conname;
