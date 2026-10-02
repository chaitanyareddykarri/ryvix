-- ADR-023: legacy rows remain unowned until reconciled on the actual Docker host.
ALTER TABLE public.repository_jobs ADD COLUMN worker_host_id text
  CHECK(worker_host_id ~ '^[a-z0-9][a-z0-9-]{0,62}$');
ALTER TABLE public.workspace_sessions ADD COLUMN worker_host_id text
  CHECK(worker_host_id ~ '^[a-z0-9][a-z0-9-]{0,62}$');
CREATE INDEX workspace_sessions_worker_host ON public.workspace_sessions(worker_host_id,status,expires_at);
