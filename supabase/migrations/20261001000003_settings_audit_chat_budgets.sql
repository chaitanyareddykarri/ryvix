CREATE TABLE public.organization_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  actor_id uuid REFERENCES auth.users(id),
  action_name text NOT NULL,
  parameters_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.organization_audit_events(organization_id, created_at DESC);
ALTER TABLE public.organization_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.organization_audit_events TO authenticated;
CREATE POLICY organization_audit_read ON public.organization_audit_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_audit_events.organization_id
  AND m.user_id=auth.uid() AND m.role IN ('owner','admin')));
REVOKE UPDATE, DELETE, TRUNCATE ON public.organization_audit_events FROM service_role;

CREATE TABLE public.chat_request_budgets (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  bucket timestamptz NOT NULL,
  requests integer NOT NULL CHECK(requests > 0),
  PRIMARY KEY(organization_id, subject, bucket)
);
ALTER TABLE public.chat_request_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_request_budgets FROM PUBLIC, anon, authenticated;
