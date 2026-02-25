-- Diagnostic SQL to find what's blocking deletion

-- STEP 1: Check if RLS is really disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 2: Check remaining policies
SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('offers', 'recycle_bin');

-- STEP 3: Check for foreign key constraints
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
    AND (tc.table_name = 'offers' OR tc.table_name = 'recycle_bin');

-- STEP 4: Check for triggers that might block deletion
SELECT event_object_table, trigger_name, action_timing, action_condition, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('offers', 'recycle_bin');

-- STEP 5: Check table constraints
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid::regclass = 'public.offers'::regclass
   OR conrelid::regclass = 'public.recycle_bin'::regclass
ORDER BY conname;

-- STEP 6: Get a sample recycle bin item to test with
SELECT id, offer_id, deleted_at, expires_at 
FROM public.recycle_bin 
LIMIT 3;

-- STEP 7: Try to delete a specific item (replace with actual ID from step 6)
-- First, let's see what happens when we try to delete
-- This will show us the exact error
BEGIN;
DELETE FROM public.recycle_bin WHERE id = 'YOUR_ACTUAL_ID_HERE';
ROLLBACK;

-- STEP 8: Check if there are any indexes that might be causing issues
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('offers', 'recycle_bin');
