CREATE TABLE IF NOT EXISTS public.listing_share_links (
  property_id uuid PRIMARY KEY REFERENCES public.properties (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (token ~ '^[0-9a-f]{32}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_share_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.listing_share_links FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_listing_share_link (p_property_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.properties p
    JOIN public.profiles pr ON pr.user_id = auth.uid()
    WHERE p.id = p_property_id
      AND pr.role IN ('agent', 'owner')
      AND pr.agency_id IS NOT NULL
      AND p.agency_id = pr.agency_id
      AND p.created_by IS DISTINCT FROM auth.uid()
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.listing_share_links (property_id, token)
  VALUES (p_property_id, replace(gen_random_uuid()::text, '-', ''))
  ON CONFLICT (property_id) DO NOTHING;

  SELECT l.token INTO v_token FROM public.listing_share_links l WHERE l.property_id = p_property_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_listing_share_link (uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_listing_share_link (uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_listing (p_token text)
RETURNS TABLE (
  title varchar,
  property_type varchar,
  operation_type varchar,
  price numeric,
  currency varchar,
  bedrooms int,
  bathrooms numeric,
  square_meters int,
  city varchar,
  sector text,
  latitude double precision,
  longitude double precision,
  description text,
  status varchar,
  image_url text,
  images text[],
  amenities text[],
  agency_name text,
  agency_whatsapp text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    l.title, l.property_type, l.operation_type, l.price, l.currency, l.bedrooms, l.bathrooms,
    l.square_meters, l.city, l.sector, l.latitude, l.longitude, l.description, l.status,
    l.image_url, l.images, l.amenities, l.agency_name, l.agency_whatsapp
  FROM public.listing_share_links s
  JOIN public.property_listings l ON l.id = s.property_id
  WHERE s.token = p_token;
$$;

REVOKE ALL ON FUNCTION public.get_shared_listing (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_listing (text) TO anon, authenticated;
