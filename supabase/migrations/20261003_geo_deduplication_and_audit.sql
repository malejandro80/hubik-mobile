ALTER TABLE public.properties
  ALTER COLUMN catastro DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.property_duplicate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  suspected_duplicate_of uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  agency_id uuid,
  distance_meters numeric NOT NULL,
  match_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'flagged' CHECK (status IN ('flagged', 'confirmed_duplicate', 'cleared')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_duplicate_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_duplicate_logs'
      AND policyname = 'Owners can view duplicate logs for their agency'
  ) THEN
    CREATE POLICY "Owners can view duplicate logs for their agency"
      ON public.property_duplicate_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'owner'
            AND profiles.agency_id = property_duplicate_logs.agency_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_duplicate_logs'
      AND policyname = 'Service role has full access to duplicate logs'
  ) THEN
    CREATE POLICY "Service role has full access to duplicate logs"
      ON public.property_duplicate_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_property_duplicate_logs_agent ON public.property_duplicate_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_duplicate_logs_agency ON public.property_duplicate_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_duplicate_logs_created_at ON public.property_duplicate_logs(created_at);

CREATE OR REPLACE FUNCTION public.check_property_duplicate(
  p_latitude double precision,
  p_longitude double precision,
  p_property_type text,
  p_bedrooms integer,
  p_bathrooms double precision,
  p_square_meters numeric,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  duplicate_id uuid,
  distance_meters numeric,
  title text,
  agency_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS duplicate_id,
    ROUND((6371000 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(p.latitude))
      ))
    ))::numeric, 1) AS distance_meters,
    p.title,
    p.agency_id
  FROM public.properties p
  WHERE (p_exclude_id IS NULL OR p.id <> p_exclude_id)
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.property_type = p_property_type
    AND p.bedrooms = p_bedrooms
    AND abs(p.bathrooms - p_bathrooms) <= 1
    AND abs(p.square_meters - p_square_meters) <= (p_square_meters * 0.10)
    AND (
      6371000 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_latitude)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(p_longitude)) +
          sin(radians(p_latitude)) * sin(radians(p.latitude))
        ))
      )
    ) <= 40
  ORDER BY distance_meters ASC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_property_duplicate TO authenticated, service_role;
