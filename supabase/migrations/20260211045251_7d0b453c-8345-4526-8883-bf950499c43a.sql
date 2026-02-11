
-- Add detailed tracking columns to login_logs
ALTER TABLE public.login_logs 
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS isp text,
  ADD COLUMN IF NOT EXISTS method text DEFAULT 'PASSWORD',
  ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_new_device boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fingerprint text;
