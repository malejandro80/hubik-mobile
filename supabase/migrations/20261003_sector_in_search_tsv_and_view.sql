CREATE OR REPLACE FUNCTION public.listing_search_tsv(p_title text, p_sector text, p_amenities text[], p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT
    setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(p_title, ''))), 'A')
    || setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(p_sector, ''))), 'A')
    || setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(array_to_string(p_amenities, ' '), ''))), 'B')
    || setweight(to_tsvector('pg_catalog.spanish'::regconfig, public.immutable_unaccent(coalesce(p_description, ''))), 'C')
$$;

ALTER TABLE public.properties
  ALTER COLUMN search_tsv SET EXPRESSION AS (public.listing_search_tsv(title::text, sector, amenities, description));

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
  p.search_tsv,
  ap.whatsapp AS agent_whatsapp,
  a.whatsapp AS agency_whatsapp,
  p.sector
FROM properties p
JOIN agencies a ON a.id = p.agency_id
LEFT JOIN agents_public ap ON ap.user_id = p.created_by;
