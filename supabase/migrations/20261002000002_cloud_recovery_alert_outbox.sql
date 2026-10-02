CREATE TABLE public.cloud_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approval_id uuid NOT NULL UNIQUE REFERENCES public.approval_requests(id),
  provider text NOT NULL CHECK(provider IN ('aws','digitalocean','hetzner','gcp')),
  instance_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','dispatching','accepted','observed_healthy','unknown','expired')),
  provider_action_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  observed_at timestamptz,
  observation jsonb
);
CREATE INDEX cloud_recovery_pending ON public.cloud_recovery_requests(status,created_at);
CREATE UNIQUE INDEX cloud_recovery_one_active ON public.cloud_recovery_requests(server_id)
  WHERE status IN ('pending','approved','dispatching','accepted');
ALTER TABLE public.cloud_recovery_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cloud_recovery_requests FROM PUBLIC,anon,authenticated;

CREATE TABLE public.whatsapp_alert_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  incident_id uuid NOT NULL REFERENCES public.incidents(id),
  connector_id uuid NOT NULL REFERENCES public.connectors(id),
  recipient text NOT NULL CHECK(recipient ~ '^[0-9]{5,20}$'),
  template text NOT NULL,
  language text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','sent','delivered','read','failed','unknown','cancelled')),
  provider_message_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(incident_id,connector_id,recipient)
);
CREATE INDEX whatsapp_alert_pending ON public.whatsapp_alert_outbox(status,created_at);
ALTER TABLE public.whatsapp_alert_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_alert_outbox FROM PUBLIC,anon,authenticated;

-- Webhooks can arrive before the send response is persisted.
CREATE TABLE public.whatsapp_alert_receipts (
  connector_id uuid NOT NULL REFERENCES public.connectors(id),
  message_id text NOT NULL CHECK(length(message_id) BETWEEN 1 AND 512),
  recipient text NOT NULL CHECK(recipient ~ '^[0-9]{5,20}$'),
  status text NOT NULL CHECK(status IN ('sent','delivered','read','failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(connector_id,message_id,recipient,status)
);
ALTER TABLE public.whatsapp_alert_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_alert_receipts FROM PUBLIC,anon,authenticated;
