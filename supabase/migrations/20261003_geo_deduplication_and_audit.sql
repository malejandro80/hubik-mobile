ALTER TABLE public.properties
  ALTER COLUMN catastro DROP NOT NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS under_review boolean NOT NULL DEFAULT false;

GRANT SELECT (under_review) ON public.properties TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.property_duplicate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  suspected_duplicate_of uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid,
  agency_id uuid,
  distance_meters numeric NOT NULL,
  match_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'flagged' CHECK (status IN ('flagged', 'confirmed_duplicate', 'cleared')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_duplicate_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners read their duplicate logs"
  ON public.property_duplicate_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = (SELECT auth.uid())
        AND pr.role = 'owner'
        AND pr.agency_id = property_duplicate_logs.agency_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_property_duplicate_logs_agent ON public.property_duplicate_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_duplicate_logs_agency ON public.property_duplicate_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_duplicate_logs_property ON public.property_duplicate_logs(property_id);

CREATE OR REPLACE FUNCTION public.find_property_duplicate(
  p_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_property_type text,
  p_bedrooms integer,
  p_bathrooms numeric,
  p_square_meters integer
)
RETURNS TABLE (duplicate_id uuid, distance_meters numeric)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT c.id, round(c.distance::numeric, 1)
  FROM (
    SELECT
      p.id,
      6371000 * 2 * asin(least(1, sqrt(
        power(sin(radians(p.latitude - p_latitude) / 2), 2)
        + cos(radians(p_latitude)) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - p_longitude) / 2), 2)
      ))) AS distance
    FROM public.properties p
    WHERE p.id <> p_id
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND p.property_type = p_property_type
      AND p.bedrooms = p_bedrooms
      AND abs(p.bathrooms - p_bathrooms) <= 1
      AND abs(p.square_meters - p_square_meters) <= p_square_meters * 0.10
  ) c
  WHERE c.distance <= 40
  ORDER BY c.distance
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.flag_property_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.find_property_duplicate(
      NEW.id, NEW.latitude, NEW.longitude, NEW.property_type, NEW.bedrooms, NEW.bathrooms, NEW.square_meters
    )
  ) THEN
    NEW.under_review := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_property_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.property_duplicate_logs (
    property_id, suspected_duplicate_of, agent_id, agency_id, distance_meters, match_details
  )
  SELECT
    NEW.id,
    d.duplicate_id,
    NEW.created_by,
    NEW.agency_id,
    d.distance_meters,
    jsonb_build_object(
      'property_type', NEW.property_type,
      'bedrooms', NEW.bedrooms,
      'bathrooms', NEW.bathrooms,
      'square_meters', NEW.square_meters
    )
  FROM public.find_property_duplicate(
    NEW.id, NEW.latitude, NEW.longitude, NEW.property_type, NEW.bedrooms, NEW.bathrooms, NEW.square_meters
  ) d;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_property_duplicate(uuid, double precision, double precision, text, integer, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flag_property_duplicate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_property_duplicate() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER properties_flag_duplicate
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  WHEN (NEW.catastro IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL)
  EXECUTE FUNCTION public.flag_property_duplicate();

CREATE TRIGGER properties_log_duplicate
  AFTER INSERT ON public.properties
  FOR EACH ROW
  WHEN (NEW.under_review)
  EXECUTE FUNCTION public.log_property_duplicate();

ALTER POLICY "Allow public read access on properties"
  ON public.properties
  USING (NOT under_review OR public.viewer_has_agency_access(agency_id));

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
  public.masked_property_address(p.id, p.agency_id) AS address,
  public.masked_property_latitude(p.id, p.agency_id) AS latitude,
  public.masked_property_longitude(p.id, p.agency_id) AS longitude,
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
  p.sector,
  p.under_review
FROM public.properties p
JOIN public.agencies a ON a.id = p.agency_id
LEFT JOIN public.agents_public ap ON ap.user_id = p.created_by;
