# Fix Recycle Bin TypeScript Errors

## Tasks:
- [ ] 1. Add `recycle_bin` table type definition to `types.ts`
- [ ] 2. Add missing columns to `offers` table in `types.ts`: `is_deleted`, `deleted_at`, `is_public`, `import_batch_id`

## Error Summary:
- Error 1: `"recycle_bin"` not assignable to table names - Table not defined in types
- Error 2: `'is_deleted'` does not exist on offers type - Column missing in types
- Error 3: `'restored_at'` does not exist - Column missing in types  
- Error 4: `'offer_id'` property issues - Using wrong table types

## Solution:
Update `surveysites/src/integrations/supabase/types.ts` to include the missing table and columns.
