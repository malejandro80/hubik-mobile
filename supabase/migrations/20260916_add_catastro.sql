-- ==============================================================================
-- Migration: Add catastro (unique cadastral reference) to properties
-- ==============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS catastro VARCHAR(20);

-- Postgres UNIQUE constraints allow multiple NULLs, so existing/legacy rows
-- without a catastro are unaffected.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'properties_catastro_key'
    ) THEN
        ALTER TABLE public.properties
          ADD CONSTRAINT properties_catastro_key UNIQUE (catastro);
    END IF;
END $$;
