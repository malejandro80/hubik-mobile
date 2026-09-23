CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = ''
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, p_text)
$$;

CREATE OR REPLACE FUNCTION public.listing_search_tsv(p_title text, p_amenities text[], p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT
    setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(p_title, ''))), 'A')
    || setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(array_to_string(p_amenities, ' '), ''))), 'B')
    || setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(p_description, ''))), 'C')
$$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (public.listing_search_tsv(title::text, amenities, description)) STORED;

CREATE INDEX IF NOT EXISTS properties_search_tsv_idx ON public.properties USING gin (search_tsv);

GRANT SELECT (search_tsv) ON public.properties TO anon, authenticated;

CREATE OR REPLACE VIEW public.property_listings
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.title,
  p.property_type,
  p.operation_type,
  p.price,
  p.bedrooms,
  p.bathrooms,
  p.square_meters,
  p.city,
  masked_property_address(p.id, p.agency_id) AS address,
  masked_property_latitude(p.id, p.agency_id) AS latitude,
  masked_property_longitude(p.id, p.agency_id) AS longitude,
  p.description,
  p.status,
  p.image_url,
  p.images,
  p.amenities,
  p.embedding,
  p.created_at,
  p.agency_id,
  p.created_by,
  a.name AS agency_name,
  ap.display_name AS agent_name,
  p.currency,
  p.search_tsv
FROM properties p
JOIN agencies a ON a.id = p.agency_id
LEFT JOIN agents_public ap ON ap.user_id = p.created_by;

CREATE OR REPLACE FUNCTION public.search_properties_hybrid (
  query_embedding vector(768) DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_place text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_bedrooms int DEFAULT NULL,
  p_max_bedrooms int DEFAULT NULL,
  p_min_similarity float DEFAULT NULL,
  p_sort text DEFAULT NULL,
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
  similarity float,
  score float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      CASE
        WHEN p_query IS NULL OR numnode(plainto_tsquery('spanish', immutable_unaccent(p_query))) = 0 THEN NULL
        ELSE replace(plainto_tsquery('spanish', immutable_unaccent(p_query))::text, ' & ', ' | ')::tsquery
      END AS terms,
      CASE
        WHEN p_place IS NULL OR numnode(plainto_tsquery('spanish', immutable_unaccent(p_place))) = 0 THEN NULL
        ELSE plainto_tsquery('spanish', immutable_unaccent(p_place))
      END AS place
  ),
  filtered AS (
    SELECT l.*
    FROM property_listings l, q
    WHERE (p_city IS NULL OR l.city ILIKE '%' || p_city || '%')
      AND (p_property_type IS NULL OR l.property_type = p_property_type)
      AND (p_min_price IS NULL OR l.price >= p_min_price)
      AND (p_max_price IS NULL OR l.price <= p_max_price)
      AND (p_min_bedrooms IS NULL OR l.bedrooms >= p_min_bedrooms)
      AND (p_max_bedrooms IS NULL OR l.bedrooms <= p_max_bedrooms)
      AND (p_place IS NULL OR (q.place IS NOT NULL AND l.search_tsv @@ q.place))
  ),
  semantic AS (
    SELECT
      f.id,
      (1 - (f.embedding <=> query_embedding))::float AS similarity,
      row_number() OVER (ORDER BY f.embedding <=> query_embedding) AS rank
    FROM filtered f
    WHERE query_embedding IS NOT NULL AND f.embedding IS NOT NULL
  ),
  lexical AS (
    SELECT f.id, row_number() OVER (ORDER BY ts_rank_cd(f.search_tsv, q.terms) DESC) AS rank
    FROM filtered f, q
    WHERE q.terms IS NOT NULL AND f.search_tsv @@ q.terms
  ),
  scored AS (
    SELECT
      f.*,
      s.similarity,
      (coalesce(1.0 / (60 + s.rank), 0) + coalesce(1.0 / (60 + x.rank), 0))::float AS score,
      x.id IS NOT NULL AS lexical_hit
    FROM filtered f
    LEFT JOIN semantic s ON s.id = f.id
    LEFT JOIN lexical x ON x.id = f.id
  )
  SELECT
    sc.id, sc.title, sc.property_type, sc.operation_type, sc.price, sc.currency, sc.bedrooms,
    sc.bathrooms, sc.square_meters, sc.city, sc.address, sc.latitude, sc.longitude, sc.description,
    sc.status, sc.image_url, sc.images, sc.amenities, sc.agency_id, sc.agency_name, sc.agent_name,
    sc.similarity, sc.score
  FROM scored sc
  WHERE query_embedding IS NULL
    OR p_min_similarity IS NULL
    OR sc.lexical_hit
    OR sc.similarity >= p_min_similarity
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN sc.price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN sc.price END DESC NULLS LAST,
    sc.score DESC
  LIMIT match_count;
$$;
