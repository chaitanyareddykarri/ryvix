CREATE TABLE public.deployment_targets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 repository_id uuid NOT NULL REFERENCES public.repositories(id),
 environment_id uuid NOT NULL REFERENCES public.environments(id),
 provider_environment text NOT NULL CHECK(length(provider_environment) BETWEEN 1 AND 255),
 endpoint_url text NOT NULL CHECK(length(endpoint_url)<=2048),
 last_probe_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(repository_id,provider_environment)
);
CREATE TABLE public.deployment_runtime_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 target_id uuid NOT NULL REFERENCES public.deployment_targets(id),
 deployment_event_id uuid NOT NULL REFERENCES public.deployment_events(id),
 endpoint_url text NOT NULL,
 observed_at timestamptz NOT NULL,
 reachable boolean NOT NULL,
 status_code integer CHECK(status_code BETWEEN 100 AND 599),
 latency_ms integer NOT NULL CHECK(latency_ms>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deployment_runtime_recent ON public.deployment_runtime_observations(target_id,observed_at DESC);
ALTER TABLE public.deployment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_runtime_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deployment_targets,public.deployment_runtime_observations FROM PUBLIC,anon,authenticated;
REVOKE UPDATE,DELETE,TRUNCATE ON public.deployment_runtime_observations FROM service_role;
