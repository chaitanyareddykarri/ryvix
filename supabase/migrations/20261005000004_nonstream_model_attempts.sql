-- ADR 037. Backend-only authorization remains mandatory for every new source.
ALTER TABLE public.model_usage_attempts DROP CONSTRAINT model_usage_attempts_channel_check;
ALTER TABLE public.model_usage_attempts ADD CONSTRAINT model_usage_attempts_channel_check
 CHECK (channel IN ('web','whatsapp','gmail','coding','embedding_query','embedding_index'));
