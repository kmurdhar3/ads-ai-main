-- Storage bucket for AI-generated ad images (run once in the Supabase SQL editor).
-- Kie.ai's own image links expire, so the app copies each image here.
-- Safe to re-run.

-- Public bucket: images are ad creative meant to be viewed and downloaded.
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Logged-in users can upload and overwrite images (the app uses upsert).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload generated images') THEN
    CREATE POLICY "Authenticated users can upload generated images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'generated-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update generated images') THEN
    CREATE POLICY "Authenticated users can update generated images"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'generated-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view generated images') THEN
    CREATE POLICY "Anyone can view generated images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'generated-images');
  END IF;
END $$;
