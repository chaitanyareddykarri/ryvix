CREATE TABLE public.incident_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,target_hash text NOT NULL CHECK(length(target_hash)=64),
  provider text NOT NULL CHECK(provider IN ('slack','pagerduty','twilio')),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','unknown','cancelled')),
  provider_message_id text CHECK(length(provider_message_id)<=200),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),claimed_at timestamptz,
  UNIQUE(incident_id,target_id)
);
CREATE INDEX incident_notification_pending ON public.incident_notification_outbox(created_at) WHERE status='pending';
CREATE INDEX incident_notification_rate ON public.incident_notification_outbox(target_id,claimed_at);
ALTER TABLE public.incident_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incident_notification_outbox FROM PUBLIC,anon,authenticated;
