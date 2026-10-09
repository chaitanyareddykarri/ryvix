CREATE TABLE public.host_log_entries (
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK(length(source) BETWEEN 1 AND 128),
  severity text NOT NULL CHECK(severity IN ('info','warning','critical')),
  message text NOT NULL CHECK(length(message) BETWEEN 1 AND 4096),
  PRIMARY KEY(server_id,event_id)
);
CREATE INDEX host_logs_time ON public.host_log_entries(observed_at DESC);
ALTER TABLE public.host_log_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.host_log_entries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.host_log_entries TO service_role;
