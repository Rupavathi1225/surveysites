-- Add new columns to offers table for bulk import features
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS import_batch_id uuid;

-- Create recycle bin table for soft-deleted offers (30-day retention)
CREATE TABLE IF NOT EXISTS public.recycle_bin (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  offer_data jsonb NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  restored_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages recycle_bin" ON public.recycle_bin 
  FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());

-- Create bulk import logs table
CREATE TABLE IF NOT EXISTS public.bulk_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  import_type text NOT NULL, -- 'csv', 'sheet', 'api'
  total_records integer DEFAULT 0,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  duplicate_skipped integer DEFAULT 0,
  import_data jsonb,
  error_log jsonb,
  imported_by uuid REFERENCES auth.users(id),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bulk_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages bulk_import_logs" ON public.bulk_import_logs 
  FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());

-- Create duplicate detection log table
CREATE TABLE IF NOT EXISTS public.duplicate_detection_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  offer_name text NOT NULL,
  matching_offer_id uuid REFERENCES public.offers(id),
  matching_criteria text[], -- array of matching fields: 'name', 'description', 'country', 'platform'
  action text DEFAULT 'skipped', -- 'skipped', 'merged', 'import_new'
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.duplicate_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages duplicate_detection_logs" ON public.duplicate_detection_logs 
  FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());

-- Create missing offers comparison table
CREATE TABLE IF NOT EXISTS public.missing_offers_report (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  report_name text,
  uploaded_offers jsonb NOT NULL, -- array of offers from upload
  missing_offers jsonb NOT NULL, -- array of missing offers
  matching_criteria text[] DEFAULT ARRAY['name', 'payout', 'country', 'platform'],
  report_data jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.missing_offers_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages missing_offers_report" ON public.missing_offers_report 
  FOR ALL USING (is_admin_or_subadmin()) WITH CHECK (is_admin_or_subadmin());

-- Update triggers
CREATE TRIGGER update_bulk_import_logs_updated_at 
  BEFORE UPDATE ON public.bulk_import_logs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missing_offers_report_updated_at 
  BEFORE UPDATE ON public.missing_offers_report 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON public.recycle_bin(deleted_at);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_expires_at ON public.recycle_bin(expires_at);
CREATE INDEX IF NOT EXISTS idx_bulk_import_logs_batch_id ON public.bulk_import_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_detection_logs_batch_id ON public.duplicate_detection_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_missing_offers_report_batch_id ON public.missing_offers_report(batch_id);
