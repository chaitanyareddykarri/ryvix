CREATE TABLE public.release_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(id),
  repository_id uuid NOT NULL REFERENCES public.repositories(id),
  target_id uuid NOT NULL REFERENCES public.deployment_targets(id),
  target_version timestamptz NOT NULL,
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  head_sha text NOT NULL CHECK(head_sha ~ '^[a-f0-9]{40,64}$'),
  merge_sha text CHECK(merge_sha ~ '^[a-f0-9]{40,64}$'),
  status text NOT NULL CHECK(status IN ('approved','dispatching','merged','unknown','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  merged_at timestamptz
);
ALTER TABLE public.release_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.release_requests FROM PUBLIC,anon,authenticated;

CREATE TABLE public.email_notification_preferences (
  environment_id uuid NOT NULL REFERENCES public.environments(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  security_enabled boolean NOT NULL DEFAULT false,
  deployment_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(environment_id,user_id)
);
ALTER TABLE public.email_notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_notification_preferences FROM PUBLIC,anon,authenticated;

CREATE TABLE public.email_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL REFERENCES public.environments(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL CHECK(kind IN ('security_event','security_incident','deployment')),
  source_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','unknown','cancelled')),
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,environment_id,kind,source_id)
);
CREATE INDEX email_notification_pending ON public.email_notification_outbox(status,created_at);
ALTER TABLE public.email_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_notification_outbox FROM PUBLIC,anon,authenticated;

ALTER TABLE public.security_events ADD COLUMN device_event_id uuid;
CREATE UNIQUE INDEX security_events_device_dedup ON public.security_events(server_id,device_event_id) WHERE device_event_id IS NOT NULL;
