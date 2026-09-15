-- ==============================================================================
-- HUBIK Real Estate & Vector Search Schema Migration
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('Apartment', 'Single Family', 'Townhouse', 'Studio', 'Condo')),
    price NUMERIC(12, 2) NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms NUMERIC(3, 1) NOT NULL,
    square_feet INTEGER NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Sold')),
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Filter and Sorting B-Tree Indexes
CREATE INDEX IF NOT EXISTS properties_city_idx ON public.properties (city);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON public.properties (property_type);
CREATE INDEX IF NOT EXISTS properties_price_idx ON public.properties (price);
CREATE INDEX IF NOT EXISTS properties_bedrooms_idx ON public.properties (bedrooms);
CREATE INDEX IF NOT EXISTS properties_status_idx ON public.properties (status);

-- 4. HNSW Vector Index for Cosine Similarity Search
CREATE INDEX IF NOT EXISTS properties_embedding_hnsw_idx 
ON public.properties 
USING hnsw (embedding vector_cosine_ops);

-- 5. Row Level Security (RLS)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'properties' AND policyname = 'Allow public read access on properties'
    ) THEN
        CREATE POLICY "Allow public read access on properties"
        ON public.properties
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- 6. Storage Bucket for Property Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public read access on property-images'
    ) THEN
        CREATE POLICY "Allow public read access on property-images"
        ON storage.objects
        FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'property-images');
    END IF;
END $$;

-- 7. Semantic Vector Search RPC Function
CREATE OR REPLACE FUNCTION public.match_properties (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title varchar,
  property_type varchar,
  price numeric,
  bedrooms int,
  bathrooms numeric,
  square_feet int,
  city varchar,
  address text,
  status varchar,
  image_url text,
  images text[],
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.property_type,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.city,
    p.address,
    p.status,
    p.image_url,
    p.images,
    (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM public.properties p
  WHERE p.embedding IS NOT NULL 
    AND (1 - (p.embedding <=> query_embedding)) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
