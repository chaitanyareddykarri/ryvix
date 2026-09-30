BEGIN;
ALTER TABLE public.connectors ADD COLUMN device_public_key TEXT;
CREATE TABLE public.connector_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL UNIQUE REFERENCES public.connectors(id) ON DELETE CASCADE,
  server_id UUID NOT NULL UNIQUE REFERENCES public.servers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.connector_telemetry_receipts (
  connector_id UUID NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
  nonce UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(connector_id, nonce)
);
CREATE INDEX connector_receipts_age ON public.connector_telemetry_receipts(connector_id, received_at);
ALTER TABLE public.connector_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_telemetry_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.connector_enrollments, public.connector_telemetry_receipts FROM PUBLIC, anon, authenticated;
ALTER TABLE public.telemetry_metric_rollups
  ADD COLUMN authenticated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sample_count INTEGER NOT NULL DEFAULT 1 CHECK(sample_count > 0),
  ADD COLUMN last_sample_at TIMESTAMPTZ;
CREATE UNIQUE INDEX telemetry_authenticated_bucket ON public.telemetry_metric_rollups(server_id, bucket_timestamp) WHERE authenticated;
-- Legacy numeric defaults are not measurements. New ingestion writes NULL when absent.
ALTER TABLE public.telemetry_metric_rollups
  ALTER COLUMN iops_read DROP DEFAULT, ALTER COLUMN iops_write DROP DEFAULT,
  ALTER COLUMN net_rx_kb DROP DEFAULT, ALTER COLUMN net_tx_kb DROP DEFAULT;
REVOKE INSERT, UPDATE, DELETE ON public.telemetry_metric_rollups FROM anon, authenticated;
COMMIT;
