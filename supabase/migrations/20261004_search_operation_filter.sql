CREATE OR REPLACE FUNCTION public.search_listings(
  p_operation_type text,
  query_embedding vector DEFAULT NULL::vector,
  p_query text DEFAULT NULL::text,
  p_place text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_property_type text DEFAULT NULL::text,
  p_min_price numeric DEFAULT NULL::numeric,
  p_max_price numeric DEFAULT NULL::numeric,
  p_min_bedrooms integer DEFAULT NULL::integer,
  p_max_bedrooms integer DEFAULT NULL::integer,
  p_min_square_meters integer DEFAULT NULL::integer,
  p_max_square_meters integer DEFAULT NULL::integer,
  p_min_similarity double precision DEFAULT NULL::double precision,
  p_similarity_window double precision DEFAULT NULL::double precision,
  p_sort text DEFAULT NULL::text,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, title character varying, property_type character varying, operation_type character varying,
  price numeric, currency character varying, bedrooms integer, bathrooms numeric, square_meters integer,
  city character varying, address text, latitude double precision, longitude double precision,
  description text, status character varying, image_url text, images text[], amenities text[],
  agency_id uuid, agency_name text, agent_name text, created_by uuid, contact_whatsapp text, sector text,
  similarity double precision, score double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
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
  viewer AS (
    SELECT pr.agency_id
    FROM profiles pr
    WHERE pr.user_id = auth.uid()
      AND pr.role IN ('agent', 'owner')
      AND pr.agency_id IS NOT NULL
  ),
  filtered AS (
    SELECT l.*
    FROM property_listings l, q
    WHERE (p_city IS NULL OR l.city ILIKE '%' || p_city || '%')
      AND (p_property_type IS NULL OR l.property_type = p_property_type)
      AND (p_operation_type IS NULL OR l.operation_type = p_operation_type)
      AND (p_min_price IS NULL OR l.price >= p_min_price)
      AND (p_max_price IS NULL OR l.price <= p_max_price)
      AND (p_min_bedrooms IS NULL OR l.bedrooms >= p_min_bedrooms)
      AND (p_max_bedrooms IS NULL OR l.bedrooms <= p_max_bedrooms)
      AND (p_min_square_meters IS NULL OR l.square_meters >= p_min_square_meters)
      AND (p_max_square_meters IS NULL OR l.square_meters <= p_max_square_meters)
      AND (p_place IS NULL OR (q.place IS NOT NULL AND l.search_tsv @@ q.place))
      AND (NOT EXISTS (SELECT 1 FROM viewer) OR l.agency_id IN (SELECT v.agency_id FROM viewer v))
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
      x.id IS NOT NULL AS lexical_hit,
      bool_or(x.id IS NOT NULL) OVER () AS any_lexical_hit,
      max(s.similarity) OVER () AS best_similarity
    FROM filtered f
    LEFT JOIN semantic s ON s.id = f.id
    LEFT JOIN lexical x ON x.id = f.id
  )
  SELECT
    sc.id, sc.title, sc.property_type, sc.operation_type, sc.price, sc.currency, sc.bedrooms,
    sc.bathrooms, sc.square_meters, sc.city, sc.address, sc.latitude, sc.longitude, sc.description,
    sc.status, sc.image_url, sc.images, sc.amenities, sc.agency_id, sc.agency_name, sc.agent_name,
    sc.created_by, coalesce(sc.agent_whatsapp, sc.agency_whatsapp) AS contact_whatsapp, sc.sector, sc.similarity, sc.score
  FROM scored sc
  WHERE CASE
    WHEN p_sort IS NOT NULL AND sc.any_lexical_hit THEN sc.lexical_hit
    ELSE query_embedding IS NULL
      OR p_min_similarity IS NULL
      OR sc.lexical_hit
      OR (
        sc.similarity >= p_min_similarity
        AND (p_similarity_window IS NULL OR sc.similarity >= sc.best_similarity - p_similarity_window)
      )
  END
  ORDER BY
    CASE WHEN auth.uid() IS NOT NULL AND sc.created_by = auth.uid() THEN 0 ELSE 1 END,
    CASE WHEN p_sort = 'price_asc' THEN sc.price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN sc.price END DESC NULLS LAST,
    sc.score DESC
  LIMIT match_count;
$function$;

CREATE OR REPLACE FUNCTION public.search_properties_nearby(
  p_place text,
  p_radius_km double precision,
  p_operation_type text,
  p_property_type text DEFAULT NULL::text,
  p_min_price numeric DEFAULT NULL::numeric,
  p_max_price numeric DEFAULT NULL::numeric,
  p_min_bedrooms integer DEFAULT NULL::integer,
  p_max_bedrooms integer DEFAULT NULL::integer,
  p_min_square_meters integer DEFAULT NULL::integer,
  p_max_square_meters integer DEFAULT NULL::integer,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, title character varying, property_type character varying, operation_type character varying,
  price numeric, currency character varying, bedrooms integer, bathrooms numeric, square_meters integer,
  city character varying, address text, latitude double precision, longitude double precision,
  description text, status character varying, image_url text, images text[], amenities text[],
  agency_id uuid, agency_name text, agent_name text, created_by uuid, contact_whatsapp text, sector text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH place AS (
    SELECT CASE
      WHEN p_place IS NULL OR numnode(plainto_tsquery('spanish', immutable_unaccent(p_place))) = 0 THEN NULL
      ELSE plainto_tsquery('spanish', immutable_unaccent(p_place))
    END AS q
  ),
  anchor AS (
    SELECT avg(l.latitude) AS lat, avg(l.longitude) AS lng
    FROM property_listings l, place
    WHERE place.q IS NOT NULL AND l.search_tsv @@ place.q AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
  ),
  viewer AS (
    SELECT pr.agency_id
    FROM profiles pr
    WHERE pr.user_id = auth.uid()
      AND pr.role IN ('agent', 'owner')
      AND pr.agency_id IS NOT NULL
  ),
  candidates AS (
    SELECT
      l.*,
      6371 * 2 * asin(least(1, sqrt(
        power(sin(radians(l.latitude - a.lat) / 2), 2)
        + cos(radians(a.lat)) * cos(radians(l.latitude)) * power(sin(radians(l.longitude - a.lng) / 2), 2)
      ))) AS distance
    FROM property_listings l, anchor a
    WHERE a.lat IS NOT NULL
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      AND (p_property_type IS NULL OR l.property_type = p_property_type)
      AND (p_operation_type IS NULL OR l.operation_type = p_operation_type)
      AND (p_min_price IS NULL OR l.price >= p_min_price)
      AND (p_max_price IS NULL OR l.price <= p_max_price)
      AND (p_min_bedrooms IS NULL OR l.bedrooms >= p_min_bedrooms)
      AND (p_max_bedrooms IS NULL OR l.bedrooms <= p_max_bedrooms)
      AND (p_min_square_meters IS NULL OR l.square_meters >= p_min_square_meters)
      AND (p_max_square_meters IS NULL OR l.square_meters <= p_max_square_meters)
      AND (NOT EXISTS (SELECT 1 FROM viewer) OR l.agency_id IN (SELECT v.agency_id FROM viewer v))
  )
  SELECT
    c.id, c.title, c.property_type, c.operation_type, c.price, c.currency, c.bedrooms,
    c.bathrooms, c.square_meters, c.city, c.address, c.latitude, c.longitude, c.description,
    c.status, c.image_url, c.images, c.amenities, c.agency_id, c.agency_name, c.agent_name,
    c.created_by, coalesce(c.agent_whatsapp, c.agency_whatsapp) AS contact_whatsapp, c.sector,
    (round(c.distance * 2) / 2)::float AS distance_km
  FROM candidates c
  WHERE c.distance <= p_radius_km
  ORDER BY
    CASE WHEN auth.uid() IS NOT NULL AND c.created_by = auth.uid() THEN 0 ELSE 1 END,
    c.distance
  LIMIT match_count;
$function$;

GRANT EXECUTE ON FUNCTION public.search_listings(text, vector, text, text, text, text, numeric, numeric, integer, integer, integer, integer, double precision, double precision, text, integer) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.search_properties_nearby(text, double precision, text, text, numeric, numeric, integer, integer, integer, integer, integer) TO anon, authenticated, service_role;
