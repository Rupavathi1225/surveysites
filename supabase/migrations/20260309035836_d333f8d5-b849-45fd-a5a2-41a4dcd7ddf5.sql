-- Allow all authenticated users to read website_settings (for activity feed, etc.)
CREATE POLICY "Auth users read settings" ON public.website_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);