ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_properties_amenities
  ON public.properties USING GIN (amenities);

CREATE OR REPLACE FUNCTION public.match_properties_hybrid (
  query_embedding vector(768),
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_bedrooms int DEFAULT NULL,
  p_max_bedrooms int DEFAULT NULL,
  p_amenities text[] DEFAULT NULL,
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
  amenities text[],
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
    p.amenities,
    CASE WHEN p.embedding IS NULL THEN NULL ELSE (1 - (p.embedding <=> query_embedding))::float END AS similarity
  FROM public.properties p
  WHERE (p_city IS NULL OR p.city ILIKE '%' || p_city || '%')
    AND (p_property_type IS NULL OR p.property_type = p_property_type)
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    AND (p_min_bedrooms IS NULL OR p.bedrooms >= p_min_bedrooms)
    AND (p_max_bedrooms IS NULL OR p.bedrooms <= p_max_bedrooms)
    AND (p_amenities IS NULL OR p.amenities @> p_amenities)
  ORDER BY (p.embedding <=> query_embedding) ASC NULLS LAST
  LIMIT match_count;
END;
$$;
