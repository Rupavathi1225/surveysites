-- Add is_deleted column to offers table (soft delete)
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create recycle_bin table for soft-deleted offers
CREATE TABLE IF NOT EXISTS public.recycle_bin (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id text NOT NULL,
  offer_data jsonb,
  deleted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on recycle_bin
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;

-- Policy for recycle_bin
CREATE POLICY "Admins can manage recycle_bin" ON public.recycle_bin 
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_is_deleted ON public.offers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON public.recycle_bin(deleted_at);

-- Add boost_expiry_date column for timer feature
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS boost_expiry_date timestamp with time zone;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS boost_percent numeric DEFAULT 0;
