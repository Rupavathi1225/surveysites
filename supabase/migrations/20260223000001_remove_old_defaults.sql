-- Remove old hardcoded default configurations
DELETE FROM public.api_import_configs 
WHERE provider_name IN ('CPX Research', 'BitLabs');
