CREATE TABLE IF NOT EXISTS public.client_search_log (
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  searched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_search_log_owner_time
  ON public.client_search_log (owner_id, searched_at);

ALTER TABLE public.client_search_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.client_search_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_agent_candidates (p_query text)
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

  PERFORM 1 FROM public.profiles pr WHERE pr.user_id = v_user AND pr.role = 'owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency owners can search clients' USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.search_agent_candidates (text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_agent_candidates (text) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_agent_by_id (p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_agency uuid;
  v_email text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT pr.agency_id INTO v_agency FROM public.profiles pr WHERE pr.user_id = v_user AND pr.role = 'owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency owners can add agents' USING ERRCODE = '42501';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL;

  IF FOUND THEN
    UPDATE public.profiles pr
    SET role = 'agent', agency_id = v_agency
    WHERE pr.user_id = p_user_id AND pr.role = 'client';

    IF FOUND THEN
      DELETE FROM public.agent_invites i WHERE i.email = v_email AND i.agency_id = v_agency;
      RETURN 'agent_added';
    END IF;

    PERFORM 1 FROM public.profiles pr
    WHERE pr.user_id = p_user_id AND pr.role = 'agent' AND pr.agency_id = v_agency;
    IF FOUND THEN
      RETURN 'already_listed';
    END IF;
  END IF;

  RETURN 'unavailable';
END;
$$;

REVOKE ALL ON FUNCTION public.add_agent_by_id (uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_agent_by_id (uuid) TO authenticated;
