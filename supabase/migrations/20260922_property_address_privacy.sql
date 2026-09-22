CREATE OR REPLACE FUNCTION public.jitter_coordinate(p_id uuid, p_seed text, p_base double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_base IS NULL THEN NULL ELSE
    p_base + ((abs(('x' || substr(md5(p_id::text || p_seed), 1, 8))::bit(32)::int) % 601) - 300) / 100000.0
  END;
$$;

CREATE OR REPLACE FUNCTION public.viewer_has_agency_access(p_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.user_id = auth.uid()
      AND pr.role IN ('agent', 'owner')
      AND pr.agency_id = p_agency_id
  );
$$;

REVOKE ALL ON FUNCTION public.viewer_has_agency_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.viewer_has_agency_access(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.masked_property_address(p_id uuid, p_agency_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.viewer_has_agency_access(p_agency_id)
    THEN (SELECT address FROM public.properties WHERE id = p_id)
    ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.masked_property_latitude(p_id uuid, p_agency_id uuid)
RETURNS double precision
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.viewer_has_agency_access(p_agency_id)
    THEN (SELECT latitude FROM public.properties WHERE id = p_id)
    ELSE public.jitter_coordinate(p_id, 'lat', (SELECT latitude FROM public.properties WHERE id = p_id))
  END;
$$;

CREATE OR REPLACE FUNCTION public.masked_property_longitude(p_id uuid, p_agency_id uuid)
RETURNS double precision
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.viewer_has_agency_access(p_agency_id)
    THEN (SELECT longitude FROM public.properties WHERE id = p_id)
    ELSE public.jitter_coordinate(p_id, 'lng', (SELECT longitude FROM public.properties WHERE id = p_id))
  END;
$$;

REVOKE ALL ON FUNCTION public.masked_property_address(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.masked_property_latitude(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.masked_property_longitude(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.masked_property_address(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.masked_property_latitude(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.masked_property_longitude(uuid, uuid) TO anon, authenticated;

REVOKE SELECT ON public.properties FROM anon, authenticated;
GRANT SELECT (
  id, catastro, title, property_type, operation_type, price, bedrooms, bathrooms, square_meters,
  city, description, status, image_url, images, amenities, embedding, created_at, agency_id, created_by
) ON public.properties TO anon, authenticated;

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
  ap.display_name AS agent_name
FROM public.properties p
JOIN public.agencies a ON a.id = p.agency_id
LEFT JOIN public.agents_public ap ON ap.user_id = p.created_by;

GRANT SELECT ON public.property_listings TO anon, authenticated;
