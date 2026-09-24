CREATE TABLE public.property_landlords (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX property_landlords_landlord_id_idx ON public.property_landlords (landlord_id);

ALTER TABLE public.property_landlords ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.property_landlords FROM anon, authenticated;
GRANT SELECT ON public.property_landlords TO authenticated;

CREATE POLICY "Listing agent and agency owner read the landlord" ON public.property_landlords
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = property_landlords.property_id
      AND (
        p.created_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles o
          WHERE o.user_id = (SELECT auth.uid()) AND o.role = 'owner' AND o.agency_id = p.agency_id
        )
      )
  ));

CREATE FUNCTION public.search_landlord_candidates(p_query text)
RETURNS TABLE (user_id uuid, display_name text, masked_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_pattern text;
  v_recent int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  PERFORM 1 FROM public.profiles pr WHERE pr.user_id = v_user AND pr.role = 'agent';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agents can search landlords' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_query) > 100 THEN
    RAISE EXCEPTION 'Query too long' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_query) < 3 THEN
    RETURN;
  END IF;

  DELETE FROM public.client_search_log l
  WHERE l.owner_id = v_user AND l.searched_at < now() - interval '10 minutes';

  SELECT count(*) INTO v_recent
  FROM public.client_search_log l
  WHERE l.owner_id = v_user AND l.searched_at > now() - interval '1 minute';

  IF v_recent >= 20 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.client_search_log (owner_id) VALUES (v_user);

  v_pattern := replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT
    pr.user_id,
    pr.display_name,
    left(u.email, 1) || '***' || substr(u.email, position('@' IN u.email))
  FROM public.profiles pr
  JOIN auth.users u ON u.id = pr.user_id
  WHERE pr.role = 'client'
    AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND (
      lower(coalesce(pr.display_name, '')) LIKE v_pattern ESCAPE '\'
      OR lower(coalesce(pr.display_name, '')) LIKE '% ' || v_pattern ESCAPE '\'
      OR lower(u.email) LIKE v_pattern ESCAPE '\'
    )
  ORDER BY pr.display_name NULLS LAST, u.email
  LIMIT 5;
END;
$$;

CREATE FUNCTION public.get_property_landlord(p_property_id uuid)
RETURNS TABLE (display_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pr.display_name, u.email::text
  FROM public.property_landlords pl
  JOIN public.properties p ON p.id = pl.property_id
  JOIN public.profiles pr ON pr.user_id = pl.landlord_id
  JOIN auth.users u ON u.id = pl.landlord_id
  WHERE pl.property_id = p_property_id
    AND auth.uid() IS NOT NULL
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles o
        WHERE o.user_id = auth.uid() AND o.role = 'owner' AND o.agency_id = p.agency_id
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.search_landlord_candidates(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_landlord_candidates(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_property_landlord(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_landlord(uuid) TO authenticated;
