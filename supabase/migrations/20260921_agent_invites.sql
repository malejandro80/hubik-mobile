CREATE TABLE IF NOT EXISTS public.agent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies (id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_invites_one_per_email
  ON public.agent_invites (email);

ALTER TABLE public.agent_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.agent_invites FROM anon, authenticated;
GRANT SELECT ON public.agent_invites TO authenticated;

DROP POLICY IF EXISTS "Owners read their agency invites" ON public.agent_invites;
CREATE POLICY "Owners read their agency invites"
  ON public.agent_invites FOR SELECT TO authenticated
  USING (
    agency_id IN (
      SELECT pr.agency_id FROM public.profiles pr
      WHERE pr.user_id = (SELECT auth.uid()) AND pr.role = 'owner'
    )
  );

CREATE OR REPLACE FUNCTION public.apply_pending_invite (p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_agency uuid;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  SELECT agency_id INTO v_agency FROM public.agent_invites WHERE email = v_email FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET role = 'agent', agency_id = v_agency
  WHERE user_id = p_user_id AND role = 'client';

  IF FOUND THEN
    DELETE FROM public.agent_invites WHERE email = v_email;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_pending_invite (uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')), '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF NEW.raw_app_meta_data ->> 'provider' IN ('google', 'apple') THEN
    PERFORM public.apply_pending_invite(NEW.id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user () FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_user_confirmed ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.apply_pending_invite(NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_user_confirmed () FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_user_confirmed ();

CREATE OR REPLACE FUNCTION public.add_agent (p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text := lower(btrim(p_email));
  v_agency uuid;
  v_target uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT agency_id INTO v_agency FROM public.profiles WHERE user_id = v_user AND role = 'owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency owners can add agents' USING ERRCODE = '42501';
  END IF;

  IF v_email IS NULL
     OR char_length(v_email) NOT BETWEEN 3 AND 254
     OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email address' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_target
  FROM auth.users
  WHERE lower(email) = v_email AND email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
    SET role = 'agent', agency_id = v_agency
    WHERE user_id = v_target AND role = 'client';
    IF FOUND THEN
      RETURN 'agent_added';
    END IF;

    PERFORM 1 FROM public.profiles
    WHERE user_id = v_target AND role = 'agent' AND agency_id = v_agency;
    IF FOUND THEN
      RETURN 'already_listed';
    END IF;
    RETURN 'unavailable';
  END IF;

  INSERT INTO public.agent_invites (agency_id, email, invited_by)
  VALUES (v_agency, v_email, v_user)
  ON CONFLICT (email) DO NOTHING;
  IF FOUND THEN
    RETURN 'invited';
  END IF;

  PERFORM 1 FROM public.agent_invites WHERE email = v_email AND agency_id = v_agency;
  IF FOUND THEN
    RETURN 'already_listed';
  END IF;
  RETURN 'unavailable';
END;
$$;

REVOKE ALL ON FUNCTION public.add_agent (text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_agent (text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_agent_invite (p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_agency uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT agency_id INTO v_agency FROM public.profiles WHERE user_id = v_user AND role = 'owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency owners can cancel invites' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.agent_invites WHERE id = p_invite_id AND agency_id = v_agency;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_agent_invite (uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_agent_invite (uuid) TO authenticated;
