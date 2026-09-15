-- ==============================================================================
-- Migration: Convert Properties Table to International Metric Standard (m²)
-- ==============================================================================

-- 1. Add square_meters column if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'square_meters'
    ) THEN
        ALTER TABLE public.properties ADD COLUMN square_meters INTEGER;
    END IF;
END $$;

-- 2. Populate square_meters from existing square_feet (if square_feet exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'square_feet'
    ) THEN
        UPDATE public.properties 
        SET square_meters = ROUND(square_feet * 0.092903)
        WHERE square_meters IS NULL;
    END IF;
END $$;

-- Fallback for any newly inserted rows with missing values
UPDATE public.properties 
SET square_meters = 100 
WHERE square_meters IS NULL;

-- 3. Enforce NOT NULL constraint on square_meters
ALTER TABLE public.properties ALTER COLUMN square_meters SET NOT NULL;

-- 4. Drop deprecated square_feet column if present
ALTER TABLE public.properties DROP COLUMN IF EXISTS square_feet;

-- 5. Update match_properties semantic vector search function for metric standard
DROP FUNCTION IF EXISTS public.match_properties(vector, double precision, integer);
DROP FUNCTION IF EXISTS public.match_properties(vector, float, int);
DROP FUNCTION IF EXISTS public.match_properties;

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
  square_meters int,
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
    p.square_meters,
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
