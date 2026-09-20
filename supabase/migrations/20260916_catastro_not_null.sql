-- ==============================================================================
-- Migration: Enforce catastro NOT NULL on properties
-- ==============================================================================

-- Legacy/seeded rows predate the catastro field and have none. Backfill them with a
-- synthetic, unique placeholder derived from their id so the NOT NULL constraint below
-- can be applied without breaking existing data. Real chat-guided registrations always
-- supply a real cadastral reference (enforced client + Edge Function side); only rows
-- that already existed before this migration ever get a LEGACY- placeholder.
UPDATE public.properties
SET catastro = 'LEGACY-' || upper(substr(replace(id::text, '-', ''), 1, 13))
WHERE catastro IS NULL;

ALTER TABLE public.properties
  ALTER COLUMN catastro SET NOT NULL;
