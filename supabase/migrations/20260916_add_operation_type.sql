-- ==============================================================================
-- Migration: Add operation_type (sale/rent) to properties
-- ==============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS operation_type VARCHAR(10) NOT NULL DEFAULT 'sale';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'properties_operation_type_check'
    ) THEN
        ALTER TABLE public.properties
          ADD CONSTRAINT properties_operation_type_check
          CHECK (operation_type IN ('sale', 'rent'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS properties_operation_type_idx ON public.properties (operation_type);
