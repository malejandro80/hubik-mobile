-- ==============================================================================
-- Migration: Sign-in roles and agencies (RFC 011) - multi-tenant foundation
-- ==============================================================================
-- Adds agencies (the tenant) and profiles (one role and at most one agency per user),
-- stamps every property with its agency and publishing agent, exposes listing/agent
-- names through two views, restricts photo uploads to agents, and extends
-- match_properties_hybrid with agency and agent names.
--
-- Roles and agency membership are never client-writable: profiles are created by a
-- trigger, an owner is created by create_agency(), and agents are assigned manually
-- with the SQL in RFC 011 section 4.6. Publishing goes through Edge Functions that
-- check the caller's role (supabase/functions/_shared/auth.ts).
--
-- Both views are security_invoker, so they respect RLS. Agent rows of profiles are
-- publicly readable (no personal data: display name, role and agency only) so listings
-- can show agent names; every other profile row is visible only to its own user.

CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'agent', 'owner')),
  agency_id uuid REFERENCES public.agencies (id),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'client') = (agency_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_owner_per_agency
  ON public.profiles (agency_id) WHERE role = 'owner';

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.agencies FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "Allow public read access on agencies" ON public.agencies;
CREATE POLICY "Allow public read access on agencies"
  ON public.agencies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Agent profiles are publicly readable" ON public.profiles;
CREATE POLICY "Agent profiles are publicly readable"
  ON public.profiles FOR SELECT TO anon, authenticated USING (role = 'agent');

GRANT SELECT ON public.agencies TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT (user_id, role, agency_id, display_name) ON public.profiles TO anon;

-- New sign-ins become clients.
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
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user () FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user ();

INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, NULLIF(btrim(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- A signed-in client creates an agency and becomes its owner, atomically.
CREATE OR REPLACE FUNCTION public.create_agency (p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := btrim(p_name);
  v_agency uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF v_name IS NULL OR char_length(v_name) < 2 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Agency name must be between 2 and 100 characters' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.profiles WHERE user_id = v_user AND role = 'client' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only clients can create an agency' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.agencies (name) VALUES (v_name) RETURNING id INTO v_agency;
  UPDATE public.profiles SET role = 'owner', agency_id = v_agency WHERE user_id = v_user;
  RETURN v_agency;
END;
$$;

REVOKE ALL ON FUNCTION public.create_agency (text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agency (text) TO authenticated;

-- Default agency for properties created before this migration.
INSERT INTO public.agencies (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'HUBIK')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies (id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.properties
SET agency_id = '00000000-0000-0000-0000-000000000001'
WHERE agency_id IS NULL;

ALTER TABLE public.properties ALTER COLUMN agency_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties (agency_id);

CREATE OR REPLACE VIEW public.agents_public WITH (security_invoker = true) AS
SELECT user_id, display_name, agency_id
FROM public.profiles
WHERE role = 'agent';

GRANT SELECT ON public.agents_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.property_listings WITH (security_invoker = true) AS
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
  p.address,
  p.latitude,
  p.longitude,
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
  ap.display_name AS agent_name
FROM public.properties p
JOIN public.agencies a ON a.id = p.agency_id
LEFT JOIN public.agents_public ap ON ap.user_id = p.created_by;

GRANT SELECT ON public.property_listings TO anon, authenticated;

DROP FUNCTION IF EXISTS public.match_properties_hybrid (
  vector, text, text, numeric, numeric, int, int, text[], int
);

CREATE FUNCTION public.match_properties_hybrid (
  query_embedding vector(768),
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_bedrooms int DEFAULT NULL,
  p_max_bedrooms int DEFAULT NULL,
  p_amenities text[] DEFAULT NULL,
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
  amenities text[],
  agency_id uuid,
  agency_name text,
  agent_name text,
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
    p.amenities,
    p.agency_id,
    p.agency_name,
    p.agent_name,
    CASE WHEN p.embedding IS NULL THEN NULL ELSE (1 - (p.embedding <=> query_embedding))::float END AS similarity
  FROM public.property_listings p
  WHERE (p_city IS NULL OR p.city ILIKE '%' || p_city || '%')
    AND (p_property_type IS NULL OR p.property_type = p_property_type)
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    AND (p_min_bedrooms IS NULL OR p.bedrooms >= p_min_bedrooms)
    AND (p_max_bedrooms IS NULL OR p.bedrooms <= p_max_bedrooms)
    AND (p_amenities IS NULL OR p.amenities @> p_amenities)
  ORDER BY (p.embedding <=> query_embedding) ASC NULLS LAST
  LIMIT match_count;
END;
$$;

DROP POLICY IF EXISTS "Allow public upload to property-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow agents upload to property-images" ON storage.objects;
CREATE POLICY "Allow agents upload to property-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = (SELECT auth.uid()) AND pr.role = 'agent'
    )
  );
