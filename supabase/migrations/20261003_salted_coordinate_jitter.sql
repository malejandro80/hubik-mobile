SELECT vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'coordinate_jitter_salt',
  'Secret salt for the public coordinate jitter (RFC 033)'
)
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'coordinate_jitter_salt');

CREATE OR REPLACE FUNCTION public.jitter_coordinate(p_id uuid, p_seed text, p_base double precision)
RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_base IS NULL THEN NULL ELSE
    p_base + ((abs(('x' || substr(md5(
      p_id::text || p_seed || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'coordinate_jitter_salt')
    ), 1, 8))::bit(32)::int) % 601) - 300) / 100000.0
  END;
$$;

REVOKE ALL ON FUNCTION public.jitter_coordinate(uuid, text, double precision) FROM PUBLIC, anon, authenticated;
