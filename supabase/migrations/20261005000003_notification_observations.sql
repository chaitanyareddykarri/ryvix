ALTER TABLE public.incident_notification_outbox ADD COLUMN last_checked_at timestamptz;
ALTER TABLE public.incident_notification_outbox ADD COLUMN provider_observation jsonb
 CHECK(provider_observation IS NULL OR (jsonb_typeof(provider_observation)='object' AND octet_length(provider_observation::text)<=1024));
