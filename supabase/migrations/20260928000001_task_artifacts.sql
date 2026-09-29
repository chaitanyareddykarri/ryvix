BEGIN;

CREATE TABLE public.task_artifacts (
  task_id UUID PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id),
  base_commit_sha TEXT NOT NULL CHECK (base_commit_sha ~ '^[a-f0-9]{40,64}$'),
  base_branch TEXT NOT NULL,
  files JSONB NOT NULL CHECK (jsonb_typeof(files) = 'array'),
  verification JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(verification) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_artifacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.task_artifacts FROM anon, authenticated;
GRANT SELECT ON public.task_artifacts TO authenticated;
CREATE POLICY task_artifacts_member_read ON public.task_artifacts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
  JOIN public.organization_members m ON m.organization_id = p.organization_id
  WHERE t.id = task_artifacts.task_id AND m.user_id = auth.uid()
));

ALTER TABLE public.pull_requests ADD COLUMN commit_sha TEXT
  CHECK (commit_sha IS NULL OR commit_sha ~ '^[a-f0-9]{40,64}$');
-- Do not discard historical duplicates to force this gate to pass.
CREATE UNIQUE INDEX pull_requests_one_per_task ON public.pull_requests(task_id) WHERE task_id IS NOT NULL;

CREATE POLICY health_checks_member_read ON public.health_checks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.environments e JOIN public.projects p ON p.id=e.project_id
  JOIN public.organization_members m ON m.organization_id=p.organization_id
  WHERE e.id=health_checks.environment_id AND m.user_id=auth.uid()));
CREATE POLICY security_events_member_read ON public.security_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.servers s JOIN public.environments e ON e.id=s.environment_id
  JOIN public.projects p ON p.id=e.project_id
  JOIN public.organization_members m ON m.organization_id=p.organization_id
  WHERE s.id=security_events.server_id AND m.user_id=auth.uid()));

COMMIT;
