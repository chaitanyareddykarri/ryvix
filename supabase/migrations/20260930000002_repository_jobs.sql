-- ADR-011: Secrets never enter job rows.
CREATE TABLE public.repository_jobs (
  task_id uuid PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  worker_id uuid,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX repository_jobs_poll ON public.repository_jobs(status,created_at);
ALTER TABLE public.repository_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repository_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.repository_jobs TO service_role;
