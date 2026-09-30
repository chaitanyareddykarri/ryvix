BEGIN;
ALTER TABLE public.repositories ADD COLUMN github_verified_at timestamptz;
REVOKE INSERT,UPDATE,DELETE ON public.repositories FROM PUBLIC,anon,authenticated;
CREATE TABLE public.deployment_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  delivery_id uuid NOT NULL,
  github_status_id bigint NOT NULL CHECK(github_status_id>0),
  github_deployment_id bigint NOT NULL CHECK(github_deployment_id>0),
  commit_sha text NOT NULL CHECK(commit_sha ~ '^[a-f0-9]{40,64}$'),
  environment text NOT NULL CHECK(length(environment) BETWEEN 1 AND 255),
  state text NOT NULL CHECK(state IN ('error','failure','inactive','in_progress','queued','pending','success')),
  provider_created_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
  UNIQUE(repository_id,github_status_id),
  UNIQUE(repository_id,delivery_id)
);
CREATE INDEX deployment_events_recent ON public.deployment_events(repository_id,provider_created_at DESC,github_status_id DESC);
ALTER TABLE public.deployment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deployment_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.deployment_events TO service_role;
COMMIT;
