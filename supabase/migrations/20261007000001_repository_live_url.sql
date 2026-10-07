ALTER TABLE public.repositories ADD COLUMN IF NOT EXISTS live_url text;
ALTER TABLE public.repositories ADD CONSTRAINT repositories_live_url_format
  CHECK (live_url IS NULL OR (length(live_url) <= 2048 AND live_url ~ '^https?://'));
COMMENT ON COLUMN public.repositories.live_url IS
  'Operator configured display URL; not verified runtime health evidence.';
