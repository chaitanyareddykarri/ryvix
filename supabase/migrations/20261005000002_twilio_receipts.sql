ALTER TABLE public.incident_notification_outbox DROP CONSTRAINT incident_notification_outbox_status_check;
ALTER TABLE public.incident_notification_outbox ADD CONSTRAINT incident_notification_outbox_status_check
 CHECK(status IN ('pending','sending','accepted','unknown','cancelled','queued','sent','delivered','failed','undelivered'));
CREATE TABLE public.incident_notification_receipts (
 notification_id uuid NOT NULL REFERENCES public.incident_notification_outbox(id) ON DELETE CASCADE,
 provider_message_id text NOT NULL CHECK(length(provider_message_id)<=200),
 status text NOT NULL CHECK(status IN ('queued','sent','delivered','failed','undelivered')),
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(notification_id,provider_message_id,status)
);
ALTER TABLE public.incident_notification_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incident_notification_receipts FROM PUBLIC,anon,authenticated;
