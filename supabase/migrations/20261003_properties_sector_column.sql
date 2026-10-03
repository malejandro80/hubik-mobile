ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sector text;

GRANT SELECT (sector) ON public.properties TO anon, authenticated;
