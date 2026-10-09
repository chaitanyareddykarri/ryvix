ALTER TABLE public.repository_jobs ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.repository_jobs ADD COLUMN quota_retries integer NOT NULL DEFAULT 0 CHECK(quota_retries BETWEEN 0 AND 3);
CREATE INDEX repository_jobs_available ON public.repository_jobs(available_at,created_at) WHERE status='queued';
