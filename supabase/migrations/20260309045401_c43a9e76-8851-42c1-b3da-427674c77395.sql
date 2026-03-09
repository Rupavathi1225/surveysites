CREATE POLICY "All authenticated users can read feed_generator entries"
ON public.earning_history
FOR SELECT
TO authenticated
USING (type = 'feed_generator');