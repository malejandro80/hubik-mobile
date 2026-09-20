-- ==============================================================================
-- Migration: Hybrid relational + semantic search RPC (match_properties_hybrid)
-- ==============================================================================
-- Combines relational filters (city, property_type, price/bedroom ranges) with vector
-- similarity ranking in a single query, replacing chat-query's previous two-step "structured
-- filters, then pure-semantic fallback only on zero rows" - a query mixing a hard filter (a
-- city) with a concept ("luminoso", "cerca de un parque") now gets concept-aware ranking within
-- that filtered set instead of losing the concept entirely. Reuses the existing `embedding`
-- column and its HNSW index (RFC 004/007) - no schema change.
--
-- Rows with a NULL embedding (a property published while Gemini's embedding call was down -
-- property-publish fails open, per RFC 004's 2026-09-17 amendment) are still returned, just
-- sorted last by Postgres' default NULLS LAST ordering, so a temporary embedding outage never
-- makes a property invisible to search the way a hard `WHERE embedding IS NOT NULL` would.

CREATE OR REPLACE FUNCTION public.match_properties_hybrid (
  query_embedding vector(768),
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_bedrooms int DEFAULT NULL,
  p_max_bedrooms int DEFAULT NULL,
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
    CASE WHEN p.embedding IS NULL THEN NULL ELSE (1 - (p.embedding <=> query_embedding))::float END AS similarity
  FROM public.properties p
  WHERE (p_city IS NULL OR p.city ILIKE '%' || p_city || '%')
    AND (p_property_type IS NULL OR p.property_type = p_property_type)
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    AND (p_min_bedrooms IS NULL OR p.bedrooms >= p_min_bedrooms)
    AND (p_max_bedrooms IS NULL OR p.bedrooms <= p_max_bedrooms)
  ORDER BY (p.embedding <=> query_embedding) ASC NULLS LAST
  LIMIT match_count;
END;
$$;
