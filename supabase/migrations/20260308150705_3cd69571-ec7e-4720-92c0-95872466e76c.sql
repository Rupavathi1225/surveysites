CREATE POLICY "Users read own clicks"
ON public.offer_clicks
FOR SELECT
TO authenticated
USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users update own clicks"
ON public.offer_clicks
FOR UPDATE
TO authenticated
USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));