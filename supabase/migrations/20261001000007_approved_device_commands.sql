-- ADR-024: append a supported resource type; existing approvals are preserved.
ALTER TABLE public.approval_requests DROP CONSTRAINT approval_requests_resource_type_check;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_resource_type_check
  CHECK(resource_type IN ('plan_step','recovery_plan','deployment','server_command'));
CREATE TABLE public.server_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approval_id uuid NOT NULL UNIQUE REFERENCES public.approval_requests(id),
  action text NOT NULL CHECK(action='restart_service'),
  service text NOT NULL CHECK(service ~ '^[a-zA-Z0-9][a-zA-Z0-9_.@-]{0,119}\.service$'),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','delivered','succeeded','failed','unknown','expired')),
  envelope jsonb,
  delivered_at timestamptz,
  command_expires_at timestamptz,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX server_commands_delivery ON public.server_commands(server_id,status,created_at);
ALTER TABLE public.server_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.server_commands FROM PUBLIC,anon,authenticated;
