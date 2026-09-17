-- ==============================================================================
-- Migration: Add latitude/longitude/description to properties, and allow
-- uploads to the existing property-images Storage bucket.
-- ==============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- The property-images bucket (created in 20260914_create_properties_and_vector.sql) has a
-- public-read policy but no write policy yet - nothing has ever uploaded to it. This adds
-- a scoped insert policy so the client can upload photos directly during registration,
-- matching the bucket's existing public trust boundary (the app has no auth to scope by).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'Allow public upload to property-images'
    ) THEN
        CREATE POLICY "Allow public upload to property-images"
        ON storage.objects
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (bucket_id = 'property-images');
    END IF;
END $$;
