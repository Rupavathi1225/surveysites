-- SQL to run in Supabase SQL Editor to enable Recycle Bin feature

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

-- Create bulk import logs table
CREATE TABLE IF NOT EXISTS public.bulk_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  import_type text NOT NULL,
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

-- Create duplicate detection log table
CREATE TABLE IF NOT EXISTS public.duplicate_detection_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  offer_name text NOT NULL,
  matching_offer_id uuid REFERENCES public.offers(id),
  matching_criteria text[],
  action text DEFAULT 'skipped',
  created_at timestamp with time zone DEFAULT now()
);

-- Create missing offers comparison table
CREATE TABLE IF NOT EXISTS public.missing_offers_report (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  report_name text,
  uploaded_offers jsonb NOT NULL,
  missing_offers jsonb NOT NULL,
  matching_criteria text[] DEFAULT ARRAY['name', 'payout', 'country', 'platform'],
  report_data jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
