-- Force refresh Supabase schema cache
-- Run this after adding columns to refresh the PostgREST schema

-- Method 1: Touch the table to trigger schema refresh
SELECT 1 FROM offers LIMIT 1;

-- Method 2: Update a single row to trigger cache refresh
UPDATE offers 
SET updated_at = CURRENT_TIMESTAMP 
WHERE id = (SELECT id FROM offers LIMIT 1);

-- Method 3: Force schema reload by creating and dropping a temporary table
DROP TABLE IF EXISTS temp_schema_refresh;
CREATE TEMP TABLE temp_schema_refresh AS SELECT 1;
DROP TABLE temp_schema_refresh;

-- Method 4: Check current schema to verify columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND column_name IN ('approval_status', 'approved_date', 'approved_by', 'rejection_reason')
ORDER BY column_name;

-- Method 5: Test query to verify schema cache is updated
SELECT 
    'approval_status' as field_name,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_offers
FROM offers
UNION ALL
SELECT 
    'approved_date' as field_name,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN approved_date IS NOT NULL THEN 1 END) as approved_offers
FROM offers;
