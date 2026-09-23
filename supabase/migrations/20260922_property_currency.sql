ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'USD'
  CHECK (currency IN ('USD', 'VES', 'EUR'));

GRANT SELECT (currency) ON public.properties TO anon, authenticated;

CREATE OR REPLACE VIEW public.property_listings WITH (security_invoker = true) AS
SELECT
  p.id, p.title, p.property_type, p.operation_type, p.price, p.bedrooms, p.bathrooms,
  p.square_meters, p.city,
  public.masked_property_address(p.id, p.agency_id) AS address,
  public.masked_property_latitude(p.id, p.agency_id) AS latitude,
  public.masked_property_longitude(p.id, p.agency_id) AS longitude,
  p.description, p.status, p.image_url, p.images, p.amenities, p.embedding, p.created_at,
  p.agency_id, p.created_by,
  a.name AS agency_name,
  ap.display_name AS agent_name,
  p.currency
FROM public.properties p
JOIN public.agencies a ON a.id = p.agency_id
LEFT JOIN public.agents_public ap ON ap.user_id = p.created_by;

DROP FUNCTION IF EXISTS public.match_properties_hybrid (vector, text, text, numeric, numeric, integer, integer, text[], integer);

CREATE FUNCTION public.match_properties_hybrid (
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
  operation_type varchar,
  price numeric,
  currency varchar,
  bedrooms int,
  bathrooms numeric,
  square_meters int,
  city varchar,
  address text,
  latitude double precision,
  longitude double precision,
  description text,
  status varchar,
  image_url text,
  images text[],
  amenities text[],
  agency_id uuid,
  agency_name text,
  agent_name text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.property_type,
    p.operation_type,
    p.price,
    p.currency,
    p.bedrooms,
    p.bathrooms,
    p.square_meters,
    p.city,
    p.address,
    p.latitude,
    p.longitude,
    p.description,
    p.status,
    p.image_url,
    p.images,
    p.amenities,
    p.agency_id,
    p.agency_name,
    p.agent_name,
    CASE WHEN p.embedding IS NULL THEN NULL ELSE (1 - (p.embedding <=> query_embedding))::float END AS similarity
  FROM public.property_listings p
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
