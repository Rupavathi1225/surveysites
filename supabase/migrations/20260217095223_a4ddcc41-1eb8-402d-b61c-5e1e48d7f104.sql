
-- Create storage bucket for survey provider images
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-provider-images', 'survey-provider-images', true);

-- Allow authenticated users to upload
CREATE POLICY "Auth users upload survey provider images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'survey-provider-images' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Public read survey provider images"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-provider-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Auth users update survey provider images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'survey-provider-images' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete
CREATE POLICY "Auth users delete survey provider images"
ON storage.objects FOR DELETE
USING (bucket_id = 'survey-provider-images' AND auth.uid() IS NOT NULL);
