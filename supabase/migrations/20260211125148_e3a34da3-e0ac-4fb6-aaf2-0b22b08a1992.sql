-- Add session_id column to login_logs
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS session_id text;

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_login_logs_session_id ON public.login_logs (session_id);