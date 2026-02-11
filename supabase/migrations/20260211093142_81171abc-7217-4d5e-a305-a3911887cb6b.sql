
-- Add rewards (per-rank prizes) and allow_same_ip toggle to contests
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS rewards jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS allow_same_ip boolean DEFAULT true;
