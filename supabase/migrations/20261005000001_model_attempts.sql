CREATE TABLE public.model_usage_attempts (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('web','whatsapp','gmail')),
 source_id uuid NOT NULL,
 provider text NOT NULL CHECK(length(provider) BETWEEN 1 AND 100),
 model text NOT NULL CHECK(length(model) BETWEEN 1 AND 200),
 status text NOT NULL CHECK(status IN ('started','completed','failed','cancelled')),
 latency_ms integer NOT NULL DEFAULT 0 CHECK(latency_ms BETWEEN 0 AND 300000),
 usage jsonb CHECK(usage IS NULL OR (jsonb_typeof(usage)='object' AND octet_length(usage::text)<=4096)),
 created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz
);
CREATE INDEX model_usage_owner ON public.model_usage_attempts(organization_id,user_id,created_at DESC);
ALTER TABLE public.model_usage_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.model_usage_attempts FROM PUBLIC,anon,authenticated;
