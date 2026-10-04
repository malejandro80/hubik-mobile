CREATE TABLE IF NOT EXISTS public.ai_security_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  surface text NOT NULL CHECK (char_length(surface) <= 40),
  category text NOT NULL CHECK (char_length(category) <= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_security_events_user_created_idx ON public.ai_security_events (user_id, created_at DESC);

ALTER TABLE public.ai_security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_security_events FROM anon, authenticated;
